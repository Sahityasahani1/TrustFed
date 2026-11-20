"""
TrustFed: Distributed Semantic Explanation Cache (Phase 2).
Provides two-tier caching:
- Tier 1: In-memory High-Speed LRU Cache (sub-millisecond)
- Tier 2: Distributed Redis Cache with configurable TTL (default 24h)
- Graceful degradation: Seamless in-memory fallback if Redis is unavailable.
"""

import collections
import hashlib
import json
import logging
import threading
import time
from typing import Any, Dict, Optional, Tuple

try:
    from config import settings
except ImportError:
    from backend.config import settings

logger = logging.getLogger("trustfed.cache")

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    redis = None
    REDIS_AVAILABLE = False


class HybridSemanticCache:
    """
    Two-tier hybrid semantic cache for LLM reasoning explanations:
    1. Checks in-memory LRU first (Tier 1: <0.1ms).
    2. Checks Redis second (Tier 2: <2ms).
    3. If Redis is unreachable, operates reliably in local memory.
    """

    def __init__(self, max_memory_entries: int = 1000):
        self._max_memory_entries = max_memory_entries
        self._memory_cache: collections.OrderedDict[str, Tuple[Dict[str, Any], float]] = collections.OrderedDict()
        self._lock = threading.Lock()
        
        # Redis connection setup
        self._redis_client: Optional[Any] = None
        self._redis_connected: bool = False
        self._init_redis()

        # Telemetry metrics
        self._hits_memory: int = 0
        self._hits_redis: int = 0
        self._misses: int = 0
        self._sets: int = 0

    def _init_redis(self):
        """Attempts connection to Redis with short timeout for non-blocking startup."""
        if not REDIS_AVAILABLE:
            logger.info("Redis package not available; using in-memory semantic cache.")
            return

        try:
            url = getattr(settings, "redis_url", "redis://localhost:6379/0")
            client = redis.Redis.from_url(
                url,
                socket_timeout=0.8,
                socket_connect_timeout=0.8,
                decode_responses=True,
            )
            client.ping()
            self._redis_client = client
            self._redis_connected = True
            logger.info(f"Connected to Redis cluster for distributed caching: {url}")
        except Exception as exc:
            self._redis_connected = False
            self._redis_client = None
            logger.info(f"Redis unavailable ({exc}). In-memory semantic cache active.")

    def compute_fingerprint(self, domain: str, ml_json: Dict[str, Any]) -> str:
        """
        Creates a deterministic SHA-256 fingerprint from ML outcome and top SHAP drivers.
        Rounds floats to 2 decimal places to cluster mathematically similar explanations.
        """
        risk = ml_json.get("risk", {})
        prob = round(float(risk.get("fraud_probability", 0.0)), 2)
        classification = str(risk.get("classification", "unknown")).lower()

        factors = ml_json.get("risk_factors", [])
        norm_factors = []
        for f in sorted(factors, key=lambda x: str(x.get("feature", ""))):
            name = str(f.get("feature", ""))
            impact = round(float(f.get("impact_log_odds", 0.0)), 2)
            direction = str(f.get("direction", ""))
            norm_factors.append((name, impact, direction))

        canonical = {
            "domain": domain.lower(),
            "p": prob,
            "cls": classification,
            "drivers": norm_factors,
        }
        raw_str = json.dumps(canonical, sort_keys=True)
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    def get(self, domain: str, ml_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Retrieves explanation from cache if present.
        Returns copy of explanation with cache metadata attached, or None.
        """
        key = self.compute_fingerprint(domain, ml_json)
        now = time.time()

        # 1. Check Tier 1 (Memory LRU)
        with self._lock:
            if key in self._memory_cache:
                data, expire_at = self._memory_cache[key]
                if expire_at > now:
                    self._memory_cache.move_to_end(key)
                    self._hits_memory += 1
                    result = dict(data)
                    result["cached"] = True
                    result["cache_tier"] = "memory_l1"
                    return result
                else:
                    del self._memory_cache[key]

        # 2. Check Tier 2 (Redis) if active
        if self._redis_connected and self._redis_client:
            try:
                redis_key = f"trustfed:explanation:{key}"
                val = self._redis_client.get(redis_key)
                if val:
                    data = json.loads(val)
                    self._hits_redis += 1
                    # Promote back to Tier 1 memory
                    with self._lock:
                        ttl = settings.cache_ttl_seconds
                        self._memory_cache[key] = (data, now + ttl)
                        if len(self._memory_cache) > self._max_memory_entries:
                            self._memory_cache.popitem(last=False)
                    result = dict(data)
                    result["cached"] = True
                    result["cache_tier"] = "redis_l2"
                    return result
            except Exception as exc:
                logger.warning(f"Redis get failed: {exc}")

        self._misses += 1
        return None

    def set(
        self,
        domain: str,
        ml_json: Dict[str, Any],
        explanation: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
    ) -> str:
        """Stores explanation in Tier 1 and Tier 2 caches with TTL."""
        key = self.compute_fingerprint(domain, ml_json)
        ttl = ttl_seconds or getattr(settings, "cache_ttl_seconds", 86400)
        now = time.time()
        expire_at = now + ttl

        # 1. Write to Memory LRU
        with self._lock:
            self._memory_cache[key] = (explanation, expire_at)
            self._memory_cache.move_to_end(key)
            if len(self._memory_cache) > self._max_memory_entries:
                self._memory_cache.popitem(last=False)

        # 2. Write to Redis if active
        if self._redis_connected and self._redis_client:
            try:
                redis_key = f"trustfed:explanation:{key}"
                serialized = json.dumps(explanation, ensure_ascii=False)
                self._redis_client.setex(redis_key, int(ttl), serialized)
            except Exception as exc:
                logger.warning(f"Redis set failed: {exc}")

        self._sets += 1
        return key

    def clear(self):
        """Clears memory and Redis explanation cache."""
        with self._lock:
            self._memory_cache.clear()

        if self._redis_connected and self._redis_client:
            try:
                keys = self._redis_client.keys("trustfed:explanation:*")
                if keys:
                    self._redis_client.delete(*keys)
            except Exception as exc:
                logger.warning(f"Redis clear failed: {exc}")

    def get_stats(self) -> Dict[str, Any]:
        """Returns live cache telemetry and hit rates."""
        total_queries = self._hits_memory + self._hits_redis + self._misses
        hit_ratio = (
            (self._hits_memory + self._hits_redis) / max(total_queries, 1)
            if total_queries > 0
            else 0.0
        )
        return {
            "tier1_memory_entries": len(self._memory_cache),
            "tier1_memory_capacity": self._max_memory_entries,
            "tier1_memory_hits": self._hits_memory,
            "tier2_redis_connected": self._redis_connected,
            "tier2_redis_hits": self._hits_redis,
            "total_misses": self._misses,
            "total_sets": self._sets,
            "hit_ratio": round(hit_ratio, 4),
            "cache_ttl_seconds": getattr(settings, "cache_ttl_seconds", 86400),
        }


# Global Singleton Hybrid Cache
semantic_cache = HybridSemanticCache()
