from flask import Blueprint, request
from controllers.tutor_controller import TutorController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

tutor_bp = Blueprint('tutor', __name__, url_prefix='/api/tutor')

@tutor_bp.route('/chat', methods=['POST'])
@require_auth
def chat():
    """Chat with AI tutor"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        message = data.get('message')
        conversation_history = data.get('conversation_history', [])
        
        if not message:
            return error_response("message is required")
        
        result = TutorController.chat(user_id, message, conversation_history)
        
        return success_response(result)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@tutor_bp.route('/explain', methods=['POST'])
@require_auth
def explain():
    """Get explanation of a concept"""
    try:
        data = request.get_json()
        
        topic = data.get('topic')
        level = data.get('level', 'intermediate')
        
        if not topic:
            return error_response("topic is required")
        
        result = TutorController.explain_concept(topic, level)
        
        return success_response(result)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@tutor_bp.route('/history', methods=['GET'])
@require_auth
def get_history():
    """Get conversation history"""
    try:
        user_id = request.current_user.user.id
        limit = request.args.get('limit', 10, type=int)
        
        history = TutorController.get_conversation_history(user_id, limit)
        
        return success_response(history)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
