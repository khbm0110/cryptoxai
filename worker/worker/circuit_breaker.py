"""
Per-user circuit breaker backed by Redis so it's shared across every worker
replica — a failure recorded by one process instance is visible to all of them
immediately, not just the one that saw it.
"""
import time

import redis

from .config import Config


def _failures_key(user_id: str) -> str:
    return f"cb:failures:{user_id}"


def _open_key(user_id: str) -> str:
    return f"cb:open:{user_id}"


def is_open(r: redis.Redis, user_id: str) -> bool:
    return r.exists(_open_key(user_id)) == 1


def record_failure(r: redis.Redis, user_id: str) -> None:
    key = _failures_key(user_id)
    count = r.incr(key)
    if count == 1:
        r.expire(key, Config.CB_WINDOW_SECONDS)

    if count >= Config.CB_FAILURE_THRESHOLD:
        r.setex(_open_key(user_id), Config.CB_COOLDOWN_SECONDS, str(int(time.time())))
        r.delete(key)  # reset the failure counter once the breaker trips


def record_success(r: redis.Redis, user_id: str) -> None:
    r.delete(_failures_key(user_id))


def reset(r: redis.Redis, user_id: str) -> None:
    """Manual reset — e.g. an admin re-enabling a user after investigating."""
    r.delete(_failures_key(user_id), _open_key(user_id))
