"""
TrustFed: Central Production Configuration & Environment Validation.
Validates environment settings at startup using Pydantic V2 Settings.
Fails fast on misconfiguration and prevents secret leakage.
"""

import os
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Production configuration schema with environment separation and fail-fast validation."""

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(Path(__file__).parent / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Runtime Environment
    environment: Literal["development", "staging", "production"] = Field(
        default="development",
        alias="APP_ENV",
        description="Application runtime environment (development, staging, production)",
    )

    # Server Networking
    host: str = Field(default="127.0.0.1", alias="API_HOST")
    port: int = Field(default=8001, alias="API_PORT")

    # CORS Allowlist
    frontend_origins_raw: str = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000",
        alias="FRONTEND_ORIGINS",
        description="Comma-separated list of allowed CORS origins",
    )

    # Google Gemini AI Credentials
    gemini_api_key: Optional[str] = Field(
        default=None,
        alias="GEMINI_API_KEY",
        description="Google Gemini 2.5 API Key for AI regulatory explanations",
    )
    # Legacy alias support for GEMINI_API_Key
    gemini_api_key_legacy: Optional[str] = Field(
        default=None,
        alias="GEMINI_API_Key",
        description="Legacy fallback key name for backwards compatibility",
    )

    gemini_model: str = Field(
        default="gemini-2.5-flash",
        alias="GEMINI_MODEL",
    )

    gemini_fallback_models_raw: str = Field(
        default="gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-2.5-flash-lite,gemini-1.5-flash",
        alias="GEMINI_FALLBACK_MODELS",
    )

    # Production Cryptographic Secret Key
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-32bytes-min",
        alias="TRUSTFED_SECRET_KEY",
        description="Master secret key for token signing and HMAC validation",
    )

    # Rate Limiting Configuration
    rate_limit_default: str = Field(default="60/minute", alias="RATE_LIMIT_DEFAULT")
    rate_limit_ai_stream: str = Field(default="15/minute", alias="RATE_LIMIT_AI_STREAM")
    rate_limit_batch: str = Field(default="30/minute", alias="RATE_LIMIT_BATCH")

    # Maximum Request Body & Upload Caps
    max_upload_size_bytes: int = Field(
        default=10 * 1024 * 1024,  # 10 MB limit
        alias="MAX_UPLOAD_SIZE_BYTES",
    )
    max_batch_records: int = Field(
        default=1000,
        alias="MAX_BATCH_RECORDS",
        description="Maximum records allowed per batch inference request",
    )

    @property
    def effective_gemini_api_key(self) -> Optional[str]:
        """Returns the primary or legacy Gemini API key, trimmed."""
        key = self.gemini_api_key or self.gemini_api_key_legacy
        return key.strip() if key else None

    @property
    def frontend_origins(self) -> List[str]:
        """Returns a list of parsed CORS origin strings."""
        return [o.strip() for o in self.frontend_origins_raw.split(",") if o.strip()]

    @property
    def gemini_fallback_models(self) -> List[str]:
        """Returns ordered fallback Gemini models."""
        return [m.strip() for m in self.gemini_fallback_models_raw.split(",") if m.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Enforces strict production security constraints to prevent unsafe deployments."""
        if self.environment == "production":
            # 1. Require strong non-default secret key
            default_dev_key = "dev-insecure-secret-key-change-in-production-32bytes-min"
            if self.secret_key == default_dev_key or len(self.secret_key) < 32:
                raise ValueError(
                    "Production configuration error: TRUSTFED_SECRET_KEY must be set to a secure, "
                    "unique secret of at least 32 characters in production."
                )

            # 2. Disallow wildcard CORS in production
            if "*" in self.frontend_origins or not self.frontend_origins:
                raise ValueError(
                    "Production configuration error: Wildcard CORS ('*') or empty FRONTEND_ORIGINS "
                    "is forbidden in production."
                )

            # 3. Disallow localhost in production CORS
            has_localhost = any("localhost" in o or "127.0.0.1" in o for o in self.frontend_origins)
            if has_localhost:
                raise ValueError(
                    "Production configuration error: FRONTEND_ORIGINS cannot contain localhost/127.0.0.1 in production."
                )

        return self

    def get_sanitized_summary(self) -> dict:
        """Returns a safe representation of configuration suitable for logging (no secrets)."""
        key = self.effective_gemini_api_key
        return {
            "environment": self.environment,
            "host": self.host,
            "port": self.port,
            "frontend_origins": self.frontend_origins,
            "gemini_model": self.gemini_model,
            "gemini_key_configured": bool(key),
            "gemini_key_preview": f"{key[:6]}...{key[-4:]}" if key and len(key) > 10 else "not_configured",
            "max_upload_size_mb": self.max_upload_size_bytes / (1024 * 1024),
            "max_batch_records": self.max_batch_records,
        }


# Global Singleton Settings Instance
settings = Settings()
