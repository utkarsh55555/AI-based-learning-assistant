from flask import Blueprint, request
from controllers.quiz_controller import QuizController
from middlewares.auth_middleware import require_auth
from utils.response import success_response, error_response

quiz_bp = Blueprint('quiz', __name__, url_prefix='/api/quiz')

@quiz_bp.route('/generate', methods=['POST'])
@require_auth
def generate_quiz():
    """Generate a new quiz using AI"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        topic = data.get('topic')
        difficulty = data.get('difficulty', 'medium')
        num_questions = data.get('num_questions', 5)
        
        if not topic:
            return error_response("topic is required")
        
        quiz = QuizController.generate_quiz(topic, difficulty, num_questions, user_id)
        
        return success_response(quiz, "Quiz generated successfully", 201)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@quiz_bp.route('/<quiz_id>', methods=['GET'])
@require_auth
def get_quiz(quiz_id):
    """Get quiz by ID"""
    try:
        quiz = QuizController.get_quiz(quiz_id)
        
        if quiz:
            return success_response(quiz)
        
        return error_response("Quiz not found", status_code=404)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@quiz_bp.route('/history', methods=['GET'])
@require_auth
def get_quiz_history():
    """Get user's quiz history"""
    try:
        user_id = request.current_user.user.id
        limit = request.args.get('limit', 10, type=int)
        
        quizzes = QuizController.get_user_quizzes(user_id, limit)
        
        return success_response(quizzes)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@quiz_bp.route('/<quiz_id>/submit', methods=['POST'])
@require_auth
def submit_quiz(quiz_id):
    """Submit quiz answers"""
    try:
        user_id = request.current_user.user.id
        data = request.get_json()
        
        answers = data.get('answers', {})
        time_taken = data.get('time_taken', 0)
        
        result = QuizController.submit_quiz(user_id, quiz_id, answers, time_taken)
        
        return success_response(result, "Quiz submitted successfully")
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@quiz_bp.route('/stats', methods=['GET'])
@require_auth
def get_quiz_stats():
    """Get quiz statistics"""
    try:
        user_id = request.current_user.user.id
        stats = QuizController.get_quiz_stats(user_id)
        
        return success_response(stats)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
