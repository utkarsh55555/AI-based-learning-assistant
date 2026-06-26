"""
app.py
======
Obsidian AI Learning Assistant — Flask application factory.

Security layers applied in order:
  1. Flask-Talisman  – Strict HTTP security headers + CSP
  2. Flask-CORS      – Origin whitelist (no wildcards in production)
  3. Flask-Limiter   – Global API rate limiting
  4. CSRF middleware – HMAC-signed token validation
  5. Input sanitizer – XSS stripping on all JSON bodies
  6. Error handlers  – No stack-trace leaks to clients
"""

from flask import Flask, request
from flask_cors import CORS
from flask_talisman import Talisman

from config.settings import settings
from middlewares.error_handler import register_error_handlers
from middlewares.rate_limiter import limiter
from middlewares.csrf_middleware import csrf, csrf_token_endpoint
from middlewares.input_sanitizer import register_sanitizer
from middlewares.audit_logger import audit_log

# Import route blueprints
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.quiz_routes import quiz_bp
from routes.tutor_routes import tutor_bp
from routes.mindmap_routes import mindmap_bp
from routes.notes_routes import notes_bp
from routes.study_routes import study_bp
from routes.leaderboard_routes import leaderboard_bp


# ── Content Security Policy ────────────────────────────────────────────────
# Adjust 'connect-src' when you add more external API endpoints.
CSP = {
    "default-src":  "'self'",
    "script-src":   ["'self'", "'strict-dynamic'"],
    "style-src":    ["'self'", "'unsafe-inline'"],   # needed for CSS-in-JS
    "img-src":      ["'self'", "data:", "https:"],
    "font-src":     ["'self'", "https://fonts.gstatic.com"],
    "connect-src":  [
        "'self'",
        "https://*.supabase.co",
        "https://openrouter.ai",
    ],
    "frame-ancestors": "'none'",                     # Clickjacking protection
    "base-uri":     "'self'",
    "form-action":  "'self'",
}


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Disable strict slashes to avoid 308 redirects that break CORS OPTIONS
    app.url_map.strict_slashes = False

    # ── Core config ────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = settings.SECRET_KEY

    # ── 1. Security headers via Flask-Talisman ─────────────────────────────
    # force_https=True only in production; dev stays on http://localhost
    Talisman(
        app,
        force_https=settings.FORCE_HTTPS,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,     # 1 year HSTS
        content_security_policy=CSP,
        referrer_policy="strict-origin-when-cross-origin",
        feature_policy={                                # Permissions-Policy
            "geolocation":  "'none'",
            "microphone":   "'none'",
            "camera":       "'none'",
            "payment":      "'none'",
        },
        frame_options="DENY",                           # X-Frame-Options
        x_content_type_options=True,                   # X-Content-Type-Options: nosniff
        x_xss_protection=True,                         # X-XSS-Protection
    )

    # ── 2. CORS – origin whitelist ─────────────────────────────────────────
    cors_origins = settings.CORS_ORIGINS
    if cors_origins == "*":
        origins_list = ["*"]
    else:
        origins_list = [o.strip() for o in cors_origins.split(",") if o.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": origins_list}},
        allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=False,   # No cookies — Bearer token only
    )

    # ── 3. Rate limiting ───────────────────────────────────────────────────
    limiter.init_app(app)

    # ── 4. CSRF protection ─────────────────────────────────────────────────
    # NOTE: Login/signup are exempted via @csrf.exempt in auth_routes.py
    # because those endpoints ISSUE the initial session, not consumed post-auth.
    csrf.init_app(app)

    # ── 5. Input sanitization ──────────────────────────────────────────────
    register_sanitizer(app)

    # ── 6. Error handlers ──────────────────────────────────────────────────
    register_error_handlers(app)

    # ── Register blueprints ────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(tutor_bp)
    app.register_blueprint(mindmap_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(study_bp)
    app.register_blueprint(leaderboard_bp)

    # ── CSRF token endpoint ────────────────────────────────────────────────
    app.add_url_rule('/api/csrf-token', 'csrf_token', csrf_token_endpoint, methods=['GET'])

    # ── Health check (public, rate-limited) ───────────────────────────────
    @app.route('/health')
    def health_check():
        return {"status": "healthy", "message": "Obsidian API is running"}, 200

    # ── API connectivity test (public) ────────────────────────────────────
    @app.route('/api/test')
    def test_endpoint():
        return {"status": "ok", "message": "Backend is reachable"}, 200

    # ── Root info ─────────────────────────────────────────────────────────
    @app.route('/')
    def index():
        return {
            "name": "Obsidian API",
            "version": "1.0.0",
            "description": "AI Learning Companion Backend",
            "endpoints": {
                "auth":        "/api/auth",
                "user":        "/api/user",
                "quiz":        "/api/quiz",
                "tutor":       "/api/tutor",
                "mindmap":     "/api/mindmap",
                "notes":       "/api/notes",
                "study":       "/api/study",
                "leaderboard": "/api/leaderboard",
            },
        }, 200

    # ── Suspicious request logger ──────────────────────────────────────────
    @app.after_request
    def log_suspicious(response):
        """Flag 4xx responses for monitoring."""
        if response.status_code in (401, 403, 429):
            audit_log(
                "SUSPICIOUS_REQUEST",
                status=response.status_code,
                path=request.path,
                method=request.method,
            )
        return response

    return app


if __name__ == '__main__':
    settings.validate(strict=False)

    app = create_app()
    print(f"[STARTING] Obsidian API on {settings.HOST}:{settings.PORT}")
    print(f"[CORS]     Allowed origins: {settings.CORS_ORIGINS}")
    print(f"[SECURITY] FLASK_DEBUG={settings.FLASK_DEBUG} | "
          f"FORCE_HTTPS={settings.FORCE_HTTPS} | "
          f"LOCKOUT={settings.LOCKOUT_MAX_ATTEMPTS} attempts / "
          f"{settings.LOCKOUT_DURATION_SECONDS}s")
    app.run(
        host=settings.HOST,
        port=settings.PORT,
        debug=settings.FLASK_DEBUG,
    )
