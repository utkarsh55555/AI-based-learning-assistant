"""
routes/auth_routes.py
======================
Authentication endpoints with:
  - Rate limiting  (flask-limiter)
  - Account lockout after repeated failures
  - Password strength enforcement
  - Input sanitization
  - CSRF exemption (login/signup use Bearer token workflow, not cookies)
  - Audit logging
"""

from flask import Blueprint, request, make_response
from controllers.auth_controller import AuthController
from middlewares.rate_limiter import login_limit, signup_limit
from middlewares.audit_logger import audit_log
from middlewares.csrf_middleware import csrf
from utils.response import success_response, error_response
from utils.validator import validate_required_fields, validate_email
from utils.sanitize import sanitize_string, validate_password_strength
from utils.lockout import check_lockout, record_failure, record_success
from config.settings import settings


def _no_cache(response):
    """Apply no-store cache headers — must be used on every auth response that contains tokens."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# ── Sign up ────────────────────────────────────────────────────────────────

@auth_bp.route('/signup', methods=['POST'])
@csrf.exempt
@signup_limit
def signup():
    """Register a new user with strong password enforcement."""
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body must be JSON", status_code=400)

        # Validate required fields
        errors = validate_required_fields(data, ['email', 'password', 'name'])
        if errors:
            return error_response("Validation failed", errors=errors, status_code=400)

        email    = sanitize_string(data['email']).lower()
        name     = sanitize_string(data['name'])
        password = data['password']  # Do NOT sanitize — preserve special chars

        # Email format
        if not validate_email(email):
            return error_response("Please enter a valid email address.", status_code=400)

        # Name length
        if not (2 <= len(name) <= 100):
            return error_response("Name must be between 2 and 100 characters", status_code=400)

        # Password strength
        pw_errors = validate_password_strength(password)
        if pw_errors:
            return error_response(
                "Password does not meet security requirements",
                errors={"password": pw_errors},
                status_code=400,
            )

        result = AuthController.signup(email, password, name)

        if result:
            session = result.get('session') if isinstance(result, dict) else None
            access_token  = session.get('access_token')  if isinstance(session, dict) else getattr(session, 'access_token',  None)
            refresh_token = session.get('refresh_token') if isinstance(session, dict) else getattr(session, 'refresh_token', None)

            user_obj = result.get('user', {})
            user_id  = user_obj.get('id')    if isinstance(user_obj, dict) else getattr(user_obj, 'id',    None)
            user_email = user_obj.get('email') if isinstance(user_obj, dict) else getattr(user_obj, 'email', None)

            audit_log("SIGNUP", email=email, user_id=user_id, status="success")

            resp = success_response({
                "user": {
                    "id": user_id,
                    "email": user_email,
                    "name": name,
                    "is_new_user": True,
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
            }, "User registered successfully", 201)
            return _no_cache(resp)

        audit_log("SIGNUP", email=email, status="failed")
        return error_response("Registration failed", status_code=400)

    except Exception as e:
        # Re-raise the user-friendly message from the controller
        err = str(e)
        audit_log("SIGNUP", email=data.get('email', ''), status="error", detail=err)
        return error_response(err if err else "Enter a valid email address.", status_code=400)


# ── Login ──────────────────────────────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
@csrf.exempt
@login_limit
def login():
    """
    Login with account lockout protection.

    After LOCKOUT_MAX_ATTEMPTS consecutive failures the account is locked
    for LOCKOUT_DURATION_SECONDS (default: 5 attempts / 15 min).
    """
    data = {}
    try:
        data = request.get_json() or {}

        errors = validate_required_fields(data, ['email', 'password'])
        if errors:
            return error_response("Validation failed", errors=errors, status_code=400)

        email    = sanitize_string(data['email']).lower()
        password = data['password']

        if not validate_email(email):
            return error_response("Please enter a valid email address.", status_code=400)

        # ── Lockout check BEFORE hitting Supabase ─────────────────────────
        lockout = check_lockout(email)
        if lockout["locked"]:
            audit_log("LOGIN_ATTEMPT", email=email, status="blocked_locked",
                      retry_after=lockout["retry_after"])
            return error_response(
                f"Account temporarily locked. Try again in {lockout['retry_after']} seconds.",
                status_code=429,
            )

        # ── Attempt authentication ─────────────────────────────────────────
        result = AuthController.login(email, password)

        if result:
            # Clear failure counter on success
            record_success(email)

            profile = result.get('profile') or {}
            session = result.get('session')
            if not session:
                return error_response("Login session could not be created", status_code=500)

            user_obj   = result.get('user', {})
            user_id    = user_obj.get('id')    if isinstance(user_obj, dict) else getattr(user_obj, 'id',    None)
            user_email = user_obj.get('email') if isinstance(user_obj, dict) else getattr(user_obj, 'email', None)
            access_token  = session.get('access_token')  if isinstance(session, dict) else getattr(session, 'access_token',  None)
            refresh_token = session.get('refresh_token') if isinstance(session, dict) else getattr(session, 'refresh_token', None)

            audit_log("LOGIN_SUCCESS", email=email, user_id=user_id)

            resp = success_response({
                "user": {
                    "id": user_id,
                    "email": user_email,
                    "name": profile.get('name'),
                    "role": profile.get('role', 'student'),
                    "avatar_url": profile.get('avatar_url'),
                    "total_xp": profile.get('total_xp', 0),
                    "current_streak": profile.get('current_streak', 0),
                    "is_new_user": profile.get('is_new_user', False),
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
            }, "Login successful")
            return _no_cache(resp)

        # Invalid credentials
        lockout_result = record_failure(email)
        remaining = max(0, settings.LOCKOUT_MAX_ATTEMPTS - lockout_result["attempts"])
        audit_log("LOGIN_FAILURE", email=email, attempts=lockout_result["attempts"])

        if lockout_result["locked"]:
            audit_log("ACCOUNT_LOCKED", email=email,
                      locked_for=lockout_result["retry_after"])
            return error_response(
                f"Account locked after too many failed attempts. "
                f"Try again in {lockout_result['retry_after']} seconds.",
                status_code=429,
            )

        msg = "No account found with this email, or the password is incorrect."
        if remaining > 0:
            msg += f" {remaining} attempt(s) remaining before lockout."
        return error_response(msg, status_code=401)

    except Exception as e:
        err = str(e)
        email_safe = sanitize_string(data.get('email', ''))
        audit_log("LOGIN_FAILURE", email=email_safe, status="exception", detail=err)
        return error_response(err if err else "No account found with this email. Please sign up first.", status_code=401)


# ── Logout ─────────────────────────────────────────────────────────────────

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout and audit the event."""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return error_response("No authorization header", status_code=401)

        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        AuthController.logout(token)

        audit_log("LOGOUT", status="success")
        return success_response(message="Logged out successfully")

    except Exception as e:
        return error_response("Logout failed", status_code=500)


# ── Current user ───────────────────────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user."""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return error_response("No authorization header", status_code=401)

        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        result = AuthController.get_current_user(token)

        if result:
            profile = result.get('profile') or {}
            user_obj   = result.get('user', {})
            user_id    = user_obj.get('id')    if isinstance(user_obj, dict) else getattr(user_obj, 'id',    None)
            user_email = user_obj.get('email') if isinstance(user_obj, dict) else getattr(user_obj, 'email', None)
            return success_response({
                "user": {
                    "id": user_id,
                    "email": user_email,
                    "name": profile.get('name'),
                    "role": profile.get('role', 'student'),
                    "avatar_url": profile.get('avatar_url', ''),
                    "total_xp": profile.get('total_xp', 0),
                    "current_streak": profile.get('current_streak', 0),
                    "is_new_user": profile.get('is_new_user', False),
                }
            })

        return error_response("User not found", status_code=404)

    except Exception as e:
        return error_response("Could not retrieve user", status_code=500)
