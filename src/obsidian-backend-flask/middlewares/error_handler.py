from flask import Flask
from utils.response import error_response
from utils.validator import ValidationError

def register_error_handlers(app: Flask):
    """Register global error handlers"""
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        return error_response("Validation failed", errors=error.errors, status_code=400)
    
    @app.errorhandler(404)
    def handle_not_found(error):
        return error_response("Resource not found", status_code=404)
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        return error_response("Internal server error", status_code=500)
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        # Log error here
        print(f"Unhandled exception: {str(error)}")
        return error_response(f"An error occurred: {str(error)}", status_code=500)
