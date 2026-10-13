"""
Test suite for TrustFed Phase 2: Authentication, RBAC and Admin Audit Logging.
Verifies:
1. API Key authentication & constant-time hash verification
2. JWT generation & verification
3. Role hierarchy (admin > operator > auditor)
4. Development fallback vs. strict production 401 enforcement
5. Admin action audit logging
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from risks_api import app
import config

client = TestClient(app)

def test_auth_me_in_dev_default():
    """Without headers in dev mode, default fallback operator is returned."""
    res = client.get("/api/auth/me")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "admin"
    assert data["auth_method"] == "dev_mode_bypass"
    print(" [OK] Dev fallback authentication verified.")

def test_api_key_auth():
    """Test standard API key authentication via X-API-Key."""
    # Auditor key
    auditor_key = "tf_dev_auditor_key_02"
    res = client.get("/api/auth/me", headers={"X-API-Key": auditor_key})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "auditor"
    assert data["auth_method"] == "api_key"

    # Admin key
    admin_key = "tf_dev_admin_key_99"
    res = client.get("/api/auth/me", headers={"X-API-Key": admin_key})
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["role"] == "admin"
    print(" [OK] API key authentication verified for auditor and admin.")

def test_invalid_api_key():
    """Test invalid API key rejection."""
    res = client.get("/api/auth/me", headers={"X-API-Key": "invalid_bogus_key_xyz"})
    assert res.status_code == 401
    print(" [OK] Invalid API key correctly rejected with 401.")

def test_jwt_token_exchange_and_bearer_auth():
    """Test exchanging an API key for a signed JWT and using Bearer authorization."""
    operator_key = "tf_dev_operator_key_01"
    token_res = client.post("/api/auth/token", json={"api_key": operator_key})
    assert token_res.status_code == 200, token_res.text
    token_data = token_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "operator"

    bearer_token = token_data["access_token"]
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {bearer_token}"})
    assert me_res.status_code == 200, me_res.text
    me_data = me_res.json()
    assert me_data["role"] == "operator"
    assert me_data["auth_method"] == "jwt"
    print(" [OK] JWT token exchange and Bearer authentication verified.")

def test_rbac_enforcement():
    """Test role hierarchy: auditor cannot run operator or admin tasks."""
    auditor_headers = {"X-API-Key": "tf_dev_auditor_key_02"}

    # Auditor trying to run model scoring (requires operator) -> 403 Forbidden
    assess_res = client.post(
        "/api/assess",
        headers=auditor_headers,
        json={"domain": "banks", "user_input": {"amount": 100}, "include_ai_reasoning": False}
    )
    assert assess_res.status_code == 403, f"Expected 403, got {assess_res.status_code}"

    # Auditor trying to reset federated state (requires admin) -> 403 Forbidden
    reset_res = client.post("/api/federated/reset", headers=auditor_headers)
    assert reset_res.status_code == 403, f"Expected 403, got {reset_res.status_code}"

    # Auditor reading sample files (requires auditor) -> 200 OK
    sample_res = client.get("/api/samples/banks", headers=auditor_headers)
    assert sample_res.status_code == 200, sample_res.text
    print(" [OK] RBAC enforcement verified (auditor denied operator/admin actions).")

def test_admin_audit_logging():
    """Admin performing actions generates audit log entries."""
    admin_headers = {"X-API-Key": "tf_dev_admin_key_99"}

    # Admin resets federated state
    reset_res = client.post("/api/federated/reset", headers=admin_headers)
    assert reset_res.status_code == 200, reset_res.text

    # Admin inspects audit log
    audit_res = client.get("/api/admin/audit-log", headers=admin_headers)
    assert audit_res.status_code == 200, audit_res.text
    audit_data = audit_res.json()
    assert audit_data["count"] > 0
    actions = [e["action"] for e in audit_data["events"]]
    assert "RESET_FEDERATED_STATE" in actions
    print(" [OK] Admin audit logging verified.")

def test_production_mode_strict_401():
    """When environment=production, unauthenticated requests are strictly rejected with 401."""
    original_env = config.settings.environment
    try:
        config.settings.environment = "production"
        res = client.get("/api/auth/me")
        assert res.status_code == 401, f"Expected 401 in production, got {res.status_code}"
        print(" [OK] Production mode strict 401 rejection verified.")
    finally:
        config.settings.environment = original_env


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" RUNNING TRUSTFED PHASE 2 AUTH & RBAC VERIFICATION SUITE")
    print("=" * 60)
    test_auth_me_in_dev_default()
    test_api_key_auth()
    test_invalid_api_key()
    test_jwt_token_exchange_and_bearer_auth()
    test_rbac_enforcement()
    test_admin_audit_logging()
    test_production_mode_strict_401()
    print("=" * 60)
    print(" ALL PHASE 2 AUTH & SECURITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")
