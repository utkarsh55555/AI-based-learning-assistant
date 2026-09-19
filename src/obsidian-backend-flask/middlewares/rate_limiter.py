"""
middlewares/rate_limiter.py
============================
Centralised Flask-Limiter configuration.

Usage in route files:
    from middlewares.rate_limiter import limiter, login_limit, api_limit

    @auth_bp.route('/login', methods=['POST'])
    @login_limit          # strict: 5/min
    def login(): ...

    @quiz_bp.route('/generate', methods=['POST'])
    @api_limit            # relaxed: 120/min
    def generate(): ...
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config.settings import settings
from utils.response import error_response


def rate_limit_exceeded_handler(e):
    """Custom JSON response when the rate limit is hit."""
    return error_response(
        "Too many requests. Please slow down and try again later.",
        status_code=429,
    )


# ── Limiter singleton ──────────────────────────────────────────────────────
# The actual Flask `app` is injected via limiter.init_app(app) in create_app().
limiter = Limiter(
    key_func=get_remote_address,           # Rate-limit per client IP
    default_limits=[settings.RATE_LIMIT_API],
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
    on_breach=rate_limit_exceeded_handler,
)

# ── Named shorthand decorators ─────────────────────────────────────────────
login_limit  = limiter.limit(settings.RATE_LIMIT_LOGIN)   # e.g. "5 per minute"
signup_limit = limiter.limit(settings.RATE_LIMIT_SIGNUP)  # e.g. "3 per minute"
api_limit    = limiter.limit(settings.RATE_LIMIT_API)     # e.g. "120 per minute"

# WebSocket / SSE events – much tighter budget
ws_limit     = limiter.limit("30 per minute")
