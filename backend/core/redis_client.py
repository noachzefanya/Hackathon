"""
GuardianFlow AI — Redis Client
Azure Cache for Redis — rate limiting, session cache, velocity counters
"""
import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis
from backend.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


async def close_redis() -> None:
    global _redis_pool
    if _redis_pool:
        await _redis_pool.aclose()
        _redis_pool = None


# ── Rate limiting ─────────────────────────────────────────────────────────────

async def check_rate_limit(api_key: str, limit: int = 100, window_seconds: int = 60) -> bool:
    """Returns True if request is allowed, False if rate-limited."""
    r = await get_redis()
    key = f"rate_limit:{api_key}"
    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_seconds)
        return count <= limit
    except Exception as exc:
        logger.warning(f"Rate limit check failed (allowing): {exc}")
        return True  # Fail open


# ── Velocity counter ──────────────────────────────────────────────────────────

async def increment_velocity(user_id: str, window_seconds: int = 600) -> int:
    """Track transaction count per user in a rolling 10-minute window."""
    r = await get_redis()
    key = f"velocity:{user_id}"
    try:
        count = await r.incr(key)
        if count == 1:
            await r.expire(key, window_seconds)
        return count
    except Exception as exc:
        logger.warning(f"Velocity counter failed: {exc}")
        return 1


async def get_velocity(user_id: str) -> int:
    r = await get_redis()
    key = f"velocity:{user_id}"
    val = await r.get(key)
    return int(val) if val else 0


# ── Device trust ──────────────────────────────────────────────────────────────

async def get_device_trust(device_id: str) -> Optional[int]:
    r = await get_redis()
    val = await r.get(f"device_trust:{device_id}")
    return int(val) if val else None


async def set_device_trust(device_id: str, score: int, ttl: int = 3600) -> None:
    r = await get_redis()
    await r.setex(f"device_trust:{device_id}", ttl, score)


# ── Session cache ─────────────────────────────────────────────────────────────

async def set_session(user_id: str, payload: dict, ttl: int = 86400) -> None:
    r = await get_redis()
    await r.setex(f"session:{user_id}", ttl, json.dumps(payload))


async def get_session(user_id: str) -> Optional[dict]:
    r = await get_redis()
    val = await r.get(f"session:{user_id}")
    return json.loads(val) if val else None


async def delete_session(user_id: str) -> None:
    r = await get_redis()
    await r.delete(f"session:{user_id}")
