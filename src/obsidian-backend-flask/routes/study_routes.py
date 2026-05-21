from flask import Blueprint, request
from controllers.study_controller import StudyController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

study_bp = Blueprint('study', __name__, url_prefix='/api/study')

@study_bp.route('/plan', methods=['POST'])
@require_auth
def create_study_plan():
    """Create a study plan"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        subject = data.get('subject')
        duration_weeks = data.get('duration_weeks', 4)
        current_level = data.get('current_level', 'intermediate')
        
        if not subject:
            return error_response("subject is required")
        
        plan = StudyController.create_study_plan(user_id, subject, duration_weeks, current_level)
        
        return success_response(plan, "Study plan created successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@study_bp.route('/plan/<plan_id>', methods=['GET'])
@require_auth
def get_study_plan(plan_id):
    """Get study plan by ID"""
    try:
        plan = StudyController.get_study_plan(plan_id)
        
        if plan:
            return success_response(plan)
        
        return error_response("Study plan not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@study_bp.route('/plans', methods=['GET'])
@require_auth
def get_study_plans():
    """Get user's study plans"""
    try:
        user_id = request.current_user.user.id
        plans = StudyController.get_user_study_plans(user_id)
        
        return success_response(plans)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@study_bp.route('/plan/<plan_id>/progress', methods=['PUT'])
@require_auth
def update_progress(plan_id):
    """Update study plan progress"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        progress = data.get('progress', 0)
        
        plan = StudyController.update_study_plan_progress(plan_id, user_id, progress)
        
        return success_response(plan, "Progress updated successfully")
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@study_bp.route('/session', methods=['POST'])
@require_auth
def create_session():
    """Record a study session"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        duration_minutes = data.get('duration_minutes')
        subject = data.get('subject')
        notes = data.get('notes')
        
        if not duration_minutes:
            return error_response("duration_minutes is required")
        
        session = StudyController.create_study_session(user_id, duration_minutes, subject, notes)
        
        return success_response(session, "Study session recorded", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@study_bp.route('/stats', methods=['GET'])
@require_auth
def get_study_stats():
    """Get study statistics"""
    try:
        user_id = request.current_user.user.id
        days = request.args.get('days', 7, type=int)
        
        stats = StudyController.get_study_stats(user_id, days)
        
        return success_response(stats)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
