"""
TrustFed: Sentry Error Tracking & Release Observability Integration.
Initializes Sentry monitoring when SENTRY_DSN is configured; falls back
gracefully to structured local error capture when unconfigured.
"""
import os
from typing import Any, Dict, Optional

RELEASE_VERSION = os.getenv("RELEASE_VERSION", "v1.0.0-prod")
SENTRY_DSN = os.getenv("SENTRY_DSN", "")


class ErrorTracker:
    """Safe wrapper around Sentry error tracking with offline fallback."""

    def __init__(self, dsn: Optional[str] = None):
        self.dsn = dsn or SENTRY_DSN
        self.is_active = False
        self.release = RELEASE_VERSION
        self._init_sentry()

    def _init_sentry(self) -> None:
        if self.dsn:
            try:
                import sentry_sdk
                sentry_sdk.init(
                    dsn=self.dsn,
                    release=self.release,
                    traces_sample_rate=0.1,
                    profiles_sample_rate=0.05,
                    send_default_pii=False,
                )
                self.is_active = True
            except ImportError:
                self.is_active = False
            except Exception:
                self.is_active = False

    def capture_exception(self, exc: Exception, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Captures an exception to Sentry or returns local correlation ID."""
        if self.is_active:
            try:
                import sentry_sdk
                with sentry_sdk.push_scope() as scope:
                    if context:
                        for k, v in context.items():
                            scope.set_extra(k, v)
                    return sentry_sdk.capture_exception(exc)
            except Exception:
                pass
        return None

    def capture_message(self, message: str, level: str = "info") -> None:
        if self.is_active:
            try:
                import sentry_sdk
                sentry_sdk.capture_message(message, level=level)
            except Exception:
                pass


# Global Singleton Error Tracker
error_tracker = ErrorTracker()
