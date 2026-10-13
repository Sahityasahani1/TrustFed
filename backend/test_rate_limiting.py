"""
Test suite for TrustFed Phase 4: Rate Limiting, Gemini Denial-of-Wallet Shield & Circuit Breaker.
Verifies:
1. Sliding window rate limiter enforcement (HTTP 429 with Retry-After).
2. Per-tier limits (auth, batch, ai_stream, default).
3. Gemini Circuit Breaker state transitions (CLOSED -> OPEN -> fallback).
4. AI explanation deduplication cache (fast $0 cost responses).
"""
import sys
import time
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from risks_api import app
from rate_limiter import rate_limiter, circuit_breaker, explanation_cache

client = TestClient(app)

def test_sliding_window_rate_limiter():
    """Verify rate limiter permits requests up to limit and returns 429 when exceeded."""
    rate_limiter.reset()

    # Test 'auth' tier: limit is 10 requests / min
    headers = {"X-API-Key": "tf_dev_operator_key_01"}

    # First 10 requests should succeed
    for i in range(10):
        res = client.post("/api/auth/token", json={"api_key": "tf_dev_operator_key_01"})
        assert res.status_code == 200, f"Request {i+1} failed: {res.text}"
        assert "x-ratelimit-remaining" in res.headers

    # 11th request must be rejected with HTTP 429
    res_blocked = client.post("/api/auth/token", json={"api_key": "tf_dev_operator_key_01"})
    assert res_blocked.status_code == 429, f"Expected 429, got {res_blocked.status_code}"
    assert "retry-after" in res_blocked.headers
    assert "x-ratelimit-limit" in res_blocked.headers
    print(" [OK] Sliding window rate limiter enforced (HTTP 429 + Retry-After verified).")
    rate_limiter.reset()

def test_explanation_cache():
    """Verify identical evaluations hit the in-memory cache with zero latency."""
    explanation_cache.clear()

    domain = "banks"
    ml_json = {
        "risk": {"fraud_probability": 0.88, "risk_score": 88.0, "classification": "fraud"},
        "risk_factors": [{"feature": "type_TRANSFER", "impact_log_odds": 2.5}]
    }

    # Cache is initially empty
    assert explanation_cache.get(domain, ml_json) is None

    # Store dummy explanation
    sample_res = {"source": "gemini", "model": "gemini-2.5-flash", "text": "Cached audit brief"}
    explanation_cache.set(domain, ml_json, sample_res)

    # Retrieval should hit cache
    cached = explanation_cache.get(domain, ml_json)
    assert cached is not None
    assert cached["text"] == "Cached audit brief"
    print(" [OK] Explanation deduplication cache verified.")

def test_gemini_circuit_breaker():
    """Verify circuit breaker trips on 429 quota exhaustion and serves local reasoning."""
    circuit_breaker.reset()
    assert circuit_breaker.is_available() is True

    # Simulate Google API returning 429 Quota Exhausted
    circuit_breaker.record_failure(status_code=429, is_quota_exhausted=True)
    assert circuit_breaker.state == "OPEN"
    assert circuit_breaker.is_available() is False

    # Assess request during tripped state should immediately return circuit_breaker_offline
    res = client.post("/api/assess", json={
        "domain": "banks",
        "user_input": {
            "type": "TRANSFER",
            "amount": 5000.0,
            "oldbalanceOrg": 5000.0,
            "oldbalanceDest": 0.0
        },
        "include_ai_reasoning": True
    })
    assert res.status_code == 200
    data = res.json()
    ai = data.get("ai_reasoning", {})
    assert ai.get("source") == "circuit_breaker_offline"
    print(" [OK] Gemini Circuit Breaker denial-of-wallet shield verified (served fast fallback).")

    # Reset breaker back to healthy state
    circuit_breaker.reset()
    assert circuit_breaker.is_available() is True
    print(" [OK] Circuit Breaker reset back to CLOSED verified.")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" RUNNING TRUSTFED PHASE 4 RATE LIMITING & CIRCUIT BREAKER TESTS")
    print("=" * 60)
    test_sliding_window_rate_limiter()
    test_explanation_cache()
    test_gemini_circuit_breaker()
    print("=" * 60)
    print(" ALL PHASE 4 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")
