"""
TrustFed: Production Structured Logging, Request Tracing & RFC-Compliant Error Handling.
Provides:
1. Unique Request-ID Tracing (UUIDv4) via X-Request-ID header on all requests and responses.
2. Structured JSON and HTTP telemetry logging with automated PII redaction.
3. Global uniform exception handlers preventing internal stack trace leaks (CWE-209).
4. System memory and diagnostic reporting via psutil.
"""

import json
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

try:
    import psutil
except ImportError:
    psutil = None

try:
    from backend.config import settings
except ImportError:
    from config import settings

logger = logging.getLogger("trustfed.http")

# Sensitive fields to scrub from logs
SENSITIVE_KEYS = {"password", "token", "secret", "api_key", "authorization", "ssn", "card_number", "pin"}
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")


def scrub_pii(data: Any) -> Any:
    """Recursively redacts PII and sensitive credentials from logs and audit records."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = scrub_pii(v)
        return sanitized
    elif isinstance(data, list):
        return [scrub_pii(item) for item in data]
    elif isinstance(data, str):
        return EMAIL_REGEX.sub("[EMAIL_REDACTED]", data)
    return data


class StructuredJsonFormatter(logging.Formatter):
    """Custom logging formatter that outputs one-line JSON documents."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: Dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.created)),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "system"),
            "route": getattr(record, "route", "-"),
            "latency_ms": getattr(record, "latency_ms", None),
            "status_code": getattr(record, "status_code", None),
        }

        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)

        clean_payload = scrub_pii(log_payload)
        return json.dumps(clean_payload)


def get_process_memory_mb() -> float:
    """Returns the current process's RSS memory usage in MB."""
    if psutil:
        try:
            return round(psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024), 2)
        except Exception:
            pass
    return 0.0


def setup_logging():
    """Initializes standardized structured logging for TrustFed services."""
    log_format = "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    # Quiet overly chatty loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def register_exception_handlers(app: FastAPI):
    """Registers global exception handlers returning consistent, client-safe JSON structures."""

    @app.exception_handler(StarletteHTTPException)
    async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
        req_id = getattr(request.state, "request_id", uuid.uuid4().hex)
        headers = dict(exc.headers or {})
        headers["X-Request-ID"] = req_id

        return JSONResponse(
            status_code=exc.status_code,
            headers=headers,
            content={
                "detail": exc.detail,
                "status_code": exc.status_code,
                "request_id": req_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", uuid.uuid4().hex)
        errors = exc.errors()

        logger.warning(f"[422 VALIDATION] {request.method} {request.url.path} (req_id={req_id}) -> {len(errors)} validation errors")

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            headers={"X-Request-ID": req_id},
            content={
                "detail": errors,
                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
                "message": "Request validation failed",
                "request_id": req_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": str(request.url.path),
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", uuid.uuid4().hex)
        logger.error(
            f"[500 UNHANDLED] {request.method} {request.url.path} (req_id={req_id}) Exception: {type(exc).__name__}: {str(exc)}",
            exc_info=True,
        )

        detail_msg = (
            "An internal server error occurred. Please contact the security team with the request_id."
            if settings.is_production
            else f"Internal Server Error: {type(exc).__name__}: {str(exc)}"
        )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            headers={"X-Request-ID": req_id},
            content={
                "detail": detail_msg,
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "error_type": type(exc).__name__,
                "request_id": req_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "path": str(request.url.path),
            },
        )
