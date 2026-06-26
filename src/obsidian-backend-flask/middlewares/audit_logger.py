"""
middlewares/audit_logger.py
============================
Structured audit logging for security-critical actions.

Every log entry is a JSON line written to AUDIT_LOG_FILE (default audit.log).
The log is append-only and never includes raw passwords or full tokens.

Usage:
    from middlewares.audit_logger import audit_log

    audit_log(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        email=email,
        ip=request.remote_addr,
    )

Critical actions that MUST be audited
--------------------------------------
  LOGIN_ATTEMPT   – every login try (success or failure)
  LOGIN_SUCCESS   – successful authentication
  LOGIN_FAILURE   – wrong credentials
  ACCOUNT_LOCKED  – account locked after repeated failures
  LOGOUT          – user signed out
  SIGNUP          – new account created
  PASSWORD_CHANGE – password updated
  ROLE_CHANGE     – user role modified (admin action)
  PROFILE_UPDATE  – profile data changed
  DATA_EXPORT     – user data exported
  ADMIN_ACTION    – any admin-only operation
  SUSPICIOUS      – rate-limit breach, unusual patterns, etc.
"""

import json
import logging
import time
from pathlib import Path
from flask import request, has_request_context
from config.settings import settings

# ── Logger setup ───────────────────────────────────────────────────────────

_log_path = Path(settings.AUDIT_LOG_FILE)

_audit_handler = logging.FileHandler(_log_path, encoding="utf-8")
_audit_handler.setFormatter(logging.Formatter("%(message)s"))

audit_logger = logging.getLogger("obsidian.audit")
audit_logger.setLevel(logging.INFO)
audit_logger.addHandler(_audit_handler)
audit_logger.propagate = False  # Do NOT bubble up to the root logger

# Also echo to stdout so Render/Railway/Gunicorn capture it
_stdout_handler = logging.StreamHandler()
_stdout_handler.setFormatter(logging.Formatter("[AUDIT] %(message)s"))
audit_logger.addHandler(_stdout_handler)


# ── Public helper ──────────────────────────────────────────────────────────

def audit_log(action: str, **kwargs) -> None:
    """
    Write a structured audit event.

    Args:
        action:   Upper-snake-case event name (e.g. "LOGIN_SUCCESS").
        **kwargs: Arbitrary context fields.  Never pass raw passwords.
    """
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "action": action,
    }

    # Capture request context if available
    if has_request_context():
        entry["ip"] = _get_client_ip()
        entry["method"] = request.method
        entry["path"] = request.path
        entry["user_agent"] = request.headers.get("User-Agent", "")[:200]

    # Merge caller-supplied fields (but redact sensitive ones)
    for key, value in kwargs.items():
        if key.lower() in ("password", "token", "secret", "key"):
            entry[key] = "**REDACTED**"
        else:
            entry[key] = value

    audit_logger.info(json.dumps(entry, default=str))


def _get_client_ip() -> str:
    """Return the real client IP, honouring X-Forwarded-For in production."""
    # Trust X-Forwarded-For only when behind a trusted proxy
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and not settings.FLASK_DEBUG:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"
