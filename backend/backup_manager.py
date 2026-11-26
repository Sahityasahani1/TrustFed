"""
TrustFed: Automated State Backup & Point-in-Time Recovery (PITR) Engine.
Enables atomic snapshotting of ledger states, cryptographic checksum verification,
and simulated restore drills.
"""
import hashlib
import json
import shutil
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BACKEND_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"
BACKUPS_DIR = BACKEND_DIR / "backups"


class BackupManager:
    """Manages automated state snapshots, checksum verifications, and restore drills."""

    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR, backups_dir: Path = BACKUPS_DIR):
        self.artifacts_dir = artifacts_dir
        self.backups_dir = backups_dir
        self.backups_dir.mkdir(parents=True, exist_ok=True)

    def _compute_checksum(self, file_path: Path) -> str:
        """Computes SHA-256 checksum of a file."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def create_snapshot(self, backup_label: Optional[str] = None) -> Dict[str, Any]:
        """Creates an atomic timestamped snapshot of all state ledgers."""
        ts = int(time.time())
        tag = backup_label or f"snapshot_{ts}"
        snapshot_dir = self.backups_dir / tag
        snapshot_dir.mkdir(parents=True, exist_ok=True)

        manifest: Dict[str, Any] = {
            "backup_id": tag,
            "timestamp": ts,
            "created_at_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts)),
            "files": {},
            "total_files": 0,
            "total_bytes": 0,
        }

        # Backup all JSON state ledgers in artifacts
        for file_path in self.artifacts_dir.glob("*.json"):
            dest_file = snapshot_dir / file_path.name
            shutil.copy2(file_path, dest_file)
            chk = self._compute_checksum(dest_file)
            size = dest_file.stat().st_size
            manifest["files"][file_path.name] = {
                "checksum_sha256": chk,
                "size_bytes": size,
            }
            manifest["total_files"] += 1
            manifest["total_bytes"] += size

        # Write manifest file into backup directory
        manifest_path = snapshot_dir / "backup_manifest.json"
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        return manifest

    def verify_snapshot(self, backup_id: str) -> Tuple[bool, str, Dict[str, Any]]:
        """Verifies integrity of a snapshot by recalculating SHA-256 checksums."""
        snapshot_dir = self.backups_dir / backup_id
        manifest_path = snapshot_dir / "backup_manifest.json"

        if not manifest_path.exists():
            return False, f"Manifest not found for backup {backup_id}", {}

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        for filename, meta in manifest.get("files", {}).items():
            target_file = snapshot_dir / filename
            if not target_file.exists():
                return False, f"Missing file in backup: {filename}", manifest

            current_chk = self._compute_checksum(target_file)
            if current_chk != meta["checksum_sha256"]:
                return False, f"Checksum mismatch in {filename}: expected {meta['checksum_sha256']}, got {current_chk}", manifest

        return True, "Backup verified clean and intact", manifest

    def run_restore_drill(self, backup_id: str, drill_target_dir: Optional[Path] = None) -> Dict[str, Any]:
        """Executes a non-destructive restore drill into a staging directory and measures recovery time."""
        t0 = time.perf_counter()
        snapshot_dir = self.backups_dir / backup_id

        is_valid, msg, manifest = self.verify_snapshot(backup_id)
        if not is_valid:
            raise ValueError(f"Restore drill failed integrity check: {msg}")

        target_dir = drill_target_dir or (self.backups_dir / f"drill_restore_{int(time.time())}")
        target_dir.mkdir(parents=True, exist_ok=True)

        restored_files = []
        for filename in manifest.get("files", {}):
            src = snapshot_dir / filename
            dst = target_dir / filename
            shutil.copy2(src, dst)
            restored_files.append(filename)

        recovery_time_ms = round((time.perf_counter() - t0) * 1000, 2)

        # Cleanup drill directory if temporary
        if drill_target_dir is None:
            shutil.rmtree(target_dir, ignore_errors=True)

        return {
            "status": "SUCCESS",
            "backup_id": backup_id,
            "restored_files_count": len(restored_files),
            "restored_files": restored_files,
            "recovery_time_ms": recovery_time_ms,
            "integrity_verified": True,
            "rto_sla_met": recovery_time_ms < 5000.0,  # Recovery Time Objective SLA < 5 seconds
        }

    def list_backups(self) -> List[Dict[str, Any]]:
        """Lists all existing backups with metadata."""
        backups = []
        for manifest_file in self.backups_dir.glob("*/backup_manifest.json"):
            try:
                with open(manifest_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    backups.append(data)
            except Exception:
                pass
        return sorted(backups, key=lambda x: x.get("timestamp", 0), reverse=True)


# Global Singleton Backup Manager
backup_manager = BackupManager()
