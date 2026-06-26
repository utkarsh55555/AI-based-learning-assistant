from supabase_client import get_supabase, get_supabase_admin
from services.supabase_service import SupabaseService

class AuthController:
    @staticmethod
    def signup(email: str, password: str, name: str):
        """Register a new user"""
        try:
            # Create auth user
            supabase_client = get_supabase()
            auth_response = supabase_client.auth.sign_up({
                "email": email,
                "password": password
            })
            
            if auth_response.user:
                # Create user profile using admin client to bypass RLS
                # This is safe because we're on the server side and the user_id matches the authenticated user
                profile_data = {
                    "user_id": auth_response.user.id,
                    "email": email,
                    "name": name,
                    "total_xp": 0,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "is_new_user": True
                }
                
                # Use admin client to bypass RLS for initial profile creation
                # The service role key should bypass all RLS policies
                try:
                    SupabaseService.create_record("user_profiles", profile_data, use_admin=True)
                except Exception as profile_error:
                    # Log the full error for debugging
                    error_msg = str(profile_error)
                    print(f"[ERROR] Failed to create user profile: {error_msg}")
                    print(f"[DEBUG] User ID: {auth_response.user.id}")
                    print(f"[DEBUG] Profile data: {profile_data}")
                    # Re-raise with more context
                    raise Exception(
                        f"Failed to create user profile during signup: {error_msg}. "
                        f"Please verify that SUPABASE_SERVICE_KEY is set correctly in .env file."
                    ) from profile_error
                
                return {
                    "user": auth_response.user,
                    "session": auth_response.session,
                    "is_new_user": True
                }
            
            return None
            
        except Exception as e:
            raise Exception(f"Signup error: {str(e)}")
    
    @staticmethod
    def login(email: str, password: str):
        """Login user"""
        try:
            supabase_client = get_supabase()
            auth_response = supabase_client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if auth_response.user:
                # Get user profile
                profile = SupabaseService.get_record(
                    "user_profiles", 
                    auth_response.user.id, 
                    "user_id"
                )
                
                # Mark user as not new after first login
                if profile and profile.get("is_new_user"):
                    SupabaseService.update_record(
                        "user_profiles",
                        auth_response.user.id,
                        {"is_new_user": False},
                        "user_id"
                    )
                
                return {
                    "user": auth_response.user,
                    "session": auth_response.session,
                    "profile": profile
                }
            
            return None
            
        except Exception as e:
            error_msg = str(e)
            # Detect upstream connectivity issues (DNS, connection refused, etc.)
            connectivity_indicators = ['getaddrinfo', 'connection refused', 'name or service not known', 'timed out', 'unreachable']
            if any(indicator in error_msg.lower() for indicator in connectivity_indicators):
                print(f"[ERROR] Supabase connection failed during login: {error_msg}")
                raise Exception(
                    f"Login error: getaddrinfo failed - Supabase service is unreachable. "
                    f"Please check your SUPABASE_URL in .env or your internet connection."
                )
            raise Exception(f"Login error: {error_msg}")
    
    @staticmethod
    def logout(access_token: str):
        """Logout user"""
        try:
            supabase_client = get_supabase()
            supabase_client.auth.sign_out()
            return True
        except Exception as e:
            raise Exception(f"Logout error: {str(e)}")
    
    @staticmethod
    def get_current_user(access_token: str):
        """Get current user from token"""
        try:
            supabase_client = get_supabase()
            user = supabase_client.auth.get_user(access_token)
            if user:
                profile = SupabaseService.get_record(
                    "user_profiles",
                    user.user.id,
                    "user_id"
                )
                return {
                    "user": user.user,
                    "profile": profile
                }
            return None
        except Exception as e:
            raise Exception(f"Get user error: {str(e)}")
