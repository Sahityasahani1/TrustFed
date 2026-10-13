"""
TrustFed: Advanced Rate Limiting, Gemini Denial-of-Wallet Shield & Circuit Breaker.
Provides:
1. Multi-tier sliding window rate limiter (default, batch, ai_stream, auth).
2. Gemini API Circuit Breaker (halts external LLM calls during quota exhaustion or outages).
3. Explanation response cache (deduplicates identical regulatory prompts to slash API costs).
4. Standard HTTP 429 headers: Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset.
"""

import collections
import hashlib
import json
import logging
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, Request, Response, status

try:
    from config import settings
except ImportError:
    from backend.config import settings

logger = logging.getLogger("trustfed.ratelimit")


class SlidingWindowRateLimiter:
    """
    Sliding window in-memory rate limiter with per-tier limits and caller identification.
    Identifies callers by hashed API key/token or IP address.
    """

    def __init__(self):
        # Format: { (tier, client_id): deque([timestamp1, timestamp2, ...]) }
        self._history: Dict[Tuple[str, str], collections.deque] = collections.defaultdict(collections.deque)
        self._lock = threading.Lock()

    def _parse_limit_str(self, limit_str: str) -> Tuple[int, float]:
        """Parses '60/minute' or '10/second' into (max_requests, window_seconds)."""
        try:
            parts = limit_str.strip().lower().split("/")
            count = int(parts[0])
            unit = parts[1] if len(parts) > 1 else "minute"
            if unit.startswith("sec"):
                window = 1.0
            elif unit.startswith("hour"):
                window = 3600.0
            elif unit.startswith("day"):
                window = 86400.0
            else:  # default minute
                window = 60.0
            return count, window
        except Exception:
            return 60, 60.0

    def get_tier_config(self, tier: str) -> Tuple[int, float]:
        """Resolves rate limit config for a given tier from settings."""
        if tier == "ai_stream":
            return self._parse_limit_str(settings.rate_limit_ai_stream)
        elif tier == "batch":
            return self._parse_limit_str(settings.rate_limit_batch)
        elif tier == "auth":
            return 10, 60.0  # 10 attempts per minute on auth token route
        else:
            return self._parse_limit_str(settings.rate_limit_default)

    def _get_client_id(self, request: Request) -> str:
        """Extracts unique client identifier (API key hash or client IP)."""
        # 1. API key if present
        api_key = request.headers.get("X-API-Key")
        if api_key:
            return "key_" + hashlib.sha256(api_key.encode("utf-8")).hexdigest()[:16]

        # 2. Bearer token if present
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:].strip()
            return "jwt_" + hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]

        # 3. Client IP fallback
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
            return f"ip_{ip}"

        ip = request.client.host if request.client else "127.0.0.1"
        return f"ip_{ip}"

    def check(self, request: Request, tier: str = "default", response: Optional[Response] = None) -> Dict[str, str]:
        """
        Checks rate limit for current request and tier.
        Raises HTTPException(429) if exceeded.
        Returns rate limit headers if passed and injects into response if provided.
        """
        client_id = self._get_client_id(request)
        max_requests, window_seconds = self.get_tier_config(tier)
        key = (tier, client_id)
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            q = self._history[key]
            # Prune timestamps older than current window
            while q and q[0] <= window_start:
                q.popleft()

            current_count = len(q)

            if current_count >= max_requests:
                oldest = q[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                reset_time = int(oldest + window_seconds)

                logger.warning(
                    f"[RATE LIMIT] Client {client_id} exceeded {tier} limit ({max_requests}/{int(window_seconds)}s). "
                    f"Retry-After: {retry_after}s"
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded for tier '{tier}'. Maximum allowed is {max_requests} requests per {int(window_seconds)}s.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(max_requests),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_time),
                    },
                )

            # Record timestamp
            q.append(now)
            remaining = max_requests - len(q)
            reset_time = int(now + window_seconds)

            headers = {
                "X-RateLimit-Limit": str(max_requests),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(reset_time),
            }
            if response is not None:
                for k, v in headers.items():
                    response.headers[k] = v

            return headers


    def reset(self):
        """Clears all rate limit histories (used for tests)."""
        with self._lock:
            self._history.clear()


class GeminiCircuitBreaker:
    """
    Circuit breaker for external Google Gemini AI APIs.
    Protects against quota exhaustion (429 ResourceExhausted), cloud billing spikes,
    and cascading network timeouts.
    States:
    - CLOSED: Normal operation.
    - OPEN: Tripped due to repeated errors or 429 quota exhaustion. Calls fast-fallback.
    - HALF_OPEN: Trial canary call to test if Google API recovered.
    """

    def __init__(self, failure_threshold: int = 2, cooldown_seconds: float = 60.0):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.state = "CLOSED"
        self.consecutive_failures = 0
        self.last_failure_time = 0.0
        self._lock = threading.Lock()

    def is_available(self) -> bool:
        """Determines if external calls to Gemini are permitted right now."""
        with self._lock:
            now = time.time()
            if self.state == "OPEN":
                if now - self.last_failure_time > self.cooldown_seconds:
                    self.state = "HALF_OPEN"
                    logger.info("[CIRCUIT BREAKER] Gemini cooldown expired -> entering HALF_OPEN trial state.")
                    return True
                return False
            return True

    def record_success(self):
        """Records a successful Gemini call, restoring normal state."""
        with self._lock:
            self.consecutive_failures = 0
            if self.state != "CLOSED":
                logger.info("[CIRCUIT BREAKER] Gemini call succeeded -> closing circuit breaker.")
            self.state = "CLOSED"

    def record_failure(self, status_code: Optional[int] = None, is_quota_exhausted: bool = False):
        """Records a failed call or quota exhaustion."""
        with self._lock:
            self.consecutive_failures += 1
            self.last_failure_time = time.time()

            # Immediate trip on explicit 429 Quota Exhausted
            if is_quota_exhausted or status_code == 429:
                self.state = "OPEN"
                logger.warning(
                    f"[CIRCUIT BREAKER] Gemini Quota Exhausted (HTTP 429). Tripping circuit breaker for {int(self.cooldown_seconds)}s."
                )
                return

            if self.consecutive_failures >= self.failure_threshold:
                self.state = "OPEN"
                logger.warning(
                    f"[CIRCUIT BREAKER] {self.consecutive_failures} consecutive failures. Tripping circuit breaker for {int(self.cooldown_seconds)}s."
                )

    def reset(self):
        """Resets the circuit breaker state."""
        with self._lock:
            self.state = "CLOSED"
            self.consecutive_failures = 0
            self.last_failure_time = 0.0


class ExplanationCache:
    """
    In-memory LRU cache with TTL for AI regulatory audit explanations.
    Deduplicates identical evaluations to eliminate redundant LLM API costs.
    """

    def __init__(self, maxsize: int = 200, ttl_seconds: float = 1800.0):
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        # Format: {hash_key: (value, timestamp)}
        self._cache: collections.OrderedDict[str, Tuple[Dict[str, Any], float]] = collections.OrderedDict()
        self._lock = threading.Lock()

    def _make_key(self, domain: str, ml_json: Dict[str, Any]) -> str:
        """Derives a deterministic cache key from classification, risk score, and top drivers."""
        risk_info = ml_json.get("risk", {})
        classification = risk_info.get("classification", "")
        risk_score = round(float(risk_info.get("risk_score", 0.0)), 1)
        factors = [f.get("feature", "") for f in ml_json.get("risk_factors", [])[:3]]
        raw = f"{domain}:{classification}:{risk_score}:{','.join(factors)}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, domain: str, ml_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Retrieves cached explanation if not expired."""
        key = self._make_key(domain, ml_json)
        now = time.time()
        with self._lock:
            if key in self._cache:
                data, created_at = self._cache[key]
                if now - created_at < self.ttl_seconds:
                    self._cache.move_to_end(key)
                    return data
                else:
                    del self._cache[key]
        return None

    def set(self, domain: str, ml_json: Dict[str, Any], explanation_data: Dict[str, Any]):
        """Caches explanation output."""
        key = self._make_key(domain, ml_json)
        now = time.time()
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            self._cache[key] = (explanation_data, now)
            if len(self._cache) > self.maxsize:
                self._cache.popitem(last=False)

    def clear(self):
        """Clears all cached explanations."""
        with self._lock:
            self._cache.clear()


# Global Singleton Instances
rate_limiter = SlidingWindowRateLimiter()
circuit_breaker = GeminiCircuitBreaker()
explanation_cache = ExplanationCache()
