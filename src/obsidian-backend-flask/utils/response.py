from flask import jsonify
from typing import Any, Optional

def success_response(data: Any = None, message: str = "Success", status_code: int = 200):
    """Standard success response"""
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    return jsonify(response), status_code

def error_response(message: str = "Error", errors: Optional[dict] = None, status_code: int = 400):
    """Standard error response"""
    response = {
        "success": False,
        "message": message,
        "errors": errors
    }
    return jsonify(response), status_code

def paginated_response(data: list, page: int, per_page: int, total: int, message: str = "Success"):
    """Paginated response"""
    response = {
        "success": True,
        "message": message,
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "pages": (total + per_page - 1) // per_page
        }
    }
    return jsonify(response), 200
