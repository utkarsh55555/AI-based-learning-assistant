"""
middlewares/error_handler.py
=============================
Global error handlers.

In PRODUCTION:  generic messages only — no stack traces, no internal detail.
In DEVELOPMENT: full exception details logged to server console for debugging.
"""

import traceback
from flask import Flask
from config.settings import settings
from utils.response import error_response
from utils.validator import ValidationError


def register_error_handlers(app: Flask):
    """Register global error handlers on the Flask app."""

    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return error_response("Validation failed", errors=error.errors, status_code=400)

    @app.errorhandler(400)
    def handle_bad_request(error):
        return error_response("Bad request", status_code=400)

    @app.errorhandler(401)
    def handle_unauthorized(error):
        return error_response("Authentication required", status_code=401)

    @app.errorhandler(403)
    def handle_forbidden(error):
        return error_response("Access denied", status_code=403)

    @app.errorhandler(404)
    def handle_not_found(error):
        return error_response("Resource not found", status_code=404)

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        return error_response("Method not allowed", status_code=405)

    @app.errorhandler(429)
    def handle_rate_limit(error):
        return error_response(
            "Too many requests. Please slow down and try again later.",
            status_code=429,
        )

    @app.errorhandler(500)
    def handle_internal_error(error):
        _log_exception("500 Internal Server Error", error)
        return error_response("Internal server error", status_code=500)

    @app.errorhandler(Exception)
    def handle_exception(error):
        _log_exception("Unhandled exception", error)

        if settings.FLASK_DEBUG:
            # Only expose details in local dev
            return error_response(
                f"An error occurred: {str(error)}",
                status_code=500,
            )

        # Production: never expose internal details
        return error_response("An unexpected error occurred", status_code=500)


def _log_exception(label: str, error: Exception) -> None:
    """Log full exception to server console (NOT to the HTTP response)."""
    print(f"\n[ERROR] {label}: {type(error).__name__}: {str(error)}")
    if settings.FLASK_DEBUG:
        traceback.print_exc()
