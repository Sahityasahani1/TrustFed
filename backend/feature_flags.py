"""
TrustFed: Production Feature Flags Engine.
Provides dynamic feature toggles with environment fallback, atomic persistence,
and administrative override capabilities.
"""
import json
import os
import threading
from pathlib import Path
from typing import Any, Dict, Optional

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
FLAGS_FILE = ARTIFACTS_DIR / "feature_flags.json"

# Default Production Feature Flag Definitions
DEFAULT_FLAGS: Dict[str, Dict[str, Any]] = {
    "STREAMING_ENABLED": {
        "enabled": True,
        "description": "Enables high-frequency WebSocket clearinghouse streaming (10-50 TPS)",
        "category": "infrastructure",
    },
    "HARDWARE_ENCLAVES_ENABLED": {
        "enabled": True,
        "description": "Enables AWS Nitro / Intel SGX remote attestation and TEE aggregation",
        "category": "security",
    },
    "GEMINI_REASONING_ENABLED": {
        "enabled": True,
        "description": "Enables Google Gemini 2.5 Flash generative regulatory explanations",
        "category": "ai",
    },
    "RATE_LIMITING_STRICT": {
        "enabled": True,
        "description": "Enforces sliding-window rate limits across all API tiers",
        "category": "security",
    },
    "SEMANTIC_CACHE_ENABLED": {
        "enabled": True,
        "description": "Enables two-tier hybrid LRU + Redis semantic explanation caching",
        "category": "performance",
    },
    "STRUCTURED_JSON_LOGGING": {
        "enabled": True,
        "description": "Emits structured JSON application logs with PII redaction",
        "category": "observability",
    },
    "EXPAND_CONTRACT_SCHEMA_V2": {
        "enabled": True,
        "description": "Enables backward-compatible schema expand-and-contract migrations",
        "category": "database",
    },
}


class FeatureFlagsManager:
    """Thread-safe feature flag registry with atomic persistence and env override."""

    def __init__(self, persistence_file: Path = FLAGS_FILE):
        self.persistence_file = persistence_file
        self._lock = threading.Lock()
        self._flags: Dict[str, Dict[str, Any]] = {}
        self._load_flags()

    def _load_flags(self) -> None:
        """Loads flags from disk or initializes defaults, applying ENV overrides."""
        with self._lock:
            if self.persistence_file.exists():
                try:
                    with open(self.persistence_file, "r", encoding="utf-8") as f:
                        self._flags = json.load(f)
                except Exception:
                    self._flags = {}

            # Merge with defaults for any missing flags
            for key, val in DEFAULT_FLAGS.items():
                if key not in self._flags:
                    self._flags[key] = val.copy()

            # Apply Environment Variable Overrides (FLAG_<KEY>=true/false)
            for key in self._flags:
                env_var = f"FLAG_{key}"
                if env_var in os.environ:
                    override_val = os.environ[env_var].lower() in ("1", "true", "yes", "on")
                    self._flags[key]["enabled"] = override_val
                    self._flags[key]["env_overridden"] = True

            self._save_flags_unlocked()

    def _save_flags_unlocked(self) -> None:
        """Persists flags atomically."""
        try:
            self.persistence_file.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self.persistence_file.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(self._flags, f, indent=2)
            temp_path.replace(self.persistence_file)
        except Exception:
            pass

    def is_enabled(self, flag_key: str, default: bool = False) -> bool:
        """Checks if a feature flag is currently active."""
        with self._lock:
            # Check direct environment override first
            env_var = f"FLAG_{flag_key}"
            if env_var in os.environ:
                return os.environ[env_var].lower() in ("1", "true", "yes", "on")

            flag_entry = self._flags.get(flag_key)
            if flag_entry is not None:
                return bool(flag_entry.get("enabled", default))
            return default

    def set_flag(self, flag_key: str, enabled: bool, actor: str = "system") -> Dict[str, Any]:
        """Dynamically updates a flag state with audit logging."""
        with self._lock:
            if flag_key not in self._flags:
                self._flags[flag_key] = {
                    "enabled": enabled,
                    "description": f"Custom flag: {flag_key}",
                    "category": "custom",
                }
            else:
                self._flags[flag_key]["enabled"] = enabled

            self._flags[flag_key]["last_modified_by"] = actor
            self._save_flags_unlocked()
            return self._flags[flag_key]

    def get_all_flags(self) -> Dict[str, Dict[str, Any]]:
        """Returns snapshot of all flags and their states."""
        with self._lock:
            return {k: v.copy() for k, v in self._flags.items()}

    def reset_defaults(self) -> None:
        """Resets all flags back to system defaults."""
        with self._lock:
            self._flags = {k: v.copy() for k, v in DEFAULT_FLAGS.items()}
            self._save_flags_unlocked()


# Global Singleton Feature Flag Manager
feature_flags = FeatureFlagsManager()
