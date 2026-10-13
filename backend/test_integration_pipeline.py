"""End-to-End Integration Test Suite for TrustFed Financial Fraud Intelligence Platform.

Tests all mission-critical flows:
1. Authentication & Bearer token exchange
2. Single transaction inference assessment
3. Batch screening pipeline
4. SecAgg+ federated consensus round execution
5. RBAC enforcement on administrative ledgers & action audit logging
6. Container orchestration health probes (/health/live, /health/ready)
"""
import pytest
from fastapi.testclient import TestClient
from backend.risks_api import app

client = TestClient(app)

ADMIN_KEY = "tf_dev_admin_key_99"
OPERATOR_KEY = "tf_dev_operator_key_01"
AUDITOR_KEY = "tf_dev_auditor_key_02"


def test_e2e_authentication_flow():
    """Verify end-to-end token exchange and caller identity verification."""
    # 1. Exchange operator API key for JWT Bearer token
    res_token = client.post(
        "/api/auth/token",
        json={"api_key": OPERATOR_KEY, "expires_minutes": 30}
    )
    assert res_token.status_code == 200
    token_data = res_token.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["role"] == "operator"
    bearer_token = token_data["access_token"]

    # 2. Authenticate using Bearer token
    res_me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {bearer_token}"}
    )
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["role"] == "operator"
    assert me_data["auth_method"] == "jwt"
    assert "identity" in me_data


def test_e2e_single_assessment_flow():
    """Verify single transaction scoring pipeline with Bearer authentication."""
    # Obtain operator token
    token = client.post("/api/auth/token", json={"api_key": OPERATOR_KEY}).json()["access_token"]

    payload = {
        "domain": "banks",
        "user_input": {
            "type": "TRANSFER",
            "amount": 250000.0,
            "oldbalanceOrg": 250000.0,
            "newbalanceOrig": 0.0,
            "oldbalanceDest": 10000.0,
            "newbalanceDest": 260000.0,
        },
        "include_ai_reasoning": False
    }

    res = client.post(
        "/api/assess",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "ml_risk_json" in data
    risk_info = data["ml_risk_json"]["risk"]
    assert "risk_score" in risk_info
    assert 0.0 <= risk_info["risk_score"] <= 100.0
    assert "classification" in risk_info
    assert "fraud_probability" in risk_info
    # Verify request tracing header is returned
    assert "X-Request-ID" in res.headers


def test_e2e_batch_inference_flow():
    """Verify batch CSV inference pipeline with header checks and timing telemetry."""
    token = client.post("/api/auth/token", json={"api_key": OPERATOR_KEY}).json()["access_token"]

    sample_records = [
        {
            "step": 1,
            "type": "TRANSFER",
            "amount": 180000.0,
            "nameOrig": "C12345",
            "oldbalanceOrg": 180000.0,
            "newbalanceOrig": 0.0,
            "nameDest": "M67890",
            "oldbalanceDest": 0.0,
            "newbalanceDest": 0.0
        },
        {
            "step": 1,
            "type": "PAYMENT",
            "amount": 150.0,
            "nameOrig": "C12346",
            "oldbalanceOrg": 500.0,
            "newbalanceOrig": 350.0,
            "nameDest": "M67891",
            "oldbalanceDest": 0.0,
            "newbalanceDest": 0.0
        }
    ]

    res = client.post(
        "/api/assess/batch",
        json={"domain": "banks", "records": sample_records},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    summary = data["batch_summary"]
    assert summary["total_records"] == 2
    assert len(data["records"]) == 2
    assert "processing_time_ms" in summary


def test_e2e_federated_consensus_and_audit_trail():
    """Verify multi-party SecAgg round execution and immutable ledger record."""
    operator_token = client.post("/api/auth/token", json={"api_key": OPERATOR_KEY}).json()["access_token"]
    admin_token = client.post("/api/auth/token", json={"api_key": ADMIN_KEY}).json()["access_token"]

    # 1. Trigger SecAgg round as operator
    res_round = client.post(
        "/api/federated/round/run",
        json={"dp_epsilon": 0.045, "clipping_bound": 1.0},
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert res_round.status_code == 200
    round_data = res_round.json()
    assert round_data["ok"] is True
    assert "certificate" in round_data
    cert = round_data["certificate"]
    assert "proof_hash" in cert
    assert "silos" in cert["consensus_quorum"]

    # 2. Check federated audit trail
    res_trail = client.get(
        "/api/federated/audit-trail",
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert res_trail.status_code == 200
    trail_data = res_trail.json()
    assert trail_data["count"] >= 1

    # 3. Verify operator cannot view administrative audit logs (RBAC enforcement)
    res_admin_forbidden = client.get(
        "/api/admin/audit-log",
        headers={"Authorization": f"Bearer {operator_token}"}
    )
    assert res_admin_forbidden.status_code == 403

    # 4. Verify admin CAN view administrative audit logs
    res_admin_ok = client.get(
        "/api/admin/audit-log",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_admin_ok.status_code == 200
    audit_data = res_admin_ok.json()
    assert audit_data["count"] >= 1
    # Check that RUN_SECAGG_ROUND action was recorded
    actions = [e["action"] for e in audit_data["events"]]
    assert "RUN_SECAGG_ROUND" in actions


def test_e2e_health_probes():
    """Verify live and ready health probes for container orchestration."""
    # Liveness probe
    r_live = client.get("/health/live")
    assert r_live.status_code == 200
    assert r_live.json()["status"] == "alive"

    # Readiness probe
    r_ready = client.get("/health/ready")
    assert r_ready.status_code == 200
    ready_body = r_ready.json()
    assert ready_body["status"] == "ready"
    assert ready_body["checks"]["models_loaded"] is True
    assert ready_body["checks"]["storage_writable"] is True
    assert ready_body["checks"]["secagg_initialized"] is True
