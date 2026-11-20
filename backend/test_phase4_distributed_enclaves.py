"""
Test Phase 4: Production Distributed Federated Framework & Hardware Enclaves (TEE).
Verifies:
1. AWS Nitro Enclave remote attestation generation, cryptographic signature validation,
   PCR measurement integrity, and nonce freshness checks.
2. Continuous Rényi Differential Privacy (RDP) moments accountant tracking,
   numerical privacy composition, and automatic circuit breaker cutoff at epsilon >= 5.0.
3. Cross-silo institutional federated worker node registration and heartbeats.
4. TEE-based Secure Aggregation (SecAgg) round execution with zero raw weight leakage.
5. Consolidated cryptographic federated audit packet generation.
"""

import copy
import pytest
from fastapi.testclient import TestClient

from backend.risks_api import app
from backend.rdp_accountant import rdp_accountant, PrivacyBudgetExhaustedError

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_accountant():
    """Ensure clean RDP accountant ledger before and after each test."""
    rdp_accountant.reset_accountant()
    yield
    rdp_accountant.reset_accountant()


def test_enclave_attestation_generation_and_verification():
    """Tests issuance and cryptographic verification of AWS Nitro TEE remote attestation."""
    nonce = "c74829fa01bd93847291a0b948c201e3"
    
    # 1. Fetch attestation document from enclave
    resp = client.get(f"/api/federated/enclave/attestation?nonce={nonce}")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert data["status"] == "VALID_SEALED"
    assert "signature" in data
    doc = data["attestation_document"]
    assert doc["nonce"] == nonce
    assert "PCR0" in doc["pcrs"]
    assert "PCR1" in doc["pcrs"]
    assert "PCR2" in doc["pcrs"]
    assert "public_key" in doc

    # 2. Verify valid attestation
    verify_resp = client.post(
        "/api/federated/enclave/verify",
        json={"attestation_wrapper": data, "expected_nonce": nonce}
    )
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["verified"] is True
    assert verify_data["pcr_match"] is True
    assert verify_data["signature_valid"] is True

    # 3. Tamper with PCR measurement -> verify fails
    tampered_pcr = copy.deepcopy(data)
    tampered_pcr["attestation_document"]["pcrs"]["PCR0"] = "0000000000000000000000000000000000000000"
    tampered_resp = client.post(
        "/api/federated/enclave/verify",
        json={"attestation_wrapper": tampered_pcr, "expected_nonce": nonce}
    )
    assert tampered_resp.status_code == 200
    assert tampered_resp.json()["verified"] is False
    assert "signature" in tampered_resp.json()["reason"] or "PCR" in tampered_resp.json()["reason"]

    # 4. Tamper with signature -> verify fails
    tampered_sig = copy.deepcopy(data)
    tampered_sig["signature"] = "deadbeef" * 8
    sig_resp = client.post(
        "/api/federated/enclave/verify",
        json={"attestation_wrapper": tampered_sig, "expected_nonce": nonce}
    )
    assert sig_resp.status_code == 200
    assert sig_resp.json()["verified"] is False
    assert "signature" in sig_resp.json()["reason"]

    # 5. Nonce mismatch -> verify fails
    mismatch_resp = client.post(
        "/api/federated/enclave/verify",
        json={"attestation_wrapper": data, "expected_nonce": "different-fresh-nonce-1234"}
    )
    assert mismatch_resp.status_code == 200
    assert mismatch_resp.json()["verified"] is False
    assert "Nonce mismatch" in mismatch_resp.json()["reason"]


def test_rdp_moments_accountant_and_circuit_breaker():
    """Tests continuous Rényi DP moments accountant and automatic training halt when budget exhausted."""
    # Check initial state
    resp = client.get("/api/federated/privacy/accountant")
    assert resp.status_code == 200
    acc = resp.json()
    assert acc["total_rounds"] == 0
    assert acc["current_epsilon"] == 0.0
    assert acc["remaining_budget"] == 5.0
    assert acc["circuit_breaker_active"] is False

    # Simulate multiple federated training rounds
    for i in range(1, 4):
        exec_resp = client.post("/api/federated/round/execute", json={"round_id": i})
        assert exec_resp.status_code == 200
        result = exec_resp.json()
        assert result["status"] == "COMPLETED_IN_TEE"
        eps = result["differential_privacy"]["round_epsilon"]
        assert eps > 0

    acc_after = client.get("/api/federated/privacy/accountant").json()
    assert acc_after["total_rounds"] == 3
    assert acc_after["current_epsilon"] > 0
    assert acc_after["remaining_budget"] < 5.0

    # Exhaust privacy budget by manually setting high rounds or executing until circuit breaker
    # Directly record rounds until exhaustion
    breaker_triggered = False
    for i in range(4, 30):
        try:
            rdp_accountant.record_federated_round(round_id=i, noise_multiplier=0.8, subsample_ratio=0.5)
        except PrivacyBudgetExhaustedError:
            breaker_triggered = True
            break

    assert breaker_triggered is True

    # Now an API call should fail with 429 Too Many Requests
    halted_resp = client.post("/api/federated/round/execute", json={"round_id": 99})
    assert halted_resp.status_code == 429
    assert "Differential Privacy Circuit Breaker" in halted_resp.json()["detail"]


def test_federated_node_registration_and_topology():
    """Tests cross-silo institutional node discovery, registration, and health telemetry."""
    # 1. List existing nodes (default 3 institutional silos)
    resp = client.get("/api/federated/nodes")
    assert resp.status_code == 200
    nodes = resp.json()["nodes"]
    assert len(nodes) >= 3
    node_ids = [n["node_id"] for n in nodes]
    assert "node-bank-alpha" in node_ids
    assert "node-lender-beta" in node_ids
    assert "node-insurer-gamma" in node_ids

    # 2. Register a new institution
    new_node = {
        "node_id": "node-fintech-delta",
        "institution_name": "Revolut Global Payments (Node EU-West-1)",
        "domain": "banks",
        "endpoint_url": "https://node-delta.banks.trustfed.internal:8443",
        "local_samples": 85000,
        "region": "eu-west-1",
        "tls_fingerprint": "SHA256:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:00"
    }
    reg_resp = client.post("/api/federated/nodes/register", json=new_node)
    assert reg_resp.status_code == 200
    assert reg_resp.json()["ok"] is True
    assert reg_resp.json()["node"]["node_id"] == "node-fintech-delta"

    # 3. Confirm new node appears in topology
    nodes_after = client.get("/api/federated/nodes").json()["nodes"]
    after_ids = [n["node_id"] for n in nodes_after]
    assert "node-fintech-delta" in after_ids


def test_distributed_secagg_round_execution_in_tee():
    """Tests execution of complete federated round inside AWS Nitro TEE with SecAgg zero-sum masking."""
    req = {
        "round_id": 10,
        "noise_multiplier": 1.8,
        "dimension": 8,
        "l2_clip_norm": 1.0
    }
    resp = client.post("/api/federated/round/execute", json=req)
    assert resp.status_code == 200, resp.text
    result = resp.json()

    assert result["status"] == "COMPLETED_IN_TEE"
    assert result["round_id"] == 10

    # TEE Execution guarantees
    tee = result["enclave_execution"]
    assert "AWS Nitro Enclave" in tee["tee_environment"]
    assert tee["pcr0_verified"] is True
    assert tee["zero_raw_weights_exposed"] is True
    assert tee["secagg_sum_of_masks"] == 0.0

    # Differential privacy guarantees
    dp = result["differential_privacy"]
    assert dp["mechanism"] == "Subsampled Gaussian Moment Accountant"
    assert dp["target_delta"] == 1e-5
    assert dp["round_epsilon"] > 0
    assert dp["remaining_budget"] > 0

    # Consensus metrics
    consensus = result["consensus_metrics"]
    assert consensus["participating_nodes"] >= 3
    assert consensus["total_samples_represented"] > 100000
    assert len(consensus["global_model_hash"]) == 64

    # Node audit submissions
    subs = result["node_audit_submissions"]
    assert len(subs) >= 3
    for s in subs:
        assert "submission_digest" in s
        assert "sample_weight" in s

    # Hardware attestation
    att = result["hardware_attestation"]
    assert att["status"] == "VALID_SEALED"
    assert "signature" in att


def test_federated_audit_packet():
    """Tests cryptographic audit packet retrieval combining TEE, RDP, and institutional nodes."""
    resp = client.get("/api/federated/audit-packet")
    assert resp.status_code == 200
    data = resp.json()

    assert "enclave_attestation" in data
    assert "privacy_accountant" in data
    assert "institutional_nodes" in data
    assert "compliance_guarantees" in data
    assert data["compliance_guarantees"]["zero_raw_data_transmission"] is True
    assert "AWS Nitro" in data["compliance_guarantees"]["tee_isolation"]
