from flask import Blueprint, request
from controllers.notes_controller import NotesController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

notes_bp = Blueprint('notes', __name__, url_prefix='/api/notes')

@notes_bp.route('/', methods=['POST'])
@require_auth
def create_note():
    """Create a new note"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        title = data.get('title')
        content = data.get('content')
        tags = data.get('tags', [])
        subject = data.get('subject')
        
        if not title or not content:
            return error_response("title and content are required")
        
        note = NotesController.create_note(user_id, title, content, tags, subject)
        
        return success_response(note, "Note created successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/', methods=['GET'])
@require_auth
def get_notes():
    """Get user's notes"""
    try:
        user_id = request.current_user.user.id
        subject = request.args.get('subject')
        tag = request.args.get('tag')
        
        notes = NotesController.get_user_notes(user_id, subject, tag)
        
        return success_response(notes)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/<note_id>', methods=['GET'])
@require_auth
def get_note(note_id):
    """Get note by ID"""
    try:
        note = NotesController.get_note(note_id)
        
        if note:
            return success_response(note)
        
        return error_response("Note not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/<note_id>', methods=['PUT'])
@require_auth
def update_note(note_id):
    """Update note"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        note = NotesController.update_note(note_id, user_id, data)
        
        return success_response(note, "Note updated successfully")
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/<note_id>', methods=['DELETE'])
@require_auth
def delete_note(note_id):
    """Delete note"""
    try:
        user_id = request.current_user.user.id
        success = NotesController.delete_note(note_id, user_id)
        
        if success:
            return success_response(message="Note deleted successfully")
        
        return error_response("Failed to delete note", status_code=400)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/search', methods=['GET'])
@require_auth
def search_notes():
    """Search notes"""
    try:
        user_id = request.current_user.user.id
        search_term = request.args.get('q', '')
        
        if not search_term:
            return error_response("Search term (q) is required")
        
        notes = NotesController.search_notes(user_id, search_term)
        
        return success_response(notes)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@notes_bp.route('/generate', methods=['POST'])
@require_auth
def generate_notes():
    """Generate notes using AI"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        topic = data.get('topic')
        subject = data.get('subject')
        level = data.get('level', 'intermediate')
        
        if not topic:
            return error_response("topic is required")
        
        result = NotesController.generate_ai_notes(user_id, topic, subject, level)
        
        return success_response(result, "Notes generated successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
