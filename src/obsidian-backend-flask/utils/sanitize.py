"""
utils/sanitize.py
=================
HTML / XSS sanitization helpers.

Uses `bleach` to strip all HTML tags and attributes from untrusted strings
so they are safe to store and return in JSON responses.
"""

import re
import bleach
from markupsafe import escape as html_escape


# Tags and attributes allowed in rich-text fields (e.g., note content).
# Keep this list as narrow as possible.
ALLOWED_TAGS: list[str] = []          # empty = strip everything
ALLOWED_ATTRIBUTES: dict = {}         # empty = strip all attributes


def sanitize_string(value: str, allow_html: bool = False) -> str:
    """
    Sanitize a plain string input.

    - Strips leading/trailing whitespace.
    - Removes null bytes and control characters (except newlines/tabs).
    - Strips all HTML tags unless allow_html=True.

    Args:
        value:      The raw string from user input.
        allow_html: If True, allow a whitelist of safe tags (see ALLOWED_TAGS).

    Returns:
        Sanitized string.
    """
    if not isinstance(value, str):
        return value

    # Strip null bytes & non-printable control chars (keep \n \r \t)
    value = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', value)

    # Strip or clean HTML
    if allow_html:
        value = bleach.clean(
            value,
            tags=ALLOWED_TAGS,
            attributes=ALLOWED_ATTRIBUTES,
            strip=True,
        )
    else:
        value = bleach.clean(value, tags=[], attributes={}, strip=True)

    return value.strip()


def sanitize_dict(data: dict, allow_html_fields: list[str] | None = None) -> dict:
    """
    Recursively sanitize all string values in a dict.

    Args:
        data:             Dict of user-supplied data (e.g., request.get_json()).
        allow_html_fields: List of field names that may contain limited HTML.

    Returns:
        New dict with all strings sanitized.
    """
    allow_html_fields = allow_html_fields or []
    result = {}
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = sanitize_string(value, allow_html=key in allow_html_fields)
        elif isinstance(value, dict):
            result[key] = sanitize_dict(value, allow_html_fields)
        elif isinstance(value, list):
            result[key] = [
                sanitize_string(v, allow_html=key in allow_html_fields)
                if isinstance(v, str)
                else v
                for v in value
            ]
        else:
            result[key] = value
    return result


def validate_password_strength(password: str) -> list[str]:
    """
    Return a list of unmet password requirements.
    An empty list means the password is acceptable.
    """
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        errors.append("Password must contain at least one special character.")
    return errors


def escape_output(value: str) -> str:
    """HTML-escape a string for safe embedding in HTML contexts."""
    return str(html_escape(value))
