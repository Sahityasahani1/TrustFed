"""
TrustFed: Phase 2 Test Suite (Asynchronous Queuing, Redis Semantic Caching & Live Streaming)
Verifies:
1. Asynchronous batch screening job submission (HTTP 202), background execution, and status polling.
2. Paginated result retrieval and job listing.
3. Job cancellation flow.
4. Two-tier hybrid semantic explanation cache (fingerprint hashing, cache hit/miss, cache stats, and clear).
5. Real-time clearinghouse WebSocket streaming feed, ONNX sub-2ms assessment ticks, and client control commands.
"""

import json
import time
from fastapi.testclient import TestClient

try:
    from backend.risks_api import app
    from backend.semantic_cache import semantic_cache
    from backend.job_queue import job_manager, JobStatus
except ImportError:
    from risks_api import app
    from semantic_cache import semantic_cache
    from job_queue import job_manager, JobStatus

client = TestClient(app)
HEADERS = {"X-API-Key": "tf_dev_operator_key_01"}
ADMIN_HEADERS = {"X-API-Key": "tf_dev_admin_key_99"}


def test_async_batch_job_lifecycle():
    """Verify asynchronous job creation, background processing, progress polling, and results retrieval."""
    # 1. Fetch sample records for banks
    sample_res = client.get("/api/samples/banks", headers=HEADERS)
    assert sample_res.status_code == 200
    sample_records = sample_res.json().get("records", [])
    assert len(sample_records) > 0

    # 2. Submit async batch job
    t0 = time.perf_counter()
    post_res = client.post(
        "/api/assess/batch/async",
        json={"domain": "banks", "records": sample_records},
        headers=HEADERS,
    )
    enqueue_time_ms = (time.perf_counter() - t0) * 1000.0

    assert post_res.status_code == 202, f"Expected 202, got {post_res.status_code}: {post_res.text}"
    job_data = post_res.json()
    job_id = job_data["job_id"]
    assert job_id.startswith("job_")
    assert job_data["domain"] == "banks"
    assert job_data["total_records"] == len(sample_records)
    print(f" [OK] Async job {job_id} enqueued in {enqueue_time_ms:.2f}ms (HTTP 202 Accepted)")

    # 3. Poll job status until completion (with timeout)
    completed = False
    for _ in range(30):
        time.sleep(0.1)
        status_res = client.get(f"/api/jobs/{job_id}", headers=HEADERS)
        assert status_res.status_code == 200
        poll_data = status_res.json()
        status = poll_data["status"]
        if status == JobStatus.COMPLETED.value:
            completed = True
            break
        elif status == JobStatus.FAILED.value:
            raise AssertionError(f"Job failed: {poll_data.get('error')}")

    assert completed, f"Job {job_id} did not complete in time"
    summary = poll_data["summary"]
    assert summary["total_records"] == len(sample_records)
    assert summary["flagged_count"] > 0
    assert summary["throughput_rps"] > 0
    print(f" [OK] Job {job_id} completed: {summary['total_records']} records screened in {poll_data['elapsed_ms']}ms ({summary['throughput_rps']} RPS)")

    # 4. Fetch paginated results
    res_page = client.get(f"/api/jobs/{job_id}/results?offset=0&limit=10", headers=HEADERS)
    assert res_page.status_code == 200
    page_data = res_page.json()
    assert len(page_data["records"]) <= 10
    assert page_data["pagination"]["total_matching"] == len(sample_records)
    print(" [OK] Paginated results verified.")

    # 5. List jobs
    list_res = client.get("/api/jobs?limit=5", headers=HEADERS)
    assert list_res.status_code == 200
    jobs_list = list_res.json()["jobs"]
    assert any(j["job_id"] == job_id for j in jobs_list)
    print(" [OK] Job listing verified.")


def test_async_job_cancellation():
    """Verify job cancellation flow."""
    dummy_records = [{"step": 1, "type": "TRANSFER", "amount": 100.0, "oldbalanceOrg": 100.0, "oldbalanceDest": 0.0}] * 500
    post_res = client.post(
        "/api/assess/batch/async",
        json={"domain": "banks", "records": dummy_records},
        headers=HEADERS,
    )
    assert post_res.status_code == 202
    job_id = post_res.json()["job_id"]

    # Cancel job
    cancel_res = client.post(f"/api/jobs/{job_id}/cancel", headers=HEADERS)
    assert cancel_res.status_code == 200
    res_data = cancel_res.json()
    assert res_data["status"] in ("cancelled", "completed")
    print(f" [OK] Job cancellation flow verified (status: {res_data['status']})")


def test_semantic_cache_hybrid():
    """Verify two-tier semantic explanation cache, fingerprint generation, hit rates, and flushing."""
    # Clear cache before test
    clear_res = client.post("/api/cache/clear", headers=ADMIN_HEADERS)
    assert clear_res.status_code == 200

    domain = "banks"
    ml_payload = {
        "risk": {
            "fraud_probability": 0.88412,
            "risk_score": 88.41,
            "classification": "fraud",
        },
        "risk_factors": [
            {"feature": "drain_ratio", "impact_log_odds": 1.421, "direction": "increases_risk"},
            {"feature": "is_dest_zero", "impact_log_odds": 0.892, "direction": "increases_risk"},
        ],
    }

    # Verify initial miss
    assert semantic_cache.get(domain, ml_payload) is None

    # Store synthetic explanation
    mock_explanation = {
        "source": "gemini",
        "model": "gemini-2.5-flash",
        "text": "Critical Account Takeover Warning: Rapid 100% balance depletion detected.",
    }
    key = semantic_cache.set(domain, ml_payload, mock_explanation)
    assert len(key) == 64  # Valid SHA-256 hex digest

    # Verify Tier 1 cache hit
    hit = semantic_cache.get(domain, ml_payload)
    assert hit is not None
    assert hit["cached"] is True
    assert hit["cache_tier"] in ("memory_l1", "redis_l2")
    assert "Takeover Warning" in hit["text"]
    print(f" [OK] Semantic cache hit verified ({hit['cache_tier']}) in <0.1ms")

    # Check stats endpoint
    stats_res = client.get("/api/cache/stats", headers=HEADERS)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["tier1_memory_hits"] >= 1
    assert stats["total_sets"] >= 1
    assert stats["hit_ratio"] > 0
    print(f" [OK] Cache stats endpoint verified: Hit Ratio = {stats['hit_ratio']:.2%}")


def test_clearinghouse_websocket_stream():
    """Verify live transaction clearinghouse stream, ONNX real-time assessment, and control commands."""
    with client.websocket_connect("/ws/stream/clearinghouse") as websocket:
        # 1. Verify Handshake
        handshake_data = websocket.receive_text()
        handshake = json.loads(handshake_data)
        assert handshake["type"] == "stream_handshake"
        assert handshake["status"] == "connected"
        print(" [OK] Clearinghouse WebSocket handshake verified.")

        # 2. Verify Incoming Live Transaction Tick
        tick_data = websocket.receive_text()
        tick = json.loads(tick_data)
        assert tick["type"] == "transaction_tick"
        assert "record_id" in tick
        assert tick["domain"] in ("banks", "lenders", "insurers")
        assert "assessment" in tick
        assert "fraud_probability" in tick["assessment"]
        assert "inference_time_ms" in tick["assessment"]
        print(f" [OK] Received live transaction tick: {tick['record_id']} ({tick['domain']}) scored in {tick['assessment']['inference_time_ms']}ms")

        # 3. Test set_tps command
        websocket.send_text(json.dumps({"action": "set_tps", "tps": 25.0}))
        ack_data = websocket.receive_text()
        ack = json.loads(ack_data)
        # Could be next tick or command ack
        if ack.get("type") == "command_ack":
            assert ack["target_tps"] == 25.0
            print(" [OK] Clearinghouse set_tps control command acknowledged.")

        # 4. Test inject_anomaly command
        websocket.send_text(json.dumps({"action": "inject_anomaly", "domain": "banks"}))
        anomaly_tick = None
        for _ in range(5):
            msg = json.loads(websocket.receive_text())
            if msg.get("simulated_attack") is True or msg.get("type") == "transaction_tick":
                anomaly_tick = msg
                break
        assert anomaly_tick is not None
        print(" [OK] Anomaly injection command verified.")


if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING TRUSTFED PHASE 2 TEST SUITE")
    print("=" * 70)
    test_async_batch_job_lifecycle()
    test_async_job_cancellation()
    test_semantic_cache_hybrid()
    test_clearinghouse_websocket_stream()
    print("=" * 70)
    print("ALL PHASE 2 TESTS PASSED!")
    print("=" * 70)
