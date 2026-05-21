from flask import Flask, request
from flask_cors import CORS
from config.settings import settings

def create_app():
    """Create and configure Flask app"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = settings.SECRET_KEY
    
    # Enable CORS
    cors_origins = settings.CORS_ORIGINS
    if cors_origins == "*":
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        origins_list = [origin.strip() for origin in cors_origins.split(",")] if cors_origins else ["*"]
        CORS(app, resources={r"/api/*": {"origins": origins_list}})
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {"status": "healthy", "message": "Obsidian API is running"}, 200
    
    # Test endpoint
    @app.route('/api/test')
    def test_endpoint():
        return {"status": "ok", "message": "Backend is reachable"}, 200
    
    # Mock auth endpoints
    @app.route('/api/auth/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            email = data.get('email', '')
            password = data.get('password', '')
            
            # Mock successful login
            mock_user = {
                "id": f"mock_{hash(email) % 10000}",
                "email": email,
                "name": email.split('@')[0] if '@' in email else 'User'
            }
            
            return {
                "success": True,
                "data": {
                    "user": mock_user,
                    "session": {"access_token": "mock_token", "user": mock_user},
                    "is_new_user": False
                }
            }, 200
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/api/auth/signup', methods=['POST'])
    def signup():
        try:
            data = request.get_json()
            email = data.get('email', '')
            password = data.get('password', '')
            name = data.get('name', '')
            
            # Mock successful signup
            mock_user = {
                "id": f"mock_{hash(email) % 10000}",
                "email": email,
                "name": name
            }
            
            return {
                "success": True,
                "data": {
                    "user": mock_user,
                    "session": {"access_token": "mock_token", "user": mock_user},
                    "is_new_user": True
                }
            }, 200
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    # Mock chat endpoint
    @app.route('/api/tutor/chat', methods=['POST'])
    def chat():
        try:
            data = request.get_json()
            message = data.get('message', '')
            
            # Mock chat response
            mock_response = f"This is a mock response to: '{message}'. The backend is working but using mock AI responses for testing."
            
            return {
                "success": True,
                "data": {
                    "response": mock_response,
                    "timestamp": "2026-04-14T22:53:00Z"
                }
            }, 200
        except Exception as e:
            return {"success": False, "error": str(e)}, 500
    
    @app.route('/')
    def index():
        return {
            "name": "Obsidian API (Simple Mode)",
            "version": "1.0.0",
            "description": "AI Learning Companion Backend - Simple Mode (No Supabase)",
            "endpoints": {
                "auth": "/api/auth",
                "tutor": "/api/tutor",
                "test": "/api/test",
                "health": "/health"
            }
        }, 200
    
    return app

if __name__ == '__main__':
    print("[INFO] Starting simple backend (no Supabase)")
    print("[INFO] This backend works without external dependencies")
    
    app = create_app()
    print(f"[STARTING] Obsidian API on {settings.HOST}:{settings.PORT}")
    print(f"[CORS] Enabled for: {settings.CORS_ORIGINS}")
    app.run(
        host=settings.HOST,
        port=settings.PORT,
        debug=settings.FLASK_DEBUG
    )
