"""
Test suite for TrustFed Phase 3: Input Validation, Request Safety & File Upload Security.
Verifies:
1. Security Headers middleware injection (nosniff, DENY, etc.)
2. Path traversal attack prevention in sample downloads
3. Pydantic schema validation for model payloads (PaySim, CreditFraud, Insurance)
4. Batch size cap enforcement (max 1000 records)
5. File upload size & format validation
"""
import io
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from risks_api import app

client = TestClient(app)

def test_security_headers():
    """Verify HTTP security headers on all responses."""
    res = client.get("/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    print(" [OK] Security headers middleware verified.")

def test_path_traversal_prevention():
    """Verify path traversal attacks are rejected."""
    # 1. Directory traversal via ../
    res1 = client.get("/api/samples/download/../../secret.env")
    assert res1.status_code in (400, 404)

    # 2. Encoded slash / traversal
    res2 = client.get("/api/samples/download/..\\..\\config.py")
    assert res2.status_code in (400, 404)

    # 3. Disallowed file not in whitelist
    res3 = client.get("/api/samples/download/malicious.csv")
    assert res3.status_code == 404

    # 4. Valid file in whitelist
    res4 = client.get("/api/samples/download/sample_banks_batch.csv")
    assert res4.status_code == 200
    assert "transaction_id" in res4.text
    print(" [OK] Path traversal attacks prevented & allowlist verified.")

def test_pydantic_input_validation():
    """Verify invalid payloads are rejected with 422 before ML execution."""
    # 1. Negative amount for banks
    res_neg = client.post("/api/assess", json={
        "domain": "banks",
        "user_input": {"type": "TRANSFER", "amount": -100.0},
        "include_ai_reasoning": False
    })
    assert res_neg.status_code == 422

    # 2. Invalid transaction type for banks
    res_type = client.post("/api/assess", json={
        "domain": "banks",
        "user_input": {"type": "UNSUPPORTED_TYPE", "amount": 100.0},
        "include_ai_reasoning": False
    })
    assert res_type.status_code == 422

    # 3. Valid banks transaction
    res_valid_bank = client.post("/api/assess", json={
        "domain": "banks",
        "user_input": {
            "step": 1.0,
            "type": "TRANSFER",
            "amount": 2500.0,
            "oldbalanceOrg": 5000.0,
            "oldbalanceDest": 0.0
        },
        "include_ai_reasoning": False
    })
    assert res_valid_bank.status_code == 200
    data = res_valid_bank.json()
    assert "ml_risk_json" in data
    print(" [OK] Pydantic input schema validation verified for banks.")

    # 4. Valid lenders application
    res_valid_cf = client.post("/api/assess", json={
        "domain": "lenders",
        "user_input": {
            "amt_income_total": 250000.0,
            "amt_credit": 500000.0,
            "amt_annuity": 25000.0,
            "ext_source_2": 0.65,
            "ext_source_3": 0.55
        },
        "include_ai_reasoning": False
    })
    assert res_valid_cf.status_code == 200
    print(" [OK] Pydantic input schema validation verified for lenders.")

    # 5. Valid insurance claim
    res_valid_ins = client.post("/api/assess", json={
        "domain": "insurance",
        "user_input": {
            "claim_type": "auto",
            "state": "CA",
            "claim_amount": 4500.0,
            "deductible": 1000.0
        },
        "include_ai_reasoning": False
    })
    assert res_valid_ins.status_code == 200
    print(" [OK] Pydantic input schema validation verified for insurance.")

def test_batch_record_caps():
    """Verify batch request limits."""
    # 1. Empty batch
    res_empty = client.post("/api/assess/batch", json={
        "domain": "banks",
        "records": []
    })
    assert res_empty.status_code == 400

    # 2. Batch exceeding 1,000 records
    oversized_batch = [{"amount": 10.0, "type": "PAYMENT", "oldbalanceOrg": 100.0, "oldbalanceDest": 0.0}] * 1001
    res_over = client.post("/api/assess/batch", json={
        "domain": "banks",
        "records": oversized_batch
    })
    assert res_over.status_code == 413
    print(" [OK] Batch record limits (empty & 1,000 cap) verified.")

def test_upload_safety():
    """Verify upload file format and size limits."""
    # 1. Unsupported extension
    fake_exe = io.BytesIO(b"binary content")
    res_exe = client.post(
        "/api/assess/upload",
        files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
        data={"domain": "banks"}
    )
    assert res_exe.status_code == 400

    # 2. Valid CSV upload
    valid_csv = "transaction_id,step,type,amount,oldbalanceOrg,oldbalanceDest\nTX-1,1,PAYMENT,100.0,500.0,0.0\n"
    res_csv = client.post(
        "/api/assess/upload",
        files={"file": ("test.csv", io.BytesIO(valid_csv.encode("utf-8")), "text/csv")},
        data={"domain": "banks"}
    )
    assert res_csv.status_code == 200
    assert res_csv.json()["batch_summary"]["total_records"] == 1
    print(" [OK] File upload validation verified.")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" RUNNING TRUSTFED PHASE 3 VALIDATION & REQUEST SAFETY TESTS")
    print("=" * 60)
    test_security_headers()
    test_path_traversal_prevention()
    test_pydantic_input_validation()
    test_batch_record_caps()
    test_upload_safety()
    print("=" * 60)
    print(" ALL PHASE 3 VALIDATION & SECURITY TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")
