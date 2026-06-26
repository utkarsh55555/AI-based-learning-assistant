"""
utils/lockout.py
================
In-memory account lockout tracker.

Rules (configurable via .env):
  - Max LOCKOUT_MAX_ATTEMPTS consecutive failures   (default 5)
  - Lockout duration LOCKOUT_DURATION_SECONDS       (default 900 = 15 min)

This uses a simple dict protected by a thread-lock so it is safe under
Flask's threaded dev server and Gunicorn's threaded workers.
For multi-process/multi-instance deployments swap the storage to Redis
(see the commented-out stub at the bottom).
"""

import time
import threading
from config.settings import settings

_lock = threading.Lock()

# Structure: { identifier: {"attempts": int, "locked_until": float | None} }
_store: dict = {}


def _key(identifier: str) -> str:
    """Normalise the lockout key (always lower-case email / IP)."""
    return identifier.strip().lower()


def record_failure(identifier: str) -> dict:
    """
    Record a failed login attempt.

    Returns a dict with:
      - locked      (bool)
      - attempts    (int)
      - retry_after (int)  seconds remaining, 0 if not locked
    """
    k = _key(identifier)
    now = time.time()

    with _lock:
        entry = _store.get(k, {"attempts": 0, "locked_until": None})

        # If already locked and lock has expired, reset
        if entry["locked_until"] and now >= entry["locked_until"]:
            entry = {"attempts": 0, "locked_until": None}

        entry["attempts"] += 1

        if entry["attempts"] >= settings.LOCKOUT_MAX_ATTEMPTS:
            entry["locked_until"] = now + settings.LOCKOUT_DURATION_SECONDS

        _store[k] = entry

        locked = bool(entry["locked_until"] and now < entry["locked_until"])
        retry_after = max(0, int((entry["locked_until"] or 0) - now)) if locked else 0
        return {
            "locked": locked,
            "attempts": entry["attempts"],
            "retry_after": retry_after,
        }


def record_success(identifier: str) -> None:
    """Clear the failure counter after a successful login."""
    k = _key(identifier)
    with _lock:
        _store.pop(k, None)


def check_lockout(identifier: str) -> dict:
    """
    Check whether an identifier is currently locked out.

    Returns a dict with:
      - locked      (bool)
      - attempts    (int)
      - retry_after (int)  seconds remaining, 0 if not locked
    """
    k = _key(identifier)
    now = time.time()

    with _lock:
        entry = _store.get(k, {"attempts": 0, "locked_until": None})

        # Expired lock — treat as unlocked
        if entry["locked_until"] and now >= entry["locked_until"]:
            _store.pop(k, None)
            return {"locked": False, "attempts": 0, "retry_after": 0}

        locked = bool(entry["locked_until"] and now < entry["locked_until"])
        retry_after = max(0, int((entry["locked_until"] or 0) - now)) if locked else 0
        return {
            "locked": locked,
            "attempts": entry["attempts"],
            "retry_after": retry_after,
        }


def reset_lockout(identifier: str) -> None:
    """Manually clear a lockout (admin action)."""
    k = _key(identifier)
    with _lock:
        _store.pop(k, None)


# -----------------------------------------------------------------------
# Redis-backed alternative (drop-in replacement for production)
# -----------------------------------------------------------------------
# import redis
# _redis = redis.from_url(settings.RATE_LIMIT_STORAGE_URI)
#
# def record_failure(identifier):
#     k = f"lockout:{identifier.lower()}"
#     attempts = _redis.incr(k)
#     if attempts == 1:
#         _redis.expire(k, settings.LOCKOUT_DURATION_SECONDS)
#     if attempts >= settings.LOCKOUT_MAX_ATTEMPTS:
#         _redis.expire(k, settings.LOCKOUT_DURATION_SECONDS)
#     ttl = _redis.ttl(k)
#     locked = attempts >= settings.LOCKOUT_MAX_ATTEMPTS
#     return {"locked": locked, "attempts": attempts, "retry_after": ttl if locked else 0}
