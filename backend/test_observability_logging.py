"""
Test suite for TrustFed Phase 6: Logging, Observability & Structured Error Handling.
Verifies:
1. X-Request-ID tracing middleware on all endpoints.
2. Deep health check diagnostic metrics (/health).
3. Uniform error responses across 404, 422, and 500 codes.
4. Absence of raw stack traces leaking in error responses (CWE-209).
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from risks_api import app

client = TestClient(app)

def test_request_id_tracing():
    """Verify X-Request-ID is generated and preserved across requests."""
    # 1. Automatic generation
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert "x-request-id" in res1.headers
    gen_id = res1.headers["x-request-id"]
    assert len(gen_id) >= 12

    # 2. Custom header preservation
    custom_id = "trace-corp-secagg-998811"
    res2 = client.get("/health", headers={"X-Request-ID": custom_id})
    assert res2.status_code == 200
    assert res2.headers.get("x-request-id") == custom_id
    print(" [OK] Request tracing (X-Request-ID) middleware verified.")

def test_deep_health_endpoint():
    """Verify deep diagnostic telemetry on /health."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "ok"
    assert "environment" in data
    assert "models" in data
    assert "banks" in data["models"]
    assert "onnx_engine" in data
    assert "circuit_breaker" in data
    assert "federated" in data
    assert "current_round" in data["federated"]
    assert "system" in data
    assert "uptime_seconds" in data["system"]
    assert "memory_rss_mb" in data["system"]
    print(" [OK] Deep health and diagnostic observability (/health) verified.")

def test_uniform_error_handling_404():
    """Verify uniform error structure on 404 Not Found."""
    res = client.get("/nonexistent-endpoint-xyz")
    assert res.status_code == 404
    data = res.json()

    assert "detail" in data
    assert data["status_code"] == 404
    assert "request_id" in data
    assert "path" in data
    assert "timestamp" in data
    print(" [OK] Uniform 404 error response verified.")

def test_uniform_error_handling_422():
    """Verify uniform error structure on 422 Unprocessable Entity."""
    res = client.post("/api/assess", json={"domain": "invalid_domain", "user_input": {}})
    assert res.status_code == 422
    data = res.json()

    assert "detail" in data
    assert data["status_code"] == 422
    assert "request_id" in data
    assert "path" in data
    print(" [OK] Uniform 422 validation error response verified.")

def test_no_stack_trace_leakage_on_internal_error():
    """Verify 500 error responses do not leak raw Python tracebacks."""
    # Temporarily add a test route that raises an unhandled exception
    @app.get("/api/test-deliberate-500-internal-exception")
    def trigger_crash():
        raise ZeroDivisionError("Deliberate internal test exception for stack trace audit")

    safe_client = TestClient(app, raise_server_exceptions=False)
    res = safe_client.get("/api/test-deliberate-500-internal-exception")
    assert res.status_code == 500
    data = res.json()


    assert "request_id" in data
    assert data["status_code"] == 500
    assert "Traceback (most recent call last)" not in res.text
    assert "File \"" not in res.text
    print(" [OK] Internal 500 error handling verified (zero stack trace leakage).")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" RUNNING TRUSTFED PHASE 6 OBSERVABILITY & ERROR HANDLING TESTS")
    print("=" * 60)
    test_request_id_tracing()
    test_deep_health_endpoint()
    test_uniform_error_handling_404()
    test_uniform_error_handling_422()
    test_no_stack_trace_leakage_on_internal_error()
    print("=" * 60)
    print(" ALL PHASE 6 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")
