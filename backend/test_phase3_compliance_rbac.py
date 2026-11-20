"""Phase 3 Test Suite: Regulatory Compliance Exporters & Enterprise RBAC Governance.

Validates:
1. FCRA / ECOA Adverse Action Notice generation and reason code mapping.
2. NIST SP 1270 AI Explainability Certificate generation, sealing, and tamper verification.
3. Senior Investigator override workflow, reason codes, and audit ledger persistence.
4. Multi-party governance report compilation.
"""

import copy
import pytest
from fastapi.testclient import TestClient

from risks_api import app
from auth import key_registry


@pytest.fixture
def client():
    return TestClient(app)


def test_fcra_adverse_action_notice_generation(client):
    """Test generating a formal FCRA / ECOA Regulation B Adverse Action Notice."""
    headers = {"X-API-Key": "tf_dev_operator_key_01"}

    # 1. Banks Domain (PaySim) Account Drain
    banks_payload = {
        "domain": "banks",
        "record_id": "TX-PAYSIM-TEST-9001",
        "user_input": {
            "step": 142,
            "type": "TRANSFER",
            "amount": 14850.0,
            "oldbalanceOrg": 15200.0,
            "oldbalanceDest": 0.0,
        },
        "applicant_name": "Jane Doe",
        "institution_name": "First Commercial Bank of TrustFed",
    }
    res = client.post("/api/compliance/fcra-notice", json=banks_payload, headers=headers)
    assert res.status_code == 200, res.text
    notice = res.json()

    assert notice["document_type"] == "FCRA_ECOA_ADVERSE_ACTION_NOTICE"
    assert "notice_id" in notice
    assert notice["applicant"]["name"] == "Jane Doe"
    assert len(notice["principal_reasons"]) >= 1
    assert "legal_statutory_disclosure" in notice
    assert "EQUAL CREDIT OPPORTUNITY ACT" in notice["legal_statutory_disclosure"]
    assert "hmac_seal" in notice
    assert len(notice["hmac_seal"]) == 64  # SHA-256 hex string

    # 2. Lenders Domain (Home Credit Loan Application)
    lenders_payload = {
        "domain": "lenders",
        "record_id": "LOAN-HC-TEST-4421",
        "user_input": {
            "amt_income_total": 28000.0,
            "amt_credit": 450000.0,
            "amt_annuity": 36000.0,
            "ext_source_2": 0.12,
            "ext_source_3": 0.15,
            "name_contract_type": "Cash loans",
        },
        "applicant_name": "John Smith",
    }
    res_lenders = client.post("/api/compliance/fcra-notice", json=lenders_payload, headers=headers)
    assert res_lenders.status_code == 200, res_lenders.text
    lenders_notice = res_lenders.json()
    assert lenders_notice["applicant"]["name"] == "John Smith"
    assert len(lenders_notice["principal_reasons"]) >= 1
    # Check that reasons have category and code
    for r in lenders_notice["principal_reasons"]:
        assert "reason_code" in r
        assert "principal_reason" in r


def test_nist_sp1270_certificate_generation_and_tamper_verification(client):
    """Test issuing a formal NIST SP 1270 AI certificate and cryptographic verification."""
    headers = {"X-API-Key": "tf_dev_operator_key_01"}

    cert_req = {
        "domain": "banks",
        "record_id": "TX-PAYSIM-NIST-001",
        "user_input": {
            "step": 200,
            "type": "CASH_OUT",
            "amount": 250000.0,
            "oldbalanceOrg": 250000.0,
            "oldbalanceDest": 0.0,
        },
    }
    res = client.post("/api/compliance/nist-certificate", json=cert_req, headers=headers)
    assert res.status_code == 200, res.text
    cert = res.json()

    assert "certificate_id" in cert
    assert "NIST SP 1270" in cert["standard"]
    assert cert["model_provenance"]["privacy_guarantee"]["epsilon"] == 2.45
    assert cert["fairness_and_bias_audit"]["disparate_impact_certified"] is True
    assert "cryptographic_seal" in cert
    assert cert["cryptographic_seal"]["algorithm"] == "HMAC-SHA256"

    # Verify signature
    verify_res = client.post("/api/compliance/certificate/verify", json={"certificate": cert})
    assert verify_res.status_code == 200, verify_res.text
    verify_data = verify_res.json()
    assert verify_data["valid"] is True
    assert verify_data["tamper_evident_check"] == "PASSED"

    # Test Tamper Evidence: alter the certificate and check that verification FAILS
    tampered_cert = copy.deepcopy(cert)
    tampered_cert["model_provenance"]["privacy_guarantee"]["epsilon"] = 0.01  # Forged claim
    tamper_res = client.post("/api/compliance/certificate/verify", json={"certificate": tampered_cert})
    assert tamper_res.status_code == 200
    assert tamper_res.json()["valid"] is False
    assert tamper_res.json()["tamper_evident_check"] == "FAILED"


def test_senior_investigator_override_workflow(client):
    """Test recording an authorized human-in-the-loop override with audit ledger stamp."""
    headers = {"X-API-Key": "tf_dev_operator_key_01"}

    override_req = {
        "domain": "banks",
        "record_id": "TX-FLAGGED-54321",
        "original_classification": "fraud",
        "override_classification": "safe",
        "reason_code": "OVR-01",
        "justification_notes": "Contacted client via registered phone with MFA; verified legitimate high-value supplier payment.",
    }
    res = client.post("/api/governance/override", json=override_req, headers=headers)
    assert res.status_code == 200, res.text
    override = res.json()

    assert "override_id" in override
    assert override["record_id"] == "TX-FLAGGED-54321"
    assert override["decision"]["original_classification"] == "fraud"
    assert override["decision"]["override_classification"] == "safe"
    assert override["decision"]["is_false_positive_flag"] is True
    assert override["regulatory_justification"]["reason_code"] == "OVR-01"

    # Query overrides list
    list_res = client.get("/api/governance/overrides?domain=banks", headers=headers)
    assert list_res.status_code == 200
    records = list_res.json()["overrides"]
    assert any(o["override_id"] == override["override_id"] for o in records)


def test_governance_compliance_report(client):
    """Test retrieving institutional governance compliance packet."""
    headers = {"X-API-Key": "tf_dev_operator_key_01"}
    res = client.get("/api/governance/compliance-report", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    assert "governance_summary" in data
    assert "federated_state" in data
    assert len(data["governance_summary"]["available_reason_codes"]) >= 5
