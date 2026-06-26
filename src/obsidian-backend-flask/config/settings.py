import os
import secrets
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from the backend directory
backend_dir = Path(__file__).parent.parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path, override=True)

class Settings:
    # Supabase - strip whitespace from values
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    
    # AI Provider (OpenRouter)
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"
    
    # ------------------------------------------------------------------ #
    #  SECURITY SETTINGS                                                    #
    # ------------------------------------------------------------------ #

    # CSRF
    CSRF_SECRET_KEY = os.getenv("CSRF_SECRET_KEY", secrets.token_hex(32))
    CSRF_TOKEN_EXPIRY_SECONDS = int(os.getenv("CSRF_TOKEN_EXPIRY_SECONDS", 3600))

    # Rate limiting
    RATE_LIMIT_LOGIN = os.getenv("RATE_LIMIT_LOGIN", "5 per minute")
    RATE_LIMIT_SIGNUP = os.getenv("RATE_LIMIT_SIGNUP", "3 per minute")
    RATE_LIMIT_API = os.getenv("RATE_LIMIT_API", "120 per minute")
    RATE_LIMIT_STORAGE_URI = os.getenv("RATE_LIMIT_STORAGE_URI", "memory://")

    # Account lockout
    LOCKOUT_MAX_ATTEMPTS = int(os.getenv("LOCKOUT_MAX_ATTEMPTS", 5))
    LOCKOUT_DURATION_SECONDS = int(os.getenv("LOCKOUT_DURATION_SECONDS", 900))  # 15 min

    # Field encryption key (Fernet) – must be 32 url-safe base64 bytes
    FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY", "")

    # Session / JWT
    JWT_EXPIRY_SECONDS = int(os.getenv("JWT_EXPIRY_SECONDS", 3600))

    # Audit log
    AUDIT_LOG_FILE = os.getenv("AUDIT_LOG_FILE", "audit.log")

    # ------------------------------------------------------------------ #
    
    # Server
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # CORS – in production set this to your actual frontend origin(s)
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")

    # Production HTTPS enforcement
    FORCE_HTTPS = os.getenv("FORCE_HTTPS", "False") == "True"
    
    @classmethod
    def validate(cls, strict: bool = False):
        """Validate that all required settings are present
        
        Args:
            strict: If True, raises error on missing vars. If False, only warns.
        """
        required = [
            ("SUPABASE_URL", cls.SUPABASE_URL),
            ("SUPABASE_ANON_KEY", cls.SUPABASE_ANON_KEY),
            ("OPENROUTER_API_KEY", cls.OPENROUTER_API_KEY),
        ]
        
        security_warnings = []
        if cls.SECRET_KEY == "dev-secret-key-change-in-production":
            security_warnings.append("SECRET_KEY is using insecure default!")
        if not cls.CSRF_SECRET_KEY:
            security_warnings.append("CSRF_SECRET_KEY is not set!")
        if cls.CORS_ORIGINS == "*":
            security_warnings.append("CORS_ORIGINS is set to '*' — restrict this in production!")
        if cls.FLASK_DEBUG and cls.FLASK_ENV == "production":
            security_warnings.append("FLASK_DEBUG is True in production!")

        for warning in security_warnings:
            print(f"[SECURITY WARNING] {warning}")

        missing = [name for name, value in required if not value]
        
        if missing:
            message = f"Missing required environment variables: {', '.join(missing)}"
            if strict:
                raise ValueError(message)
            else:
                print(f"[WARNING] {message}")
                print("[WARNING] Some features may not work without these variables.")
                print("[WARNING] Please add them to src/obsidian-backend-flask/.env")
        
        return True

settings = Settings()
