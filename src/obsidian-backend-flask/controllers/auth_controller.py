import jwt
import time
from werkzeug.security import generate_password_hash, check_password_hash
from services.mongo_service import MongoService
from config.settings import settings
import uuid


class AuthController:
    @staticmethod
    def signup(email: str, password: str, name: str):
        """Register a new user in MongoDB."""
        email = email.lower().strip()
        
        # Check if user exists
        existing = MongoService.get_records("user_profiles", {"email": email}, limit=1)
        if existing:
            raise Exception("An account with this email already exists. Please log in instead.")
            
        # Hash password and create user
        hashed_password = generate_password_hash(password)
        
        # Generate a unique string for user_id similar to Supabase UUID
        user_id = str(uuid.uuid4())
        
        profile_data = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "password": hashed_password,
            "total_xp": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "is_new_user": True
        }
        
        try:
            profile = MongoService.create_record("user_profiles", profile_data)
        except Exception as e:
            raise Exception(f"Failed to create user profile during signup: {str(e)}")
            
        session_token = AuthController._generate_token(user_id)
        
        # Return mock user/session objects matching the frontend's expected structure
        user = {"id": user_id, "email": email}
        session = {"access_token": session_token, "user": user}
        
        return {
            "user": user,
            "session": session,
            "is_new_user": True
        }

    @staticmethod
    def login(email: str, password: str):
        """Login user."""
        email = email.lower().strip()
        
        existing = MongoService.get_records("user_profiles", {"email": email}, limit=1)
        if not existing:
            raise Exception("No account found with this email. Please sign up first.")
            
        profile = existing[0]
        
        # Check password
        if "password" not in profile or not check_password_hash(profile["password"], password):
            raise Exception("Invalid credentials.")
            
        # Mark user as not new after first login
        if profile.get("is_new_user"):
            profile = MongoService.update_record("user_profiles", profile["_id"], {"is_new_user": False}, id_column="_id")
            
        # Hide password hash from return data
        profile_safe = {k: v for k, v in profile.items() if k != "password"}
        
        user_id = profile["user_id"]
        session_token = AuthController._generate_token(user_id)
        
        user = {"id": user_id, "email": email}
        session = {"access_token": session_token, "user": user}
        
        return {
            "user": user,
            "session": session,
            "profile": profile_safe
        }

    @staticmethod
    def logout(access_token: str):
        """Logout user (client-side clears token, stateless backend)."""
        return True

    @staticmethod
    def get_current_user(access_token: str):
        """Get current user from token."""
        try:
            payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("sub")
            if not user_id:
                return None
                
            existing = MongoService.get_records("user_profiles", {"user_id": user_id}, limit=1)
            if not existing:
                return None
                
            profile = existing[0]
            profile_safe = {k: v for k, v in profile.items() if k != "password"}
            
            user = {"id": user_id, "email": profile["email"]}
            
            return {
                "user": user,
                "profile": profile_safe
            }
        except jwt.ExpiredSignatureError:
            raise Exception("Session expired. Please log in again.")
        except jwt.InvalidTokenError:
            raise Exception("Invalid session token.")
        except Exception as e:
            raise Exception(f"Get user error: {str(e)}")
            
    @staticmethod
    def _generate_token(user_id: str) -> str:
        payload = {
            "sub": user_id,
            "iat": int(time.time()),
            "exp": int(time.time()) + settings.JWT_EXPIRY_SECONDS
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
