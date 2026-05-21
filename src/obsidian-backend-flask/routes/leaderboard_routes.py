from flask import Blueprint, request
from controllers.leaderboard_controller import LeaderboardController
from middlewares.auth_middleware import require_auth, optional_auth
from utils.response import success_response, error_response

leaderboard_bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')

@leaderboard_bp.route('/global', methods=['GET'])
@optional_auth
def get_global_leaderboard():
    """Get global leaderboard"""
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        leaderboard = LeaderboardController.get_global_leaderboard(limit, offset)
        
        return success_response(leaderboard)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@leaderboard_bp.route('/streak', methods=['GET'])
@optional_auth
def get_streak_leaderboard():
    """Get streak leaderboard"""
    try:
        limit = request.args.get('limit', 100, type=int)
        
        leaderboard = LeaderboardController.get_streak_leaderboard(limit)
        
        return success_response(leaderboard)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@leaderboard_bp.route('/rank', methods=['GET'])
@require_auth
def get_user_rank():
    """Get user's rank"""
    try:
        user_id = request.current_user.user.id
        rank = LeaderboardController.get_user_rank(user_id)
        
        return success_response(rank)
        
    except Exception as e:
        return error_response(str(e), status_code=500)

@leaderboard_bp.route('/subject/<subject>', methods=['GET'])
@optional_auth
def get_subject_leaderboard(subject):
    """Get subject-specific leaderboard"""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        leaderboard = LeaderboardController.get_subject_leaderboard(subject, limit)
        
        return success_response(leaderboard)
        
    except Exception as e:
        return error_response(str(e), status_code=500)
