"""
TrustFed: Central Authentication, Role-Based Access Control (RBAC) & Audit Layer.
Supports:
- Cryptographic API Key Verification (X-API-Key)
- Signed JWT Bearer Tokens (Authorization: Bearer <token>)
- Roles: 'admin', 'operator', 'auditor'
- Constant-time secret comparison (secrets.compare_digest)
- Administrative action audit logging
- Graceful development demo session fallback with strict production enforcement
"""

import hashlib
import json
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import jwt
from fastapi import Depends, Header, HTTPException, Query, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer

try:
    from config import settings
except ImportError:
    from backend.config import settings

import os
import tempfile
from pathlib import Path

try:
    from pii_sanitizer import sanitize_payload
except ImportError:
    from backend.pii_sanitizer import sanitize_payload

logger = logging.getLogger("trustfed.auth")
AUTH_ROOT = Path(__file__).resolve().parent
AUDIT_LOG_FILE = AUTH_ROOT / "artifacts" / "admin_audit_log.json"


# FastAPI security extractors
api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

# Role definitions & hierarchy
ROLES = {
    "admin": ["admin", "operator", "auditor"],
    "operator": ["operator", "auditor"],
    "auditor": ["auditor"],
}


class AuthIdentity:
    """Represents an authenticated caller context."""

    def __init__(self, identity: str, role: str, auth_method: str, client_ip: str = "unknown"):
        self.identity = identity
        self.role = role
        self.auth_method = auth_method
        self.client_ip = client_ip

    def has_role(self, required_role: str) -> bool:
        """Checks if caller's role satisfies the required role or superior."""
        return required_role in ROLES.get(self.role, [])

    def to_dict(self) -> dict:
        return {
            "identity": self.identity,
            "role": self.role,
            "auth_method": self.auth_method,
            "client_ip": self.client_ip,
        }


class APIKeyRegistry:
    """In-memory API key store with SHA-256 hashed keys and constant-time lookup."""

    def __init__(self):
        # Format: {sha256_hash: {"name": str, "role": str, "is_active": bool}}
        self._keys: Dict[str, Dict[str, Any]] = {}
        self._seed_default_keys()

    def _hash_key(self, raw_key: str) -> str:
        return hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()

    def _seed_default_keys(self):
        """Seeds default keys in development or parses production keys from environment."""
        # 1. Dev keys (active when NOT in production)
        if not settings.is_production:
            self.register_key("tf_dev_admin_key_99", "Dev Admin Key", "admin")
            self.register_key("tf_dev_operator_key_01", "Dev Operator Key", "operator")
            self.register_key("tf_dev_auditor_key_02", "Dev Auditor Key", "auditor")

        # 2. Parse optional TRUSTFED_API_KEYS from env (e.g. "key1:admin:PartnerA,key2:operator:CoreBank")
        custom_keys = getattr(settings, "api_keys_raw", "") or ""
        if custom_keys:
            for entry in custom_keys.split(","):
                parts = entry.strip().split(":")
                if len(parts) >= 2:
                    raw_k = parts[0].strip()
                    role = parts[1].strip().lower()
                    name = parts[2].strip() if len(parts) > 2 else f"Partner-{role}"
                    if raw_k and role in ROLES:
                        self.register_key(raw_k, name, role)

    def register_key(self, raw_key: str, name: str, role: str) -> str:
        """Registers a new raw key, stores its hash, and returns the hash."""
        if role not in ROLES:
            raise ValueError(f"Invalid role '{role}'. Must be one of {list(ROLES.keys())}")
        key_hash = self._hash_key(raw_key)
        self._keys[key_hash] = {
            "name": name,
            "role": role,
            "created_at": time.time(),
            "is_active": True,
        }
        return key_hash

    def authenticate(self, raw_key: str) -> Optional[Dict[str, Any]]:
        """Constant-time lookup of raw API key against stored SHA-256 hashes."""
        if not raw_key:
            return None
        candidate_hash = self._hash_key(raw_key)
        for stored_hash, record in self._keys.items():
            if secrets.compare_digest(candidate_hash, stored_hash):
                if record.get("is_active", False):
                    return record
        return None


# Global singleton key registry
key_registry = APIKeyRegistry()

# Admin action audit trail with atomic persistence
admin_audit_log: List[Dict[str, Any]] = []


def _load_audit_log():
    global admin_audit_log
    if AUDIT_LOG_FILE.is_file():
        try:
            with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    admin_audit_log.clear()
                    admin_audit_log.extend(data)
        except Exception as exc:
            logger.warning(f"Could not load admin audit log: {exc}")


def _save_audit_log():
    try:
        AUDIT_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        temp_dir = AUDIT_LOG_FILE.parent
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, encoding="utf-8") as tf:
            json.dump(admin_audit_log, tf, indent=2)
            temp_name = tf.name
        os.replace(temp_name, AUDIT_LOG_FILE)
    except Exception as exc:
        logger.warning(f"Failed to persist admin audit log atomically: {exc}")


_load_audit_log()


def log_admin_action(actor: str, role: str, action: str, details: Dict[str, Any], client_ip: str):
    """Appends an entry to the immutable admin action audit ledger with PII sanitization."""
    sanitized_details = sanitize_payload(details)
    entry = {
        "timestamp": time.time(),
        "utc_time": datetime.now(timezone.utc).isoformat(),
        "actor": actor,
        "role": role,
        "action": action,
        "details": sanitized_details,
        "client_ip": client_ip,
    }
    admin_audit_log.append(entry)
    _save_audit_log()
    logger.info(f"[ADMIN AUDIT] {actor} ({role}) executed '{action}' from {client_ip}")



def create_jwt_token(identity: str, role: str, expires_in_minutes: int = 120) -> str:
    """Signs a standard JWT bearer token with expiry and role claims."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": identity,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=expires_in_minutes),
        "iss": "trustfed-auth-hub",
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def verify_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=["HS256"],
            issuer="trustfed-auth-hub",
        )
        return payload
    except (jwt.PyJWTError, ValueError):
        return None


async def get_current_caller(
    request: Request,
    api_key_header: Optional[str] = Security(api_key_header_scheme),
    bearer_creds: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    token_query: Optional[str] = Query(None, alias="token"),
) -> AuthIdentity:
    """
    Central authentication dependency.
    Validates API key (header or query), Bearer token, or applies dev demo session.
    """
    client_ip = request.client.host if request.client else "unknown"

    # 1. Check API Key in X-API-Key header or ?token= query parameter
    raw_key = api_key_header or token_query
    if raw_key:
        record = key_registry.authenticate(raw_key)
        if record:
            return AuthIdentity(
                identity=record["name"],
                role=record["role"],
                auth_method="api_key",
                client_ip=client_ip,
            )
        # Explicit credential was provided but failed verification
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired API Key.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    # 2. Check JWT in Authorization: Bearer <token>
    if bearer_creds and bearer_creds.credentials:
        jwt_payload = verify_jwt_token(bearer_creds.credentials)
        if jwt_payload:
            return AuthIdentity(
                identity=jwt_payload.get("sub", "jwt_user"),
                role=jwt_payload.get("role", "operator"),
                auth_method="jwt",
                client_ip=client_ip,
            )
        # Explicit Bearer token was provided but failed verification
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or malformed JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Development Fallback (Permits local UI workbench to function seamlessly when NO credentials provided)
    if not settings.is_production:
        return AuthIdentity(
            identity="dev_workbench_operator",
            role="admin",  # Full permissions in dev mode
            auth_method="dev_mode_bypass",
            client_ip=client_ip,
        )

    # 4. In Production: Strict Deny on Missing Credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid 'X-API-Key' or 'Authorization: Bearer <token>' header.",
        headers={"WWW-Authenticate": "Bearer"},
    )



def require_role(allowed_roles: List[str]):
    """FastAPI Dependency factory enforcing role-based authorization."""

    async def role_checker(caller: AuthIdentity = Depends(get_current_caller)) -> AuthIdentity:
        # Check if caller has any of the allowed roles
        has_permission = any(caller.has_role(r) for r in allowed_roles)
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Insufficient privileges. Required role in {allowed_roles}, your role is '{caller.role}'.",
            )
        return caller

    return role_checker


# Reusable Role Dependencies
require_admin = require_role(["admin"])
require_operator = require_role(["operator", "admin"])
require_auditor = require_role(["auditor", "operator", "admin"])
