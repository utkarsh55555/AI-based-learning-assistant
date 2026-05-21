import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from the backend directory
backend_dir = Path(__file__).parent.parent
env_path = backend_dir / ".env"
load_dotenv(dotenv_path=env_path)

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
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True") == "True"
    
    # Server
    PORT = int(os.getenv("PORT", 5000))
    HOST = os.getenv("HOST", "0.0.0.0")
    
    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
    
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
