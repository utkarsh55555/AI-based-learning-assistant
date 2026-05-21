from flask import Blueprint, request
from controllers.auth_controller import AuthController
from utils.response import success_response, error_response
from utils.validator import validate_required_fields, validate_email

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        errors = validate_required_fields(data, ['email', 'password', 'name'])
        if errors:
            return error_response("Validation failed", errors=errors)
        
        # Validate email
        if not validate_email(data['email']):
            return error_response("Invalid email format")
        
        # Register user
        result = AuthController.signup(
            data['email'],
            data['password'],
            data['name']
        )
        
        if result:
            # Supabase signup may return a user without an active session (e.g. email confirmation required)
            session = result.get('session') if isinstance(result, dict) else None
            access_token = getattr(session, 'access_token', None) if session else None
            refresh_token = getattr(session, 'refresh_token', None) if session else None

            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": data['name'],
                    "is_new_user": True
                },
                "access_token": access_token,
                "refresh_token": refresh_token
            }, "User registered successfully", 201)
        
        return error_response("Registration failed", status_code=400)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        errors = validate_required_fields(data, ['email', 'password'])
        if errors:
            return error_response("Validation failed", errors=errors)
        
        # Login user
        result = AuthController.login(data['email'], data['password'])
        
        if result:
            # Safely handle case where profile might be None
            profile = result.get('profile') or {}
            session = result.get('session')
            if not session:
                return error_response("Login session not created", status_code=500)
            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": profile.get('name'),
                    "is_new_user": profile.get('is_new_user', False)
                },
                "access_token": session.access_token,
                "refresh_token": session.refresh_token
            }, "Login successful")
        
        return error_response("Invalid credentials", status_code=401)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return error_response("No authorization header", status_code=401)
        
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        
        AuthController.logout(token)
        return success_response(message="Logged out successfully")
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Get current user"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return error_response("No authorization header", status_code=401)
        
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        
        result = AuthController.get_current_user(token)
        
        if result:
            profile = result.get('profile', {})
            return success_response({
                "user": {
                    "id": result['user'].id,
                    "email": result['user'].email,
                    "name": profile.get('name'),
                    "avatar_url": profile.get('avatar_url'),
                    "total_xp": profile.get('total_xp', 0),
                    "current_streak": profile.get('current_streak', 0)
                }
            })
        
        return error_response("User not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
