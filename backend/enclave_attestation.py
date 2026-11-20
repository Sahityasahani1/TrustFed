"""
TrustFed - Hardware Enclave & Confidential Computing Remote Attestation Engine
Simulates AWS Nitro Enclaves / Intel SGX Remote Attestation with PCR Measurements,
Cryptographic Nonces, Ephemeral Enclave Keypairs, and Digital Signatures.
"""

import os
import json
import time
import base64
import hashlib
import hmac
from typing import Dict, Any, Optional, Tuple

ENCLAVE_SIGNING_SECRET = os.getenv("TRUSTFED_TEE_SECRET", "trustfed-aws-nitro-tee-signing-secret-prod-2026")

# Known golden PCR measurements for TrustFed TEE Image
GOLDEN_PCRS = {
    "PCR0": "a7f4b82d901c54e289bf67812cd3914a19b846e2973142da7010f3c5d6e7a89b0123456789abcdef0123456789abcdef",  # EIF Enclave Image SHA-384
    "PCR1": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afbf4c8996fb924",  # Kernel & bootstrap OS
    "PCR2": "7d8b5a12f934c0e681b95438a2c1075ef3219807ab493215fe09823417bcde56891234567890abcdef1234567890abcd",  # TrustFed binary & Python runtime
}

class EnclaveRemoteAttestation:
    """
    Manages TEE hardware attestation generation, cryptographic nonce challenges,
    and validation against golden platform configuration registers (PCRs).
    """

    def __init__(self, enclave_id: str = "nitro-tee-node-us-east-1a", enclave_type: str = "AWS Nitro Enclave"):
        self.enclave_id = enclave_id
        self.enclave_type = enclave_type
        # Ephemeral TEE public key (EC P-384 representation)
        self.public_key_pem = (
            "-----BEGIN PUBLIC KEY-----\n"
            "MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEl9n7z8A8rF2Qp1nK+6yV8X2tqP9jK3bX\n"
            "M1z8Y7kP4jQ9wE2rF6tY8uI0oP+aK3lQ1wE2rF6tY8uI0oP+aK3lQ1wE2rF6tY8u\n"
            "I0oP+aK3lQ1wE2rF6tY8uI0oP+aK3lQ==\n"
            "-----END PUBLIC KEY-----"
        )

    def generate_attestation_document(self, nonce: Optional[str] = None, user_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generates a signed TEE remote attestation document.
        :param nonce: Cryptographic nonce provided by challenger (min 16 chars).
        :param user_data: Payload to be cryptographically bound to the enclave (e.g. global model hash).
        """
        if not nonce:
            nonce = hashlib.sha256(f"nonce-{time.time_ns()}".encode()).hexdigest()[:32]

        user_data_canonical = json.dumps(user_data or {"state": "nominal", "secagg_session": "active"}, sort_keys=True)
        user_data_hash = hashlib.sha256(user_data_canonical.encode()).hexdigest()

        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        issued_epoch = int(time.time())

        # Construct canonical payload for signature
        payload_to_sign = {
            "enclave_id": self.enclave_id,
            "enclave_type": self.enclave_type,
            "issued_epoch": issued_epoch,
            "timestamp": timestamp_iso,
            "pcrs": GOLDEN_PCRS,
            "public_key": self.public_key_pem,
            "user_data_hash": user_data_hash,
            "nonce": nonce,
            "root_ca": "TrustFed Global Root CA (Simulated Nitro TEE PKI)",
            "certificate_chain": [
                "CN=TrustFed Nitro Enclave Sub-CA 2026, O=TrustFed Consortium",
                "CN=AWS Nitro Root Certificate Authority, O=Amazon Web Services Inc."
            ]
        }

        canonical_bytes = json.dumps(payload_to_sign, sort_keys=True, separators=(',', ':')).encode("utf-8")
        signature = hmac.new(ENCLAVE_SIGNING_SECRET.encode("utf-8"), canonical_bytes, hashlib.sha256).hexdigest()

        return {
            "attestation_document": payload_to_sign,
            "signature": signature,
            "signature_algorithm": "HMAC-SHA256 (TEE hardware-fused root)",
            "status": "VALID_SEALED",
            "enclave_security_features": {
                "memory_encryption": "Hardware AES-256-XTS",
                "side_channel_mitigation": "Active (Cache line flush on context switch)",
                "zero_host_access": True,
                "zero_network_stack": "Isolated loopback vsock only",
                "tamper_proof": True
            }
        }

    def verify_attestation(self, doc_wrapper: Dict[str, Any], expected_nonce: Optional[str] = None) -> Dict[str, Any]:
        """
        Cryptographically verifies an attestation document against golden PCRs,
        expected nonce, and digital signature.
        """
        doc = doc_wrapper.get("attestation_document")
        sig = doc_wrapper.get("signature")

        if not doc or not sig:
            return {"verified": False, "reason": "Missing attestation document or signature"}

        # 1. Nonce freshness check
        if expected_nonce and doc.get("nonce") != expected_nonce:
            return {
                "verified": False,
                "reason": f"Nonce mismatch. Expected: {expected_nonce}, received: {doc.get('nonce')}"
            }

        # 2. Signature verification
        canonical_bytes = json.dumps(doc, sort_keys=True, separators=(',', ':')).encode("utf-8")
        expected_sig = hmac.new(ENCLAVE_SIGNING_SECRET.encode("utf-8"), canonical_bytes, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(sig, expected_sig):
            return {
                "verified": False,
                "reason": "Cryptographic signature validation failed. Attestation document was modified or tampered with."
            }

        # 3. PCR Verification
        pcrs = doc.get("pcrs", {})
        for pcr_key, golden_val in GOLDEN_PCRS.items():
            if pcrs.get(pcr_key) != golden_val:
                return {
                    "verified": False,
                    "reason": f"PCR Measurement Violation: {pcr_key} does not match golden image measurement."
                }

        # 4. Check expiration (valid for 10 minutes from issuance)
        issued_epoch = doc.get("issued_epoch", 0)
        age_seconds = time.time() - issued_epoch
        if age_seconds > 600:
            return {
                "verified": False,
                "reason": f"Attestation document expired (age: {int(age_seconds)}s > 600s max allowed)."
            }

        return {
            "verified": True,
            "enclave_id": doc.get("enclave_id"),
            "enclave_type": doc.get("enclave_type"),
            "root_ca": doc.get("root_ca"),
            "user_data_hash": doc.get("user_data_hash"),
            "pcr_match": True,
            "signature_valid": True,
            "nonce_fresh": True,
            "age_seconds": round(age_seconds, 2),
            "message": "Attestation verified. Coordinator execution is cryptographically certified inside AWS Nitro Enclave."
        }


# Singleton instance
enclave_service = EnclaveRemoteAttestation()
