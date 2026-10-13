"""
Test suite for TrustFed Phase 5: Persistence, State Concurrency & PII Sanitization.
Verifies:
1. PII detection and redaction (SSNs, cards, phones, emails, passwords).
2. Concurrency safety of SecAggCoordinator under multi-threaded load.
3. Crash-resilient atomic persistence of SecAgg state across coordinator re-instantiation.
4. Administrative action audit log persistence with sanitized details.
"""
import concurrent.futures
import json
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from pii_sanitizer import mask_email, mask_ssn, mask_card_number, sanitize_payload
from secagg_engine import SecAggCoordinator, secagg_coordinator, STATE_FILE
from auth import log_admin_action, admin_audit_log, AUDIT_LOG_FILE

def test_pii_sanitization():
    """Verify recursive PII redaction and pattern masking."""
    dirty_payload = {
        "user_email": "compliance.officer@tier1bank.com",
        "phone": "+1 (555) 234-5678",
        "ssn": "000-12-3456",
        "card_number": "4111-2222-3333-4444",
        "password": "SuperSecretPassword123!",
        "customer_name": "Jane Doe",
        "nested_details": {
            "tax_id": "99-8877665",
            "account_number": "9876543210",
            "notes": "Customer SSN is 123-45-6789 and email is john.smith@fintech.io"
        }
    }

    clean = sanitize_payload(dirty_payload)

    # 1. Email masked
    assert "@tier1bank.com" in clean["user_email"]
    assert "compliance" not in clean["user_email"]

    # 2. Phone masked
    assert clean["phone"].startswith("***-***-")

    # 3. SSN masked
    assert clean["ssn"] == "***-**-3456"

    # 4. Card masked
    assert clean["card_number"] == "****-****-****-4444"

    # 5. Password redacted
    assert clean["password"] == "[REDACTED]"

    # 6. Customer name redacted
    assert clean["customer_name"] == "[REDACTED_NAME]"

    # 7. Nested patterns in text notes masked
    notes = clean["nested_details"]["notes"]
    assert "123-45-6789" not in notes
    assert "***-**-6789" in notes
    assert "john.smith" not in notes
    print(" [OK] PII masking and recursive redaction verified.")

def test_concurrent_secagg_rounds():
    """Verify thread-safety of SecAggCoordinator under concurrent execution."""
    secagg_coordinator.reset()
    assert secagg_coordinator.round_number == 1
    assert len(secagg_coordinator.historical_ledger) == 0

    num_threads = 6

    def run_worker(thread_id):
        return secagg_coordinator.execute_round(dp_epsilon=0.01, clipping_bound=1.0)

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(run_worker, i) for i in range(num_threads)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    # State assertions
    assert len(results) == num_threads
    assert secagg_coordinator.round_number == num_threads + 1
    assert len(secagg_coordinator.historical_ledger) == num_threads

    # Ensure all round IDs in ledger are unique (no race condition collision)
    round_ids = [c["round_id"] for c in secagg_coordinator.historical_ledger]
    assert len(set(round_ids)) == num_threads, f"Collision detected in round IDs: {round_ids}"
    print(f" [OK] Concurrency locking verified across {num_threads} parallel consensus rounds.")

def test_atomic_state_persistence():
    """Verify coordinator state persists to disk and can be restored upon restart."""
    assert STATE_FILE.is_file(), f"State file {STATE_FILE} not found"

    # Read current state
    current_round = secagg_coordinator.round_number
    current_ledger_count = len(secagg_coordinator.historical_ledger)
    current_dp_spent = secagg_coordinator.cumulative_dp_epsilon_spent

    # Instantiate a brand new coordinator instance simulating server restart
    restored_coordinator = SecAggCoordinator()

    assert restored_coordinator.round_number == current_round
    assert len(restored_coordinator.historical_ledger) == current_ledger_count
    assert abs(restored_coordinator.cumulative_dp_epsilon_spent - current_dp_spent) < 1e-5
    print(" [OK] Crash-resilient SecAgg state persistence and restoration verified.")

def test_admin_audit_log_pii_and_persistence():
    """Verify admin audit logs are sanitized of PII and persisted to disk."""
    initial_count = len(admin_audit_log)

    # Log action containing raw sensitive info
    log_admin_action(
        actor="admin_user",
        role="admin",
        action="TEST_ADMIN_ACTION",
        details={
            "api_key": "tf_dev_secret_key_to_mask",
            "user_email": "sensitive_admin@bank.corp",
            "round_id": 99
        },
        client_ip="127.0.0.1"
    )

    assert len(admin_audit_log) == initial_count + 1
    latest = admin_audit_log[-1]
    assert latest["action"] == "TEST_ADMIN_ACTION"
    # Verify PII details were sanitized before logging
    assert latest["details"]["api_key"] == "[REDACTED]"
    assert "sensitive_admin" not in latest["details"]["user_email"]

    # Verify disk persistence
    assert AUDIT_LOG_FILE.is_file()
    with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
        persisted_logs = json.load(f)
    assert len(persisted_logs) == len(admin_audit_log)
    print(" [OK] Admin audit log persistence & PII sanitization verified.")

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(" RUNNING TRUSTFED PHASE 5 PERSISTENCE & CONCURRENCY TESTS")
    print("=" * 60)
    test_pii_sanitization()
    test_concurrent_secagg_rounds()
    test_atomic_state_persistence()
    test_admin_audit_log_pii_and_persistence()
    print("=" * 60)
    print(" ALL PHASE 5 TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")
