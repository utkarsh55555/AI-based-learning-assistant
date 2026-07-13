from supabase_client import get_supabase, get_supabase_admin
from services.supabase_service import SupabaseService


def _translate_supabase_error(error_msg: str, context: str = 'auth') -> str:
    """
    Translate raw Supabase / HTTP error messages into clear, user-facing strings.
    Supabase error messages are often internal; we map the common ones here.
    """
    msg = error_msg.lower()

    # ── Email problems ──────────────────────────────────────────────────────
    if any(k in msg for k in ['invalid email', 'email address', 'unable to validate email',
                               'email is invalid', 'email format', 'not a valid email']):
        return "Enter a valid email address."

    # ── Email already taken ──────────────────────────────────────────────────
    if any(k in msg for k in ['user already registered', 'already exists', 'email already',
                               'duplicate', 'unique constraint']):
        return "An account with this email already exists. Please log in instead."

    # ── User not found / wrong credentials ──────────────────────────────────
    if any(k in msg for k in ['invalid login credentials', 'invalid credentials',
                               'user not found', 'no user found', 'email not confirmed',
                               'invalid password', 'wrong password']):
        if context == 'login':
            return "No account found with this email, or the password is incorrect. Please sign up if you don't have an account."
        return "Invalid credentials."

    # ── Connectivity ──────────────────────────────────────────────────────────
    if any(k in msg for k in ['getaddrinfo', 'connection refused',
                               'name or service not known', 'timed out', 'unreachable']):
        return "Cannot reach the authentication server. Please check your internet connection or use Google Login."

    # ── Rate limiting ─────────────────────────────────────────────────────────
    if any(k in msg for k in ['rate limit', 'too many requests', 'over_email_send_rate_limit']):
        return "Too many attempts. Please wait a moment and try again."

    # ── Fallback — return a clean message without internal details ────────────
    return None  # caller will use its own default


class AuthController:
    @staticmethod
    def signup(email: str, password: str, name: str):
        """Register a new user (email/password — kept for backend compatibility but not exposed in UI)."""
        try:
            supabase_client = get_supabase()
            auth_response = supabase_client.auth.sign_up({
                "email": email,
                "password": password
            })

            if auth_response.user:
                profile_data = {
                    "user_id": auth_response.user.id,
                    "email": email,
                    "name": name,
                    "total_xp": 0,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "is_new_user": True
                }

                try:
                    SupabaseService.create_record("user_profiles", profile_data, use_admin=True)
                except Exception as profile_error:
                    error_msg = str(profile_error)
                    print(f"[ERROR] Failed to create user profile: {error_msg}")
                    print(f"[DEBUG] User ID: {auth_response.user.id}")
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
            raw = str(e)
            friendly = _translate_supabase_error(raw, context='signup')
            raise Exception(friendly or "Enter a valid email address.")

    @staticmethod
    def login(email: str, password: str):
        """
        Login user.

        Checks Supabase auth. If credentials are wrong, translates the error into
        a clear message: distinguishes 'user not found → please sign up' from
        'wrong password → try again'.
        """
        try:
            supabase_client = get_supabase()
            auth_response = supabase_client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            if auth_response.user:
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
            raw = str(e)
            friendly = _translate_supabase_error(raw, context='login')
            raise Exception(
                friendly or
                "No account found with this email. Please sign up first."
            )

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
        """
        Get current user from token.

        Handles both email/password and Google OAuth users.
        If the user does not yet have a user_profiles record (first Google OAuth login),
        one is automatically created using the data from their Google account.
        """
        try:
            supabase_client = get_supabase()
            user_response = supabase_client.auth.get_user(access_token)
            if not user_response or not user_response.user:
                return None

            user = user_response.user

            # Try to fetch existing profile
            profile = SupabaseService.get_record(
                "user_profiles",
                user.id,
                "user_id"
            )

            # ── Auto-create profile for Google OAuth users (first login) ──
            if not profile:
                meta = user.user_metadata or {}
                full_name = (
                    meta.get('full_name') or
                    meta.get('name') or
                    (user.email.split('@')[0] if user.email else 'User')
                )
                email = user.email or ''

                profile_data = {
                    "user_id": user.id,
                    "email": email,
                    "name": full_name,
                    "avatar_url": meta.get('avatar_url') or meta.get('picture') or '',
                    "total_xp": 0,
                    "current_streak": 0,
                    "longest_streak": 0,
                    "is_new_user": True
                }

                try:
                    SupabaseService.create_record("user_profiles", profile_data, use_admin=True)
                    profile = profile_data
                    print(f"[INFO] Auto-created user_profile for Google OAuth user: {user.id} ({email})")
                except Exception as profile_error:
                    print(f"[WARN] Could not auto-create profile for {user.id}: {profile_error}")
                    profile = profile_data

            return {
                "user": user,
                "profile": profile
            }
        except Exception as e:
            raise Exception(f"Get user error: {str(e)}")
