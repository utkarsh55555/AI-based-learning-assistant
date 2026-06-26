from supabase import create_client, Client
from config.settings import settings

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise ValueError(
            "Supabase credentials not configured. "
            "Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file."
        )
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_supabase_admin_client() -> Client:
    """Get Supabase admin client with service key"""
    if not settings.SUPABASE_URL:
        raise ValueError(
            "Supabase admin credentials not configured: SUPABASE_URL is missing. "
            "Please set SUPABASE_URL in src/obsidian-backend-flask/.env file."
        )
    if not settings.SUPABASE_SERVICE_KEY:
        raise ValueError(
            "Supabase admin credentials not configured: SUPABASE_SERVICE_KEY is missing or empty. "
            "Please set SUPABASE_SERVICE_KEY (service_role key) in src/obsidian-backend-flask/.env file."
        )

    # Debug: print a short preview of the configured keys so we can verify at runtime.
    # This is safe for development logs because it only shows a prefix, not the full key.
    try:
        anon_preview = (settings.SUPABASE_ANON_KEY or "None")[:20]
        service_preview = (settings.SUPABASE_SERVICE_KEY or "None")[:20]
        print(f"[SUPABASE DEBUG] SUPABASE_URL: {settings.SUPABASE_URL}")
        print(f"[SUPABASE DEBUG] ANON KEY PREFIX: {anon_preview}")
        print(f"[SUPABASE DEBUG] SERVICE KEY PREFIX: {service_preview}")
    except Exception:
        # Debug output should never break startup
        pass

    # Verify the service key looks valid (accepts both legacy JWT 'eyJ' and new 'sb_secret_' format)
    valid_prefixes = ('eyJ', 'sb_secret_')
    if not settings.SUPABASE_SERVICE_KEY.startswith(valid_prefixes):
        raise ValueError(
            "SUPABASE_SERVICE_KEY appears to be invalid. "
            "Service role keys should start with 'eyJ' (legacy JWT) or 'sb_secret_' (new format). "
            "Make sure you're using the 'service_role' / 'secret' key from Supabase Project Settings → API Keys."
        )

    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Run a lightweight sanity check so we fail fast if the service key cannot access the database.
    try:
        # This will succeed even on an empty table; it only verifies permissions.
        client.table("user_profiles").select("*", count="exact").limit(1).execute()
        print("[SUPABASE DEBUG] Admin client test query to 'user_profiles' succeeded.")
    except Exception as e:
        raise ValueError(
            "Supabase admin client could not access 'user_profiles'. "
            "This usually means SUPABASE_SERVICE_KEY is wrong, RLS policies are too strict, "
            "or the table does not exist. Original error: " + str(e)
        )

    return client

# Global client instances (lazy initialization)
supabase = None
supabase_admin = None

def get_supabase():
    """Get or create Supabase client instance"""
    global supabase
    if supabase is None:
        supabase = get_supabase_client()
    return supabase

def get_supabase_admin():
    """Get or create Supabase admin client instance"""
    global supabase_admin
    if supabase_admin is None:
        supabase_admin = get_supabase_admin_client()
    return supabase_admin
