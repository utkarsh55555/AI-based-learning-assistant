from flask import Flask
from flask_cors import CORS
from config.settings import settings
from middlewares.error_handler import register_error_handlers

# Import routes
from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.quiz_routes import quiz_bp
from routes.tutor_routes import tutor_bp
from routes.mindmap_routes import mindmap_bp
from routes.notes_routes import notes_bp
from routes.study_routes import study_bp
from routes.leaderboard_routes import leaderboard_bp

def create_app():
    """Create and configure Flask app"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = settings.SECRET_KEY
    
    # Enable CORS
    # Handle CORS_ORIGINS - if it's "*", allow all origins, otherwise parse as comma-separated list
    cors_origins = settings.CORS_ORIGINS
    if cors_origins == "*":
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    else:
        # Parse comma-separated origins
        origins_list = [origin.strip() for origin in cors_origins.split(",")] if cors_origins else ["*"]
        CORS(app, resources={r"/api/*": {"origins": origins_list}})
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(tutor_bp)
    app.register_blueprint(mindmap_bp)
    app.register_blueprint(notes_bp)
    app.register_blueprint(study_bp)
    app.register_blueprint(leaderboard_bp)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {"status": "healthy", "message": "Obsidian API is running"}, 200
    
    # Test endpoint for debugging
    @app.route('/api/test')
    def test_endpoint():
        return {"status": "ok", "message": "Backend is reachable"}, 200
    
    # Debug endpoint to check auth headers
    @app.route('/api/debug/auth')
    def debug_auth():
        auth_header = request.headers.get('Authorization')
        return {
            "auth_header": auth_header,
            "has_auth": bool(auth_header),
            "headers": dict(request.headers)
        }, 200
    
    # Debug endpoint to check Supabase connection
    @app.route('/debug/supabase-test')
    def debug_supabase_test():
        """Test Supabase connection without admin operations"""
        try:
            from supabase_client import get_supabase
            from config.settings import settings
            
            client = get_supabase()
            
            return {
                "status": "success",
                "message": "Supabase client created successfully",
                "supabase_url": settings.SUPABASE_URL[:30] + "..." if settings.SUPABASE_URL else None,
                "anon_key_set": bool(settings.SUPABASE_ANON_KEY),
                "service_key_set": bool(settings.SUPABASE_SERVICE_KEY)
            }, 200
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "supabase_url": settings.SUPABASE_URL[:30] + "..." if settings.SUPABASE_URL else None,
                "anon_key_set": bool(settings.SUPABASE_ANON_KEY),
                "service_key_set": bool(settings.SUPABASE_SERVICE_KEY)
            }, 500
    
    @app.route('/')
    def index():
        return {
            "name": "Obsidian API",
            "version": "1.0.0",
            "description": "AI Learning Companion Backend",
            "endpoints": {
                "auth": "/api/auth",
                "user": "/api/user",
                "quiz": "/api/quiz",
                "tutor": "/api/tutor",
                "mindmap": "/api/mindmap",
                "notes": "/api/notes",
                "study": "/api/study",
                "leaderboard": "/api/leaderboard"
            }
        }, 200
    
    return app

if __name__ == '__main__':
    # Skip validation in development to allow server to start without Supabase
    try:
        print("[INFO] Skipping configuration validation in development mode")
        print("[INFO] Backend will start, but some features may not work without proper configuration")
    except Exception as e:
        print(f"[ERROR] Configuration error: {e}")
        exit(1)
    
    # Create and run app
    app = create_app()
    print(f"[STARTING] Obsidian API on {settings.HOST}:{settings.PORT}")
    print(f"[CORS] Enabled for: {settings.CORS_ORIGINS}")
    app.run(
        host=settings.HOST,
        port=settings.PORT,
        debug=settings.FLASK_DEBUG
    )
