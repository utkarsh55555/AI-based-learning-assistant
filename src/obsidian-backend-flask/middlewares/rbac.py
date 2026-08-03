"""
middlewares/rbac.py
===================
Role-Based Access Control (RBAC) decorators.

Roles (lowest → highest privilege):
  guest   – unauthenticated / demo users
  student – default authenticated users
  teacher – can manage content / view all student progress
  admin   – full access, can manage roles

Usage:
    from middlewares.rbac import require_role

    @quiz_bp.route('/admin/all', methods=['GET'])
    @require_auth          # must authenticate first
    @require_role('admin') # then check role
    def admin_all_quizzes(): ...

Role storage:
  Roles are stored in the `user_profiles.role` column in Supabase.
  If the column is absent the user defaults to 'student'.
"""

from functools import wraps
from flask import request
from utils.response import error_response

# Ordered privilege levels (higher index = higher privilege)
ROLE_HIERARCHY = ["guest", "student", "teacher", "admin"]


def _get_role_level(role: str) -> int:
    """Return the numeric privilege level for a role string."""
    try:
        return ROLE_HIERARCHY.index(role.lower())
    except ValueError:
        return ROLE_HIERARCHY.index("student")  # unknown roles → student


def require_role(*required_roles: str):
    """
    Decorator that enforces one or more allowed roles.

    Must be used AFTER @require_auth so that request.current_user is populated.

    Examples:
        @require_role('admin')                 – admin only
        @require_role('teacher', 'admin')      – teacher or admin
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = getattr(request, 'current_user', None)
            if not current_user:
                return error_response("Authentication required", status_code=401)

            # Extract role from Supabase user metadata or profile
            user_obj = getattr(current_user, 'user', None)
            role = "student"  # safe default

            if user_obj:
                # Try app_metadata first (set server-side, trusted)
                app_meta = getattr(user_obj, 'app_metadata', {}) or {}
                user_meta = getattr(user_obj, 'user_metadata', {}) or {}

                role = (
                    app_meta.get('role')
                    or user_meta.get('role')
                    or "student"
                )

            # Also check request context if the profile was loaded into it
            profile = getattr(request, 'user_profile', {}) or {}
            role = profile.get('role', role)

            # Check against required roles
            user_level = _get_role_level(role)
            allowed_levels = [_get_role_level(r) for r in required_roles]

            if user_level not in allowed_levels and not any(
                user_level >= lvl for lvl in allowed_levels
                if r == 'admin'
                for r in required_roles
            ):
                # Simpler exact-match check
                if role not in required_roles:
                    return error_response(
                        f"Access denied. Required role(s): {', '.join(required_roles)}",
                        status_code=403,
                    )

            return f(*args, **kwargs)

        return decorated_function
    return decorator


def require_minimum_role(minimum_role: str):
    """
    Decorator that allows access if the user's role is >= minimum_role
    in the privilege hierarchy.

    Example:
        @require_minimum_role('teacher')  – teacher AND admin can access
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = getattr(request, 'current_user', None)
            if not current_user:
                return error_response("Authentication required", status_code=401)

            user_obj = getattr(current_user, 'user', None)
            role = "student"
            if user_obj:
                app_meta = getattr(user_obj, 'app_metadata', {}) or {}
                user_meta = getattr(user_obj, 'user_metadata', {}) or {}
                role = app_meta.get('role') or user_meta.get('role') or "student"

            profile = getattr(request, 'user_profile', {}) or {}
            role = profile.get('role', role)

            if _get_role_level(role) < _get_role_level(minimum_role):
                return error_response(
                    f"Access denied. Minimum required role: {minimum_role}",
                    status_code=403,
                )

            return f(*args, **kwargs)

        return decorated_function
    return decorator
