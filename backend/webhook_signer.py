"""
TrustFed: Institutional Webhook Signature & Replay Protection Engine.
Generates and verifies cryptographic HMAC-SHA256 signatures for inbound/outbound
third-party bank/regulator webhooks with timestamp drift detection.
"""
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional, Tuple


class WebhookSigner:
    """Cryptographic webhook signing and replay verification."""

    def __init__(self, default_secret: str = "tf_webhook_signing_secret_prod_32b"):
        self.secret = default_secret.encode("utf-8")
        self.max_drift_seconds = 300  # 5-minute replay window

    def sign_payload(self, payload: Dict[str, Any], timestamp: Optional[int] = None) -> Tuple[str, int]:
        """Signs a dictionary payload using HMAC-SHA256 with timestamp prepended.
        
        Format: v1,t=<timestamp>,h=<hex_signature>
        """
        ts = timestamp if timestamp is not None else int(time.time())
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        signature_base = f"t={ts}.{serialized}".encode("utf-8")
        signature = hmac.new(self.secret, signature_base, hashlib.sha256).hexdigest()
        header_val = f"t={ts},v1={signature}"
        return header_val, ts

    def verify_signature(
        self,
        raw_body: bytes,
        signature_header: str,
        current_time: Optional[int] = None,
    ) -> Tuple[bool, str]:
        """Verifies an incoming webhook signature against timestamp replay and tampering."""
        if not signature_header:
            return False, "Missing X-TrustFed-Signature header"

        # Parse header: t=1234567890,v1=abcdef...
        parts = {}
        for item in signature_header.split(","):
            if "=" in item:
                k, v = item.strip().split("=", 1)
                parts[k] = v

        timestamp_str = parts.get("t")
        sig_hex = parts.get("v1")

        if not timestamp_str or not sig_hex:
            return False, "Malformed signature header (expected t=... and v1=...)"

        try:
            ts = int(timestamp_str)
        except ValueError:
            return False, "Invalid timestamp in signature header"

        # Check timestamp replay protection
        now = current_time if current_time is not None else int(time.time())
        if abs(now - ts) > self.max_drift_seconds:
            return False, f"Webhook timestamp outside tolerance window ({abs(now - ts)}s > {self.max_drift_seconds}s)"

        # Compute expected HMAC
        try:
            # If body is valid JSON, normalize it to match signer format
            parsed = json.loads(raw_body.decode("utf-8"))
            serialized = json.dumps(parsed, sort_keys=True, separators=(",", ":"))
        except Exception:
            serialized = raw_body.decode("utf-8")

        expected_base = f"t={ts}.{serialized}".encode("utf-8")
        expected_sig = hmac.new(self.secret, expected_base, hashlib.sha256).hexdigest()

        # Constant-time comparison
        if not hmac.compare_digest(sig_hex, expected_sig):
            return False, "Signature verification failed: payload tampered or incorrect secret"

        return True, "Valid"


# Global Singleton Webhook Signer
webhook_signer = WebhookSigner()
