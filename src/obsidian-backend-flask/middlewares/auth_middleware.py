"""
middlewares/auth_middleware.py
==============================
JWT / Supabase token verification and request-context injection.

Decorators
----------
  @require_auth      – endpoint requires a valid Bearer token
  @optional_auth     – injects user if token present, None otherwise

The verified Supabase user is placed on `request.current_user`.
The user's profile (with role) is placed on `request.user_profile`
so that RBAC decorators downstream can read the role without an extra
DB round-trip.
"""

import time
from functools import wraps
from flask import request
from utils.response import error_response
from config.settings import settings
from supabase_client import get_supabase


# ── Token verification ─────────────────────────────────────────────────────

def verify_token(token: str):
    """
    Verify a Supabase access token.

    Returns the Supabase UserResponse on success, None on failure.
    Also enforces configurable session expiry (JWT_EXPIRY_SECONDS).
    """
    try:
        response = get_supabase().auth.get_user(token)
        if not (response and response.user):
            return None

        # Enforce server-side session expiry (belt-and-suspenders over JWT exp)
        user = response.user
        last_sign_in = getattr(user, 'last_sign_in_at', None)
        if last_sign_in and settings.JWT_EXPIRY_SECONDS > 0:
            # Supabase returns ISO-8601; compare via timestamp
            import datetime
            try:
                if last_sign_in.endswith('Z'):
                    last_sign_in = last_sign_in[:-1] + '+00:00'
                sign_in_ts = datetime.datetime.fromisoformat(last_sign_in).timestamp()
                if time.time() - sign_in_ts > settings.JWT_EXPIRY_SECONDS:
                    return None  # Session too old
            except Exception:
                pass  # Can't parse timestamp – don't block

        return response

    except Exception as e:
        print(f"[AUTH] Token verification error: {str(e)}")
        return None


def _extract_token(auth_header: str) -> str | None:
    """Extract the raw token from a 'Bearer <token>' header."""
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return auth_header.strip()  # Accept raw token as fallback


# ── require_auth ───────────────────────────────────────────────────────────

def require_auth(f):
    """
    Decorator: endpoint requires a valid Supabase Bearer token.

    Injects:
      request.current_user  – Supabase UserResponse
      request.user_profile  – dict with profile + role (may be {})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        token = _extract_token(auth_header)

        if not token:
            return error_response("Authorization header missing or malformed", status_code=401)

        user = verify_token(token)
        if not user:
            return error_response(
                "Invalid or expired token. Please log in again.",
                status_code=401,
            )

        request.current_user = user
        request.user_profile = _load_profile(user)
        return f(*args, **kwargs)

    return decorated_function


# ── optional_auth ──────────────────────────────────────────────────────────

def optional_auth(f):
    """
    Decorator: injects user context if a token is present; allows anonymous
    access if no (or invalid) token is supplied.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        request.current_user = None
        request.user_profile = {}

        auth_header = request.headers.get("Authorization", "")
        token = _extract_token(auth_header)
        if token:
            try:
                user = verify_token(token)
                if user:
                    request.current_user = user
                    request.user_profile = _load_profile(user)
            except Exception:
                pass  # Silently ignore; endpoint handles anonymous users

        return f(*args, **kwargs)

    return decorated_function


# ── Profile loader (used internally) ──────────────────────────────────────

def _load_profile(user_response) -> dict:
    """
    Attempt to load the user's profile from Supabase for role resolution.
    Returns {} on any error so auth never hard-fails on a missing profile.
    """
    try:
        from services.supabase_service import SupabaseService
        user_id = user_response.user.id
        profile = SupabaseService.get_record("user_profiles", user_id, "user_id")
        return profile or {}
    except Exception:
        return {}
