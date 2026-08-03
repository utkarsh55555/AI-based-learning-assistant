"""
middlewares/csrf_middleware.py
==============================
Stateless HMAC-based CSRF protection.

How it works
------------
1. The client calls GET /api/csrf-token to obtain a signed token.
2. The server signs  `{timestamp}:{random_nonce}`  with HMAC-SHA256
   using CSRF_SECRET_KEY.
3. Every state-changing request (POST / PUT / PATCH / DELETE) must send
   this token in the  X-CSRF-Token  header.
4. The server verifies the signature and checks the token is not expired
   (configurable via CSRF_TOKEN_EXPIRY_SECONDS).

SPA note: Single-Page Applications are not vulnerable to classical CSRF
because they use localStorage + Authorization headers (not cookies).
This layer adds defence-in-depth for any session-cookie fallback paths.

Usage in app.py:
    from middlewares.csrf_middleware import csrf, generate_csrf_token, csrf_token_endpoint
    csrf.init_app(app)
"""

import hmac
import hashlib
import secrets
import time
from functools import wraps
from flask import Flask, request, g
from config.settings import settings
from utils.response import success_response, error_response


# ── Token helpers ──────────────────────────────────────────────────────────

def _sign(payload: str) -> str:
    """HMAC-SHA256 sign a payload with the CSRF secret key."""
    return hmac.new(
        settings.CSRF_SECRET_KEY.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()


def generate_csrf_token() -> str:
    """
    Generate a fresh, signed CSRF token.
    Format:  {timestamp}:{nonce}:{signature}
    """
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    payload = f"{timestamp}:{nonce}"
    signature = _sign(payload)
    return f"{payload}:{signature}"


def validate_csrf_token(token: str) -> tuple[bool, str]:
    """
    Validate a CSRF token.

    Returns:
        (True, "")          – valid
        (False, reason_str) – invalid, with reason
    """
    if not token:
        return False, "Missing CSRF token"

    parts = token.split(":")
    if len(parts) != 3:
        return False, "Malformed CSRF token"

    timestamp_str, nonce, provided_sig = parts

    # Verify signature (constant-time comparison)
    payload = f"{timestamp_str}:{nonce}"
    expected_sig = _sign(payload)
    if not hmac.compare_digest(expected_sig, provided_sig):
        return False, "Invalid CSRF token signature"

    # Check expiry
    try:
        token_age = int(time.time()) - int(timestamp_str)
    except ValueError:
        return False, "Malformed CSRF token timestamp"

    if token_age > settings.CSRF_TOKEN_EXPIRY_SECONDS:
        return False, "CSRF token has expired"

    return True, ""


# ── Flask extension ────────────────────────────────────────────────────────

class CSRFProtect:
    """Lightweight CSRF protect extension."""

    SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
    _exempt_views: set = set()

    def init_app(self, app: Flask):
        app.before_request(self._check_csrf)

    def _check_csrf(self):
        """Before-request hook: validate CSRF for state-changing requests."""
        if request.method in self.SAFE_METHODS:
            return

        # Skip for endpoints explicitly exempted
        endpoint = request.endpoint or ""
        if endpoint in self._exempt_views:
            return

        # Skip if no Cookie-based session is in use
        # (Bearer-token-only APIs are not classically CSRF vulnerable,
        #  but we validate anyway for defence-in-depth)
        token = (
            request.headers.get("X-CSRF-Token")
            or request.form.get("csrf_token")
            or (request.get_json(silent=True) or {}).get("csrf_token")
        )

        valid, reason = validate_csrf_token(token or "")
        if not valid:
            return error_response(f"CSRF validation failed: {reason}", status_code=403)

    def exempt(self, view_func):
        """Decorator to exempt a view from CSRF checks."""
        self._exempt_views.add(view_func.__name__)
        return view_func


csrf = CSRFProtect()


# ── Public endpoint to issue tokens ───────────────────────────────────────

def csrf_token_endpoint():
    """
    GET /api/csrf-token
    Returns a fresh signed CSRF token for the client to store and replay.
    """
    token = generate_csrf_token()
    return success_response({"csrf_token": token}, "CSRF token issued")
