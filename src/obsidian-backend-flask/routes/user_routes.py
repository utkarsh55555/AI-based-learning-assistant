from flask import Blueprint, request
from controllers.user_controller import UserController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get user profile"""
    try:
        user_id = request.current_user.user.id
        profile = UserController.get_profile(user_id)
        
        if profile:
            return success_response(profile)
        
        return error_response("Profile not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile():
    """Update user profile"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        profile = UserController.update_profile(user_id, data)
        
        if profile:
            return success_response(profile, "Profile updated successfully")
        
        return error_response("Profile update failed", status_code=400)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@user_bp.route('/dashboard', methods=['GET'])
@require_auth
def get_dashboard():
    """Get dashboard data"""
    try:
        user_id = request.current_user.user.id
        stats = UserController.get_dashboard_stats(user_id)
        
        return success_response(stats)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@user_bp.route('/activity', methods=['POST'])
@require_auth
def record_activity():
    """Record user activity"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        activity_type = data.get('activity_type')
        details = data.get('details', {})
        
        if not activity_type:
            return error_response("activity_type is required")
        
        result = UserController.record_activity(user_id, activity_type, details)
        
        return success_response(result, "Activity recorded")
        
    except Exception as e:
        return error_response(str(e), status_code=500)
