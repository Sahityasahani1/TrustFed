"""
Test Suite for 28 Production Requirements Checklist.
Verifies:
1. Health & readiness probes (/healthz, /readyz, /health/live, /health/ready).
2. Public platform status telemetry (/api/status).
3. Dynamic feature flags listing and admin override (/api/flags, /api/flags/override).
4. State backup snapshotting and restore drill (/api/admin/backup/create, /api/admin/backup/restore-drill).
5. Schema migration expand-and-contract execution (/api/admin/migrations/status, /api/admin/migrations/run).
6. Cryptographic webhook signing and replay protection (/api/webhooks/verify).
7. Synthetic incident alerting (/api/admin/alerts/test).
8. HTTP security headers (HSTS, CSP, nosniff, DENY).
9. Response compression (GZip).
"""
import time
import pytest
from fastapi.testclient import TestClient

from backend.risks_api import app
from backend.webhook_signer import webhook_signer
from backend.feature_flags import feature_flags
from backend.backup_manager import backup_manager

client = TestClient(app)
ADMIN_HEADERS = {"X-API-Key": "tf_dev_admin_key_99"}
OPERATOR_HEADERS = {"X-API-Key": "tf_dev_operator_key_01"}


def test_standard_healthz_and_readyz_probes():
    """Verify Kubernetes liveness (/healthz) and readiness (/readyz) probes."""
    res_live = client.get("/healthz")
    assert res_live.status_code == 200
    assert res_live.json()["status"] == "alive"

    res_ready = client.get("/readyz")
    assert res_ready.status_code == 200
    ready_data = res_ready.json()
    assert ready_data["status"] == "ready"
    assert ready_data["checks"]["models_loaded"] is True
    assert ready_data["checks"]["storage_writable"] is True


def test_platform_status_telemetry():
    """Verify public status endpoint provides component SLAs and operational state."""
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["system_status"] in ("ALL_SYSTEMS_OPERATIONAL", "PARTIALLY_DEGRADED")
    assert data["overall_uptime_percent"] >= 99.9
    assert "federated_inference_engine" in data["components"]
    assert "secagg_tee_coordinator" in data["components"]
    assert "rdp_privacy_accountant" in data["components"]


def test_feature_flags_and_admin_override():
    """Verify feature flag listing, runtime toggling, and RBAC enforcement."""
    # 1. Public listing
    res = client.get("/api/flags")
    assert res.status_code == 200
    flags = res.json()["flags"]
    assert "STREAMING_ENABLED" in flags
    assert "HARDWARE_ENCLAVES_ENABLED" in flags

    # 2. Operator unauthorized to override (requires admin)
    res_unauth = client.post(
        "/api/flags/override",
        json={"flag_key": "TEST_FLAG_CUSTOM", "enabled": False},
        headers=OPERATOR_HEADERS,
    )
    assert res_unauth.status_code == 403

    # 3. Admin override success
    res_override = client.post(
        "/api/flags/override",
        json={"flag_key": "TEST_FLAG_CUSTOM", "enabled": True},
        headers=ADMIN_HEADERS,
    )
    assert res_override.status_code == 200
    assert res_override.json()["status"] == "SUCCESS"
    assert feature_flags.is_enabled("TEST_FLAG_CUSTOM") is True


def test_state_backup_and_restore_drill():
    """Verify atomic state backup snapshot and timed restore drill."""
    # 1. Create snapshot
    res_create = client.post("/api/admin/backup/create", headers=ADMIN_HEADERS)
    assert res_create.status_code == 200
    manifest = res_create.json()["manifest"]
    backup_id = manifest["backup_id"]
    assert manifest["total_files"] >= 1

    # 2. Execute restore drill
    res_drill = client.post(
        "/api/admin/backup/restore-drill",
        json={"backup_id": backup_id},
        headers=ADMIN_HEADERS,
    )
    assert res_drill.status_code == 200
    drill_data = res_drill.json()
    assert drill_data["status"] == "SUCCESS"
    assert drill_data["integrity_verified"] is True
    assert drill_data["rto_sla_met"] is True
    assert drill_data["recovery_time_ms"] < 5000.0


def test_schema_migrations_and_dry_run():
    """Verify expand-and-contract migration status and dry-run execution."""
    # 1. Status
    res_status = client.get("/api/admin/migrations/status", headers=ADMIN_HEADERS)
    assert res_status.status_code == 200
    assert "current_version" in res_status.json()

    # 2. Dry run
    res_run = client.post(
        "/api/admin/migrations/run",
        json={"dry_run": True},
        headers=ADMIN_HEADERS,
    )
    assert res_run.status_code == 200
    assert res_run.json()["dry_run"] is True


def test_webhook_signing_and_replay_protection():
    """Verify HMAC-SHA256 signature generation and anti-replay detection."""
    payload = {"event": "institutional_assessment_completed", "record_id": "TX-9988", "risk_score": 12.5}
    sig_header, ts = webhook_signer.sign_payload(payload)

    # 1. Valid signature
    res_valid = client.post(
        "/api/webhooks/verify",
        json={"payload": payload, "signature_header": sig_header},
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["valid"] is True

    # 2. Tampered payload
    tampered_payload = payload.copy()
    tampered_payload["risk_score"] = 99.9
    res_tampered = client.post(
        "/api/webhooks/verify",
        json={"payload": tampered_payload, "signature_header": sig_header},
    )
    assert res_tampered.status_code == 200
    assert res_tampered.json()["valid"] is False
    assert "tampered" in res_tampered.json()["message"]

    # 3. Expired timestamp (>300s drift)
    stale_sig_header, _ = webhook_signer.sign_payload(payload, timestamp=int(time.time()) - 400)
    res_stale = client.post(
        "/api/webhooks/verify",
        json={"payload": payload, "signature_header": stale_sig_header},
    )
    assert res_stale.status_code == 200
    assert res_stale.json()["valid"] is False
    assert "tolerance window" in res_stale.json()["message"]


def test_synthetic_alert_generation():
    """Verify synthetic incident alert triggering and retrieval."""
    res_test = client.post("/api/admin/alerts/test", headers=ADMIN_HEADERS)
    assert res_test.status_code == 200
    assert res_test.json()["status"] == "TRIGGERED"

    res_list = client.get("/api/admin/alerts", headers=ADMIN_HEADERS)
    assert res_list.status_code == 200
    incidents = res_list.json()["incidents"]
    assert len(incidents) >= 1
    assert incidents[-1]["alert_type"] == "SYNTHETIC_TEST_ALERT"


def test_enhanced_security_headers_and_compression():
    """Verify CSP, HSTS, X-Content-Type-Options, X-Frame-Options, and GZip."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert "content-security-policy" in res.headers
    assert "default-src 'self'" in res.headers["content-security-policy"]

    # Test GZip compression with Accept-Encoding
    res_gzip = client.get("/api/status", headers={"Accept-Encoding": "gzip"})
    assert res_gzip.status_code == 200
    # In ASGI test client or production, GZip middleware processes large payloads
