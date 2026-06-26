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

from flask import Blueprint, request
from controllers.auth_controller import AuthController
from middlewares.rate_limiter import login_limit, signup_limit
from middlewares.audit_logger import audit_log
from middlewares.csrf_middleware import csrf
from utils.response import success_response, error_response
from utils.validator import validate_required_fields, validate_email
from utils.sanitize import sanitize_string, validate_password_strength
from utils.lockout import check_lockout, record_failure, record_success

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
            return error_response("Invalid email format", status_code=400)

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
            access_token  = getattr(session, 'access_token',  None) if session else None
            refresh_token = getattr(session, 'refresh_token', None) if session else None

            audit_log("SIGNUP", email=email, user_id=result['user'].id, status="success")

            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": name,
                    "is_new_user": True,
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
            }, "User registered successfully", 201)

        audit_log("SIGNUP", email=email, status="failed")
        return error_response("Registration failed", status_code=400)

    except Exception as e:
        audit_log("SIGNUP", email=data.get('email', ''), status="error", detail=str(e))
        return error_response("Registration failed. Please try again.", status_code=500)


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
            return error_response("Invalid email format", status_code=400)

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

            audit_log("LOGIN_SUCCESS", email=email, user_id=result['user'].id)

            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": profile.get('name'),
                    "role": profile.get('role', 'student'),
                    "is_new_user": profile.get('is_new_user', False),
                },
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
            }, "Login successful")

        # Invalid credentials
        lockout_result = record_failure(email)
        remaining = max(0, 5 - lockout_result["attempts"])
        audit_log("LOGIN_FAILURE", email=email, attempts=lockout_result["attempts"])

        if lockout_result["locked"]:
            audit_log("ACCOUNT_LOCKED", email=email,
                      locked_for=lockout_result["retry_after"])
            return error_response(
                f"Account locked after too many failed attempts. "
                f"Try again in {lockout_result['retry_after']} seconds.",
                status_code=429,
            )

        msg = "Invalid credentials."
        if remaining > 0:
            msg += f" {remaining} attempt(s) remaining before lockout."
        return error_response(msg, status_code=401)

    except Exception as e:
        # Don't leak internal errors to the client
        email_safe = sanitize_string(data.get('email', ''))
        audit_log("LOGIN_FAILURE", email=email_safe, status="exception", detail=str(e))
        return error_response("Login failed. Please try again.", status_code=500)


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
            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": profile.get('name'),
                    "role": profile.get('role', 'student'),
                    "avatar_url": profile.get('avatar_url'),
                    "total_xp": profile.get('total_xp', 0),
                    "current_streak": profile.get('current_streak', 0),
                }
            })

        return error_response("User not found", status_code=404)

    except Exception as e:
        return error_response("Could not retrieve user", status_code=500)
