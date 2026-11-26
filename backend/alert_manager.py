"""
TrustFed: Synthetic Alert Manager & Incident Webhook Dispatcher.
Monitors error rates, p95 latency thresholds, and worker queue depths.
Dispatches actionable incident payloads to Slack/Discord/PagerDuty webhooks.
"""
import collections
import json
import threading
import time
from typing import Any, Dict, List, Optional
import requests


class AlertManager:
    """Evaluates real-time performance indicators against alerting thresholds."""

    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = webhook_url
        self._window_requests = collections.deque(maxlen=500)
        self._lock = threading.Lock()
        self._incident_history: List[Dict[str, Any]] = []

    def record_request(self, status_code: int, latency_ms: float) -> Optional[Dict[str, Any]]:
        """Records a request observation and triggers alerts if thresholds are breached."""
        now = time.time()
        with self._lock:
            self._window_requests.append({
                "timestamp": now,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "is_5xx": status_code >= 500,
            })

            # Evaluate recent window periodically (every 25 requests) to avoid lock contention
            if len(self._window_requests) >= 20 and len(self._window_requests) % 25 == 0:
                recent = list(self._window_requests)
                error_count = sum(1 for r in recent if r["is_5xx"])
                error_rate = error_count / len(recent)

                # Alert 1: 5xx Error Rate Spike > 5%
                if error_rate >= 0.05:
                    alert = self._create_alert(
                        alert_type="HIGH_5XX_ERROR_RATE",
                        severity="P1_CRITICAL",
                        message=f"5xx error rate spiked to {error_rate:.1%} ({error_count}/{len(recent)} requests)",
                        metrics={"error_rate": error_rate, "window_size": len(recent)},
                    )
                    return alert

                # Alert 2: Latency Spike p95 > 250ms
                latencies = sorted(r["latency_ms"] for r in recent)
                p95_idx = int(len(latencies) * 0.95)
                p95 = latencies[p95_idx]
                if p95 > 250.0:
                    alert = self._create_alert(
                        alert_type="P95_LATENCY_REGRESSION",
                        severity="P2_HIGH",
                        message=f"p95 inference latency regressed to {p95:.1f}ms (SLA target <= 250ms)",
                        metrics={"p95_latency_ms": p95, "window_size": len(recent)},
                    )
                    return alert

        return None

    def _create_alert(self, alert_type: str, severity: str, message: str, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Creates and stores an incident record, attempting webhook delivery."""
        ts = int(time.time())
        alert_payload = {
            "incident_id": f"INC-{ts}-{alert_type[:4]}",
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "metrics": metrics,
            "timestamp": ts,
            "created_at_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts)),
            "dispatched": False,
        }

        # Avoid redundant duplicate alerts within 60s
        if self._incident_history and self._incident_history[-1]["alert_type"] == alert_type:
            if ts - self._incident_history[-1]["timestamp"] < 60:
                return alert_payload

        # Dispatch to Webhook if configured
        if self.webhook_url:
            try:
                requests.post(self.webhook_url, json=alert_payload, timeout=2.0)
                alert_payload["dispatched"] = True
            except Exception:
                alert_payload["dispatched"] = False

        self._incident_history.append(alert_payload)
        return alert_payload

    def get_incidents(self) -> List[Dict[str, Any]]:
        """Returns recent incident history."""
        with self._lock:
            return list(self._incident_history)

    def trigger_test_alert(self) -> Dict[str, Any]:
        """Manually fires a synthetic test alert for pipeline validation."""
        return self._create_alert(
            alert_type="SYNTHETIC_TEST_ALERT",
            severity="P3_INFO",
            message="Synthetic alert drill executed to verify alerting pipeline connectivity.",
            metrics={"test_mode": True},
        )


# Global Singleton Alert Manager
alert_manager = AlertManager()
