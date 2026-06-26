"""
middlewares/input_sanitizer.py
================================
Request-body sanitization middleware.

Registers a before_request hook that automatically sanitizes all JSON
request bodies before they reach any route handler.

Usage in app.py:
    from middlewares.input_sanitizer import register_sanitizer
    register_sanitizer(app)

Routes may retrieve the already-sanitized body via request.get_json()
as normal — the hook patches request.data in place.
"""

import json
from flask import Flask, request
from utils.sanitize import sanitize_dict


# Fields that are allowed to contain limited HTML (e.g., note content)
# Add field names here if a route legitimately stores formatted text.
ALLOW_HTML_FIELDS = ["content", "description", "body"]


def register_sanitizer(app: Flask) -> None:
    """Attach the sanitizer hook to the Flask app."""

    @app.before_request
    def sanitize_request_body():
        """Strip HTML / XSS from all incoming JSON bodies."""
        content_type = request.content_type or ""
        if "application/json" not in content_type:
            return  # Only sanitize JSON bodies

        raw_data = request.get_data(as_text=True)
        if not raw_data:
            return

        try:
            parsed = json.loads(raw_data)
        except (ValueError, TypeError):
            return  # Malformed JSON — let route validators handle it

        if isinstance(parsed, dict):
            sanitized = sanitize_dict(parsed, allow_html_fields=ALLOW_HTML_FIELDS)
        elif isinstance(parsed, list):
            sanitized = [
                sanitize_dict(item, allow_html_fields=ALLOW_HTML_FIELDS)
                if isinstance(item, dict)
                else item
                for item in parsed
            ]
        else:
            return  # Scalar JSON — nothing to sanitize

        # Replace request data with sanitized version
        sanitized_bytes = json.dumps(sanitized).encode("utf-8")
        request._cached_data = sanitized_bytes  # type: ignore[attr-defined]
        request.environ["wsgi.input"] = __import__("io").BytesIO(sanitized_bytes)
        request.environ["CONTENT_LENGTH"] = str(len(sanitized_bytes))
