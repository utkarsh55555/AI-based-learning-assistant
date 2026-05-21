from flask import Blueprint, request
from controllers.mindmap_controller import MindMapController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

mindmap_bp = Blueprint('mindmap', __name__, url_prefix='/api/mindmap')

@mindmap_bp.route('/', methods=['POST'])
@require_auth
def create_mindmap():
    """Create a new mind map"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        title = data.get('title')
        topics = data.get('topics', [])
        
        if not title:
            return error_response("title is required")
        
        mindmap = MindMapController.create_mindmap(user_id, title, topics)
        
        return success_response(mindmap, "Mind map created successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@mindmap_bp.route('/generate', methods=['POST'])
@require_auth
def generate_mindmap():
    """Generate mind map using AI"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        topic = data.get('topic')
        
        if not topic:
            return error_response("topic is required")
        
        mindmap = MindMapController.generate_ai_mindmap(user_id, topic)
        
        return success_response(mindmap, "Mind map generated successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@mindmap_bp.route('/', methods=['GET'])
@require_auth
def get_mindmaps():
    """Get user's mind maps"""
    try:
        user_id = request.current_user.user.id
        mindmaps = MindMapController.get_user_mindmaps(user_id)
        
        return success_response(mindmaps)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@mindmap_bp.route('/<mindmap_id>', methods=['GET'])
@require_auth
def get_mindmap(mindmap_id):
    """Get mind map by ID"""
    try:
        mindmap = MindMapController.get_mindmap(mindmap_id)
        
        if mindmap:
            return success_response(mindmap)
        
        return error_response("Mind map not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@mindmap_bp.route('/<mindmap_id>', methods=['PUT'])
@require_auth
def update_mindmap(mindmap_id):
    """Update mind map"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        mindmap = MindMapController.update_mindmap(mindmap_id, user_id, data)
        
        return success_response(mindmap, "Mind map updated successfully")
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@mindmap_bp.route('/<mindmap_id>', methods=['DELETE'])
@require_auth
def delete_mindmap(mindmap_id):
    """Delete mind map"""
    try:
        user_id = request.current_user.user.id
        success = MindMapController.delete_mindmap(mindmap_id, user_id)
        
        if success:
            return success_response(message="Mind map deleted successfully")
        
        return error_response("Failed to delete mind map", status_code=400)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
