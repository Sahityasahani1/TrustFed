"""
TrustFed: Database Connection Pool & Concurrency Throttle.
Prevents connection exhaustion, caps thread contention, and provides query analysis.
"""
import threading
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, Optional


class ConnectionPoolThrottle:
    """Simulates connection pooling with bounded max connections and query telemetry."""

    def __init__(self, max_connections: int = 20, timeout_seconds: float = 5.0):
        self.max_connections = max_connections
        self.timeout_seconds = timeout_seconds
        self._semaphore = threading.BoundedSemaphore(max_connections)
        self._active_connections = 0
        self._total_queries = 0
        self._lock = threading.Lock()

    @contextmanager
    def acquire(self) -> Generator[Dict[str, Any], None, None]:
        """Acquires a pooled connection handle, raising TimeoutError if exhausted."""
        acquired = self._semaphore.acquire(timeout=self.timeout_seconds)
        if not acquired:
            raise TimeoutError(f"Database connection pool exhausted (max {self.max_connections} active).")

        conn_id = 0
        with self._lock:
            self._active_connections += 1
            self._total_queries += 1
            conn_id = self._active_connections

        handle = {
            "connection_id": conn_id,
            "acquired_at": time.time(),
            "status": "ACTIVE",
        }
        try:
            yield handle
        finally:
            with self._lock:
                self._active_connections -= 1
            self._semaphore.release()

    def get_pool_stats(self) -> Dict[str, Any]:
        """Returns connection pool health and saturation telemetry."""
        with self._lock:
            active = self._active_connections
            utilization = round((active / self.max_connections) * 100, 2)
            return {
                "max_connections": self.max_connections,
                "active_connections": active,
                "available_connections": self.max_connections - active,
                "utilization_percent": utilization,
                "total_queries_executed": self._total_queries,
                "health": "OPTIMAL" if utilization < 80.0 else "HIGH_LOAD",
            }


# Global Singleton Database / State Pool Throttle
db_pool = ConnectionPoolThrottle()
