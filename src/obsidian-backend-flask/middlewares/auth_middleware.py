"""
middlewares/auth_middleware.py
==============================
JWT token verification and request-context injection.

Decorators
----------
  @require_auth      – endpoint requires a valid Bearer token
  @optional_auth     – injects user if token present, None otherwise
"""

import time
import logging
from functools import wraps
from flask import request
import jwt
from utils.response import error_response
from config.settings import settings
from services.mongo_service import MongoService

logger = logging.getLogger(__name__)

class MockUser:
    def __init__(self, user_id):
        self.id = user_id

class MockUserResponse:
    def __init__(self, user_id):
        self.user = MockUser(user_id)

# ── Token verification ─────────────────────────────────────────────────────

def verify_token(token: str):
    """
    Verify a custom JWT access token.
    Returns a MockUserResponse on success, None on failure.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            return None

        # Exp checks are handled automatically by PyJWT if 'exp' is in payload
        return MockUserResponse(user_id)

    except jwt.ExpiredSignatureError:
        logger.warning("[AUTH] Token expired")
        return None
    except Exception as e:
        logger.warning("[AUTH] Token verification error: %s", e)
        return None


def _extract_token(auth_header: str) -> str | None:
    """Extract the raw token from a 'Bearer <token>' header. Only accepts proper Bearer format."""
    if not auth_header:
        return None
    parts = auth_header.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None  # Reject malformed Authorization headers


# ── require_auth ───────────────────────────────────────────────────────────

def require_auth(f):
    """
    Decorator: endpoint requires a valid Bearer token.

    Injects:
      request.current_user  – MockUserResponse (has .user.id)
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
    Attempt to load the user's profile from MongoDB for role resolution.
    Returns {} on any error so auth never hard-fails on a missing profile.
    """
    try:
        user_id = user_response.user.id
        existing = MongoService.get_records("user_profiles", {"user_id": user_id}, limit=1)
        return existing[0] if existing else {}
    except Exception:
        return {}
