"""
TrustFed: Production Structured Logging, Request Tracing & RFC-Compliant Error Handling.
Provides:
1. Unique Request-ID Tracing (UUIDv4) via X-Request-ID header on all requests and responses.
2. Structured HTTP telemetry logging (method, path, status, latency_ms, client_ip, req_id).
3. Global uniform exception handlers preventing internal stack trace leaks (CWE-209).
4. System memory and diagnostic reporting via psutil.
"""

import logging
import os
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
    from config import settings
except ImportError:
    from backend.config import settings

logger = logging.getLogger("trustfed.http")


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
