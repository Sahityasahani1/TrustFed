"""
TrustFed: Asynchronous Task Queue & Batch Job Manager (Phase 2).
Enables non-blocking high-volume bulk screening with progress tracking,
chunked vectorized execution, pagination, and persistent status polling.
"""

import asyncio
import concurrent.futures
import enum
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from config import settings
except ImportError:
    from backend.config import settings

logger = logging.getLogger("trustfed.jobqueue")


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BatchJob:
    """Represents a discrete asynchronous screening task."""

    def __init__(self, job_id: str, domain: str, total_records: int, caller_identity: str = "operator"):
        self.job_id = job_id
        self.domain = domain
        self.status = JobStatus.QUEUED
        self.total_records = total_records
        self.processed_records = 0
        self.progress_pct = 0.0
        self.caller_identity = caller_identity
        
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.started_at: Optional[str] = None
        self.completed_at: Optional[str] = None
        self.elapsed_ms: float = 0.0
        
        self.summary: Optional[Dict[str, Any]] = None
        self.records: List[Dict[str, Any]] = []
        self.error: Optional[str] = None

    def to_dict(self, include_results: bool = False) -> Dict[str, Any]:
        """Serializes job state into JSON-friendly dictionary."""
        data = {
            "job_id": self.job_id,
            "domain": self.domain,
            "status": self.status.value,
            "total_records": self.total_records,
            "processed_records": self.processed_records,
            "progress_pct": round(self.progress_pct, 1),
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "elapsed_ms": round(self.elapsed_ms, 2),
            "caller_identity": self.caller_identity,
            "error": self.error,
            "summary": self.summary,
        }
        if include_results:
            data["records"] = self.records
        return data


class AsyncJobManager:
    """
    Central background job scheduler and worker coordinator.
    Processes chunked vectorized inference jobs asynchronously without blocking HTTP threads.
    """

    def __init__(self, max_concurrent_workers: int = 4):
        self._jobs: Dict[str, BatchJob] = {}
        self._executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=max_concurrent_workers,
            thread_name_prefix="tf-worker"
        )
        self._lock = asyncio.Lock() if hasattr(asyncio, "Lock") else None

    def create_job(
        self,
        domain: str,
        records: List[Dict[str, Any]],
        caller_identity: str = "operator",
        batch_chunk_size: int = 500,
    ) -> BatchJob:
        """
        Creates, enqueues, and begins background processing of a batch screening task.
        """
        if len(records) > settings.job_max_records:
            raise ValueError(
                f"Batch exceeds maximum allowed asynchronous limit of {settings.job_max_records} records."
            )

        job_id = f"job_{uuid.uuid4().hex[:12]}"
        job = BatchJob(
            job_id=job_id,
            domain=domain,
            total_records=len(records),
            caller_identity=caller_identity,
        )
        self._jobs[job_id] = job

        # Dispatch execution to background threadpool
        self._executor.submit(self._run_job_worker, job_id, domain, records, batch_chunk_size)
        logger.info(f"Enqueued async job {job_id} ({len(records)} records for {domain})")
        return job

    def _run_job_worker(
        self,
        job_id: str,
        domain: str,
        records: List[Dict[str, Any]],
        chunk_size: int = 500,
    ):
        """Worker thread executing chunked vectorized scoring and aggregation."""
        job = self._jobs.get(job_id)
        if not job or job.status == JobStatus.CANCELLED:
            return

        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc).isoformat()
        t0 = time.perf_counter()

        try:
            # Lazy import to avoid circular dependency
            from risks_api import run_batch_ml

            total = len(records)
            all_scored_records: List[Dict[str, Any]] = []
            flagged_total = 0
            scores_all: List[float] = []

            # Process in vectorized chunks to update progress
            for start_idx in range(0, total, chunk_size):
                if job.status == JobStatus.CANCELLED:
                    logger.info(f"Job {job_id} was cancelled during execution.")
                    return

                chunk = records[start_idx : start_idx + chunk_size]
                chunk_result = run_batch_ml(domain, chunk)
                chunk_summary = chunk_result.get("batch_summary", {})
                chunk_records = chunk_result.get("records", [])

                # Adjust row indices to be absolute
                for rec in chunk_records:
                    rec["row_index"] = start_idx + rec.get("row_index", 0)
                    scores_all.append(rec.get("risk_score", 0.0))

                all_scored_records.extend(chunk_records)
                flagged_total += chunk_summary.get("flagged_count", 0)

                job.processed_records = len(all_scored_records)
                job.progress_pct = (job.processed_records / max(total, 1)) * 100.0

            # Compute aggregated overall summary
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            import numpy as np

            job.summary = {
                "total_records": total,
                "flagged_count": flagged_total,
                "cleared_count": total - flagged_total,
                "fraud_rate": round(flagged_total / max(total, 1), 4),
                "mean_risk_score": round(float(np.mean(scores_all)), 2) if scores_all else 0.0,
                "p95_risk_score": round(float(np.percentile(scores_all, 95)), 2) if scores_all else 0.0,
                "processing_time_ms": round(elapsed_ms, 2),
                "throughput_rps": round(total / max(elapsed_ms / 1000.0, 0.001), 1),
            }
            job.records = all_scored_records
            job.elapsed_ms = elapsed_ms
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.progress_pct = 100.0
            job.status = JobStatus.COMPLETED

            logger.info(
                f"Job {job_id} completed successfully: {total} records screened in {elapsed_ms:.1f}ms "
                f"({job.summary['throughput_rps']} RPS)"
            )

        except Exception as exc:
            logger.exception(f"Job {job_id} failed: {exc}")
            job.status = JobStatus.FAILED
            job.error = str(exc)
            job.completed_at = datetime.now(timezone.utc).isoformat()
            job.elapsed_ms = (time.perf_counter() - t0) * 1000.0

    def get_job(self, job_id: str) -> Optional[BatchJob]:
        """Returns job by id or None."""
        return self._jobs.get(job_id)

    def get_job_results(
        self,
        job_id: str,
        offset: int = 0,
        limit: int = 100,
        flagged_only: bool = False,
    ) -> Dict[str, Any]:
        """Returns paginated results for a completed job."""
        job = self.get_job(job_id)
        if not job:
            raise KeyError(f"Job not found: {job_id}")

        results = job.records
        if flagged_only:
            results = [r for r in results if r.get("classification") == "fraud"]

        total_matching = len(results)
        sliced = results[offset : offset + limit]

        return {
            "job_id": job.job_id,
            "domain": job.domain,
            "status": job.status.value,
            "summary": job.summary,
            "pagination": {
                "offset": offset,
                "limit": limit,
                "total_matching": total_matching,
                "has_more": (offset + limit) < total_matching,
            },
            "records": sliced,
        }

    def list_jobs(self, domain: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """Lists recent jobs with their current status."""
        jobs = list(self._jobs.values())
        if domain:
            jobs = [j for j in jobs if j.domain.lower() == domain.lower()]

        # Sort newest first
        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return [j.to_dict(include_results=False) for j in jobs[:limit]]

    def cancel_job(self, job_id: str) -> bool:
        """Marks an active or queued job as cancelled."""
        job = self.get_job(job_id)
        if not job:
            return False
        if job.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
            job.status = JobStatus.CANCELLED
            job.completed_at = datetime.now(timezone.utc).isoformat()
            return True
        return False


# Global Singleton Job Queue Manager
job_manager = AsyncJobManager(max_concurrent_workers=settings.job_worker_concurrency)
