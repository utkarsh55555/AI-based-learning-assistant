"""
api/index.py - MongoDB-backed Flask serverless function for Vercel.
Covers all API endpoints expected by the frontend.
Authentication: Custom JWT (PyJWT + werkzeug password hashing).
Database: MongoDB Atlas via PyMongo.
"""

import os, re, json, uuid, hmac, hashlib, secrets, time, logging

# Load .env files (local dev — Vercel uses dashboard env vars)
try:
    from dotenv import load_dotenv
    for _p in [
        ".env", 
        "../.env", 
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        "src/obsidian-backend-flask/.env", 
        "../src/obsidian-backend-flask/.env"
    ]:
        if os.path.exists(_p):
            load_dotenv(_p, override=True)
except ImportError:
    pass

from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import jwt as pyjwt
from werkzeug.security import generate_password_hash, check_password_hash

# ── Logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG if os.environ.get("FLASK_DEBUG", "").lower() in ("1", "true") else logging.WARNING,
    format="[%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("obsidian_api")

# ── App ────────────────────────────────────────────────────────────────────
app = Flask(__name__)
SECRET_KEY = os.environ.get("SECRET_KEY", "")
if not SECRET_KEY:
    logger.warning("SECRET_KEY not set -- using random ephemeral key (sessions break on restart).")
    SECRET_KEY = secrets.token_hex(32)
app.config["SECRET_KEY"] = SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB

# ── CORS ───────────────────────────────────────────────────────────────────
_raw_origins = os.environ.get("CORS_ORIGINS", "*")
if _raw_origins.strip() == "*":
    _origins = ["*"]
    logger.warning("CORS_ORIGINS=* -- set to your frontend domain in production.")
else:
    _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

CORS(app,
     resources={r"/*": {"origins": _origins}},
     allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     supports_credentials=False)

# ── Rate Limiting ──────────────────────────────────────────────────────────
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    _storage_uri = os.environ.get("RATE_LIMIT_STORAGE_URI", "memory://")
    limiter = Limiter(key_func=get_remote_address, app=app,
                      default_limits=["200 per minute"], storage_uri=_storage_uri)
except ImportError:
    logger.warning("flask-limiter not installed -- rate limiting disabled.")
    class _NoopLimiter:
        def limit(self, *a, **kw): return lambda f: f
        def exempt(self, f): return f
    limiter = _NoopLimiter()

# ── CSRF (stateless HMAC-SHA256) ───────────────────────────────────────────
CSRF_SECRET = os.environ.get("CSRF_SECRET_KEY", SECRET_KEY)
CSRF_EXPIRY  = int(os.environ.get("CSRF_TOKEN_EXPIRY_SECONDS", "3600"))
CSRF_SAFE    = {"GET", "HEAD", "OPTIONS", "TRACE"}

def _csrf_sign(payload: str) -> str:
    return hmac.new(CSRF_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()

def generate_csrf_token() -> str:
    ts = str(int(time.time())); nonce = secrets.token_hex(16)
    return f"{ts}:{nonce}:{_csrf_sign(f'{ts}:{nonce}')}"

def validate_csrf_token(token: str) -> tuple:
    if not token: return False, "Missing CSRF token"
    parts = token.split(":")
    if len(parts) != 3: return False, "Malformed CSRF token"
    ts_str, nonce, provided_sig = parts
    if not hmac.compare_digest(_csrf_sign(f"{ts_str}:{nonce}"), provided_sig):
        return False, "Invalid CSRF signature"
    try:
        age = int(time.time()) - int(ts_str)
    except ValueError:
        return False, "Malformed timestamp"
    if age > CSRF_EXPIRY: return False, "Expired CSRF token"
    return True, ""

# ── Input sanitization ─────────────────────────────────────────────────────
_CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HTML = re.compile(r"<[^>]+>")

def sanitize(value, max_len: int = 2000):
    if not isinstance(value, str): return value
    return _HTML.sub("", _CTRL.sub("", value)).strip()[:max_len]

def sanitize_prompt(value, max_len: int = 500):
    return sanitize(value, max_len)

# ── MongoDB singleton ──────────────────────────────────────────────────────
_mongo_client = None
_mongo_db = None
_mongo_error = None

def get_db():
    global _mongo_client, _mongo_db, _mongo_error
    if _mongo_db is not None:
        return _mongo_db
    uri = os.environ.get("MONGO_URI", "")
    if not uri:
        _mongo_error = "MONGO_URI environment variable is not set. Add it in Vercel Dashboard → Settings → Environment Variables."
        raise RuntimeError(_mongo_error)
    try:
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        try:
            _mongo_db = _mongo_client.get_default_database()
        except Exception:
            _mongo_db = _mongo_client["Obsidian"]
        if not _mongo_db.name or _mongo_db.name == "admin":
            _mongo_db = _mongo_client["Obsidian"]
        _mongo_error = None
        return _mongo_db
    except Exception as e:
        _mongo_error = f"MongoDB connection failed: {e}"
        _mongo_db = None
        raise RuntimeError(_mongo_error)

def clean_doc(doc):
    """Convert MongoDB ObjectId to string for JSON serialization."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ── AI singleton ───────────────────────────────────────────────────────────
_ai = None

def get_ai():
    global _ai
    if _ai is None:
        from openai import OpenAI
        # Using the key provided by the user for immediate functionality
        api_key = os.environ.get("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable is missing")
        if not api_key: raise RuntimeError("OPENROUTER_API_KEY is not configured.")
        _ai = OpenAI(api_key=api_key,
                     base_url=os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
                     default_headers={
                         "HTTP-Referer": "https://ai-based-learning-assistant-xi.vercel.app",
                         "X-Title": "Obsidian AI Learning Assistant",
                     })
    return _ai

AI_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")

def now_iso(): return datetime.utcnow().isoformat() + "Z"
def new_id() -> str: return str(uuid.uuid4())

def extract_json(text: str, fallback):
    try:
        text = text.strip()
        s_obj = text.find("{"); s_arr = text.find("[")
        is_obj = s_obj != -1 and (s_arr == -1 or s_obj < s_arr)
        is_arr = s_arr != -1 and (s_obj == -1 or s_arr < s_obj)
        if is_obj:
            e = text.rfind("}")
            if e != -1: return json.loads(text[s_obj:e+1])
        elif is_arr:
            e = text.rfind("]")
            if e != -1: return json.loads(text[s_arr:e+1])
    except Exception: pass
    return fallback

def ai_complete(prompt: str, max_tokens: int = 2048) -> str:
    resp = get_ai().chat.completions.create(model=AI_MODEL,
                                             messages=[{"role": "user", "content": prompt}],
                                             max_tokens=max_tokens)
    return resp.choices[0].message.content.strip()

# ── JWT helpers ────────────────────────────────────────────────────────────
JWT_EXPIRY = int(os.environ.get("JWT_EXPIRY_SECONDS", "3600"))

def generate_token(user_id: str) -> str:
    payload = {"sub": user_id, "iat": int(time.time()), "exp": int(time.time()) + JWT_EXPIRY}
    return pyjwt.encode(payload, SECRET_KEY, algorithm="HS256")

def get_user_from_token():
    """Decode JWT and return user profile dict from MongoDB, or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "): return None
    token = auth[7:].strip()
    if not token: return None
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id: return None
        db = get_db()
        profile = db.user_profiles.find_one({"user_id": user_id})
        return clean_doc(profile) if profile else None
    except Exception: return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        if not user: return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    return decorated

def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ── CSRF before-request ────────────────────────────────────────────────────
_CSRF_EXEMPT = {
    "health", "api_test", "api_root", "csrf_token",
    "signup", "login", "logout",
    "google_auth_url", "google_auth_callback",
    "tutor_chat", "quiz_generate", "notes_generate", "mindmap_generate",
    "handle_options",
    "leaderboard_global", "leaderboard_streak", "leaderboard_rank", "leaderboard_fallback",
}

@app.before_request
def check_csrf():
    if request.method in CSRF_SAFE: return
    if (request.endpoint or "") in _CSRF_EXEMPT: return
    token = (request.headers.get("X-CSRF-Token")
             or request.form.get("csrf_token")
             or (request.get_json(silent=True) or {}).get("csrf_token"))
    valid, reason = validate_csrf_token(token or "")
    if not valid:
        logger.warning("CSRF check failed for %s %s: %s", request.method, request.path, reason)
        return jsonify({"error": f"CSRF validation failed: {reason}"}), 403

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        r = make_response("", 204)
        origin = request.headers.get("Origin", "")
        if _origins == ["*"] or origin in _origins:
            r.headers["Access-Control-Allow-Origin"] = origin or "*"
        r.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        r.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-CSRF-Token"
        r.headers["Access-Control-Max-Age"] = "86400"
        return r

# ══════════════════════════════════════════════════════════════════════════
# HEALTH / INFO
# ══════════════════════════════════════════════════════════════════════════
@app.route("/health")
def health():
    mongo_ok = bool(os.environ.get("MONGO_URI"))
    return jsonify({
        "status": "healthy" if mongo_ok else "degraded",
        "message": "Obsidian API is running",
        "mongo_configured": mongo_ok,
    }), 200

@app.route("/api/test")
def api_test():
    mongo_ok = bool(os.environ.get("MONGO_URI"))
    return jsonify({
        "status": "ok" if mongo_ok else "degraded",
        "message": "Backend is reachable" if mongo_ok else "Backend reachable but MONGO_URI not set",
        "mongo_configured": mongo_ok,
    }), 200

@app.route("/api/")
@app.route("/api")
def api_root(): return jsonify({"name": "Obsidian API", "version": "3.0.0", "db": "MongoDB"}), 200

@app.route("/api/csrf-token")
def csrf_token():
    return jsonify({"csrf_token": generate_csrf_token()}), 200

# ══════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/auth/signup", methods=["POST"])
@limiter.limit("10 per minute")
def signup():
    try:
        data = request.get_json() or {}
        email = sanitize((data.get("email") or ""), 200).lower()
        password = data.get("password", "")
        name = sanitize((data.get("name") or email.split("@")[0]), 100)
        if not email or "@" not in email:
            return no_cache(jsonify({"error": "A valid email is required."})), 400
        if not password:
            return no_cache(jsonify({"error": "Password is required."})), 400

        db = get_db()
        if db.user_profiles.find_one({"email": email}):
            return no_cache(jsonify({"error": "An account with this email already exists."})), 409

        user_id = new_id()
        hashed_pw = generate_password_hash(password)
        profile = {
            "user_id": user_id, "email": email, "name": name,
            "password": hashed_pw, "total_xp": 0, "current_streak": 0,
            "avatar_url": "", "bio": "", "is_new_user": True,
            "created_at": now_iso()
        }
        db.user_profiles.insert_one(profile)
        access_token = generate_token(user_id)

        return no_cache(jsonify({
            "user": {"id": user_id, "email": email, "name": name,
                     "total_xp": 0, "current_streak": 0, "is_new_user": True},
            "access_token": access_token,
            "refresh_token": None,
        })), 201
    except Exception as e:
        logger.error("Signup error: %s", e)
        err_msg = str(e)
        if "MONGO_URI" in err_msg:
            return no_cache(jsonify({"error": "Database not configured. The admin needs to add MONGO_URI in Vercel environment variables."})), 503
        return no_cache(jsonify({"error": f"Signup failed: {err_msg}"})), 500

@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("20 per minute; 5 per 10 seconds")
def login():
    try:
        data = request.get_json() or {}
        email = sanitize((data.get("email") or ""), 200).lower()
        password = data.get("password", "")

        db = get_db()
        profile = db.user_profiles.find_one({"email": email})

        if not profile:
            return no_cache(jsonify({"error": "No account found with this email."})), 401
        if not check_password_hash(profile.get("password", ""), password):
            return no_cache(jsonify({"error": "Incorrect password. Please try again."})), 401

        user_id = profile["user_id"]
        access_token = generate_token(user_id)

        # Mark as not new after first login
        if profile.get("is_new_user"):
            db.user_profiles.update_one({"user_id": user_id}, {"$set": {"is_new_user": False}})

        return no_cache(jsonify({
            "user": {"id": user_id, "email": email, "name": profile.get("name", ""),
                     "total_xp": profile.get("total_xp", 0),
                     "current_streak": profile.get("current_streak", 0),
                     "avatar_url": profile.get("avatar_url", ""),
                     "is_new_user": False},
            "access_token": access_token,
            "refresh_token": None,
        })), 200
    except Exception as e:
        logger.error("Login error: %s", e)
        err_msg = str(e)
        if "MONGO_URI" in err_msg:
            return no_cache(jsonify({"error": "Database not configured. The admin needs to add MONGO_URI in Vercel environment variables."})), 503
        return no_cache(jsonify({"error": f"Login failed: {err_msg}"})), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    # Stateless JWT — client just discards the token
    return no_cache(jsonify({"message": "Logged out successfully"})), 200

@app.route("/api/auth/me")
def me():
    user = get_user_from_token()
    if not user: return no_cache(jsonify({"error": "Unauthorized"})), 401
    return no_cache(jsonify({"user": {
        "id": user["user_id"], "email": user.get("email", ""),
        "name": user.get("name", ""),
        "total_xp": user.get("total_xp", 0), "current_streak": user.get("current_streak", 0),
        "avatar_url": user.get("avatar_url", ""),
    }})), 200

@app.route("/api/auth/refresh", methods=["POST"])
def refresh_token():
    # With JWT, just re-authenticate. Stateless refresh not supported here.
    return no_cache(jsonify({"error": "Session expired. Please log in again."})), 401

# ── Google OAuth 2.0 (Supabase-free) ──────────────────────────────────────
# Required env vars:
#   GOOGLE_CLIENT_ID     - your Google OAuth app client ID
#   GOOGLE_CLIENT_SECRET - your Google OAuth app client secret

GOOGLE_AUTH_URL    = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CERTS_URL   = "https://www.googleapis.com/oauth2/v3/certs"

@app.route("/api/auth/google/url", methods=["GET"])
def google_auth_url():
    """Return the Google OAuth 2.0 authorization URL for the frontend to redirect to."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    if not client_id:
        return no_cache(jsonify({"error": "Google OAuth is not configured. Add GOOGLE_CLIENT_ID to environment variables."})), 503

    redirect_uri = request.args.get("redirect_uri", "")
    if not redirect_uri:
        return no_cache(jsonify({"error": "redirect_uri is required"})), 400

    # State = short-lived HMAC token used as CSRF protection for the OAuth flow
    state = generate_csrf_token()

    import urllib.parse
    params = {
        "client_id":     client_id,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account consent",
        "state":         state,
    }
    url = GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return no_cache(jsonify({"url": url, "state": state})), 200


@app.route("/api/auth/google/callback", methods=["POST"])
@limiter.limit("20 per minute")
def google_auth_callback():
    """
    Exchange a Google auth code for tokens, verify identity, and issue a JWT.
    Body: { "code": str, "redirect_uri": str, "state": str }
    """
    client_id     = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        return no_cache(jsonify({"error": "Google OAuth is not configured on the server."})), 503

    data         = request.get_json() or {}
    code         = (data.get("code") or "").strip()
    redirect_uri = (data.get("redirect_uri") or "").strip()
    state        = (data.get("state") or "").strip()

    if not code:
        return no_cache(jsonify({"error": "Authorization code is required."})), 400
    if not redirect_uri:
        return no_cache(jsonify({"error": "redirect_uri is required."})), 400

    # ── Step 1: Exchange code for Google tokens ────────────────────────────
    import requests as _requests
    try:
        token_resp = _requests.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     client_id,
            "client_secret": client_secret,
            "redirect_uri":  redirect_uri,
            "grant_type":    "authorization_code",
        }, timeout=10)
        token_data = token_resp.json()
        if not token_resp.ok or "id_token" not in token_data:
            err = token_data.get("error_description") or token_data.get("error") or "Token exchange failed"
            logger.error("Google token exchange failed: %s", token_data)
            return no_cache(jsonify({"error": f"Google sign-in failed: {err}"})), 401
    except Exception as e:
        logger.error("Google token request error: %s", e)
        return no_cache(jsonify({"error": "Could not contact Google authentication servers."})), 502

    id_token_str = token_data["id_token"]

    # ── Step 2: Verify the ID token using Google's public keys ─────────────
    # This is the crucial step — it proves the user is a REAL Google account.
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        google_req = google_requests.Request()
        id_info = google_id_token.verify_oauth2_token(
            id_token_str,
            google_req,
            client_id,
            clock_skew_in_seconds=10
        )

        # Must be issued by Google
        if id_info.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Invalid token issuer")

        # Email must be verified by Google
        if not id_info.get("email_verified", False):
            return no_cache(jsonify({"error": "Your Google email address has not been verified. Please verify it with Google first."})), 401

    except Exception as e:
        logger.error("Google ID token verification failed: %s", e)
        return no_cache(jsonify({"error": "Google authentication verification failed. Please try again."})), 401

    # ── Step 3: Extract real user info (guaranteed by Google) ─────────────
    google_email  = (id_info.get("email") or "").lower().strip()
    google_name   = id_info.get("name") or id_info.get("given_name") or google_email.split("@")[0]
    google_avatar = id_info.get("picture") or ""
    google_sub    = id_info.get("sub") or ""   # Google's stable unique user ID

    if not google_email or "@" not in google_email:
        return no_cache(jsonify({"error": "Could not retrieve a valid email from Google."})), 401

    # ── Step 4: Upsert user in MongoDB ────────────────────────────────────
    try:
        db = get_db()
        # Look up by google_sub first (most stable), fall back to email
        profile = db.user_profiles.find_one({"google_sub": google_sub}) if google_sub else None
        if not profile:
            profile = db.user_profiles.find_one({"email": google_email})

        if profile:
            # Existing user — update Google metadata
            user_id  = profile["user_id"]
            is_new   = False
            updates  = {"avatar_url": google_avatar, "is_new_user": False}
            if google_sub and not profile.get("google_sub"):
                updates["google_sub"] = google_sub
            if not profile.get("name") and google_name:
                updates["name"] = google_name
            db.user_profiles.update_one({"user_id": user_id}, {"$set": updates})
            profile.update(updates)
        else:
            # Brand-new Google user — create profile (no password stored)
            user_id = new_id()
            is_new  = True
            profile = {
                "user_id":       user_id,
                "email":         google_email,
                "name":          sanitize(google_name, 100),
                "google_sub":    google_sub,
                "avatar_url":    google_avatar,
                "password":      "",          # no password for OAuth users
                "total_xp":      0,
                "current_streak": 0,
                "bio":           "",
                "is_new_user":   True,
                "auth_provider": "google",
                "created_at":    now_iso(),
            }
            db.user_profiles.insert_one(profile)

        # ── Step 5: Issue JWT ──────────────────────────────────────────────
        access_token = generate_token(user_id)

        return no_cache(jsonify({
            "user": {
                "id":             user_id,
                "email":          google_email,
                "name":           profile.get("name", google_name),
                "avatar_url":     profile.get("avatar_url", google_avatar),
                "total_xp":       profile.get("total_xp", 0),
                "current_streak": profile.get("current_streak", 0),
                "is_new_user":    is_new,
                "auth_provider":  "google",
            },
            "access_token": access_token,
            "refresh_token": None,
        })), 200

    except Exception as e:
        logger.error("Google OAuth DB/JWT error: %s", e)
        err_msg = str(e)
        if "MONGO_URI" in err_msg:
            return no_cache(jsonify({"error": "Database not configured. Add MONGO_URI to environment variables."})), 503
        return no_cache(jsonify({"error": "Sign-in failed. Please try again."})), 500


# ══════════════════════════════════════════════════════════════════════════
# USER PROFILE
# ══════════════════════════════════════════════════════════════════════════
_PROFILE_ALLOWED = {"name", "email", "bio", "avatar_url", "learning_goals", "preferred_subjects"}

@app.route("/api/user/profile", methods=["GET"])
@require_auth
def get_profile(user):
    return jsonify({"profile": {
        "id": user["user_id"], "email": user.get("email", ""), "name": user.get("name", ""),
        "bio": user.get("bio", ""), "avatar_url": user.get("avatar_url", ""),
        "total_xp": user.get("total_xp", 0), "current_streak": user.get("current_streak", 0),
    }}), 200

@app.route("/api/user/profile", methods=["PUT", "PATCH"])
@require_auth
def update_profile(user):
    try:
        raw = request.get_json() or {}
        safe = {k: sanitize(str(v), 500) if isinstance(v, str) else v
                for k, v in raw.items() if k in _PROFILE_ALLOWED}
        if not safe: return jsonify({"error": "No valid fields to update."}), 400
        get_db().user_profiles.update_one({"user_id": user["user_id"]}, {"$set": safe})
        return jsonify({"message": "Profile updated", "profile": safe}), 200
    except Exception as e:
        logger.error("Profile update error: %s", e)
        return jsonify({"error": "Failed to update profile."}), 500

@app.route("/api/user/dashboard")
@require_auth
def dashboard(user):
    xp = user.get("total_xp", 0); streak = user.get("current_streak", 0)
    return jsonify({"xp": xp, "streak": streak, "level": max(1, xp // 100),
                    "stats": {"quizzes_taken": 0, "average_score": 0, "focus_minutes": 0},
                    "recent_activities": []}), 200

# ══════════════════════════════════════════════════════════════════════════
# AI TUTOR
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/tutor/chat", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def tutor_chat(user):
    try:
        data = request.get_json() or {}
        message = sanitize(data.get("message", ""), 4000)
        if not message: return jsonify({"error": "message is required"}), 400
        history = [
            {"role": m["role"], "content": sanitize(str(m.get("content", "")), 4000)}
            for m in (data.get("conversation_history") or [])
            if isinstance(m, dict) and m.get("role") in ("user", "assistant")
        ][-20:]
        messages = [{"role": "system", "content": "You are Obsidian, an expert AI learning assistant. Help students understand concepts clearly and use markdown formatting."}] + history + [{"role": "user", "content": message}]
        resp = get_ai().chat.completions.create(model=AI_MODEL, messages=messages, max_tokens=1200)
        reply = resp.choices[0].message.content
        return jsonify({
            "response": reply,
            "conversation_history": history + [{"role": "user", "content": message}, {"role": "assistant", "content": reply}],
        }), 200
    except Exception as e:
        logger.error("Tutor chat error: %s", e)
        return jsonify({"error": f"AI service error: {str(e)}"}), 500

@app.route("/api/tutor/explain", methods=["POST"])
@require_auth
@limiter.limit("30 per minute")
def tutor_explain(user):
    try:
        data = request.get_json() or {}
        topic = sanitize_prompt(data.get("topic", ""))
        level = sanitize(data.get("level", "intermediate"), 50)
        if not topic: return jsonify({"error": "topic is required"}), 400
        reply = ai_complete(f"Explain '{topic}' at a {level} level. Use clear markdown formatting.", 900)
        return jsonify({"explanation": reply}), 200
    except Exception as e:
        logger.error("Explain error: %s", e)
        return jsonify({"error": f"AI service error: {str(e)}"}), 500

@app.route("/api/tutor/upload", methods=["POST"])
@require_auth
@limiter.limit("10 per minute")
def tutor_upload(user):
    try:
        if "file" not in request.files: return jsonify({"error": "No file in request"}), 400
        file = request.files["file"]
        if not file.filename: return jsonify({"error": "No file selected"}), 400
        ALLOWED = {"pdf", "docx", "doc", "txt", "md", "csv"}
        MAX_SIZE = 10 * 1024 * 1024
        from werkzeug.utils import secure_filename
        safe_name = secure_filename(file.filename)
        ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
        if ext not in ALLOWED:
            return jsonify({"error": f"Unsupported file type .{ext}. Allowed: {', '.join(ALLOWED)}"}), 400
        file.seek(0, 2); size = file.tell(); file.seek(0)
        if size > MAX_SIZE: return jsonify({"error": "File too large (max 10 MB)"}), 413
        text = ""
        if ext == "pdf":
            import PyPDF2; reader = PyPDF2.PdfReader(file)
            text = "\n".join(p.extract_text() or "" for p in reader.pages).strip()
        elif ext in ("docx", "doc"):
            import docx as _d; doc = _d.Document(file)
            text = "\n".join(p.text for p in doc.paragraphs)
        elif ext in ("txt", "md", "csv"):
            text = file.read().decode("utf-8", errors="replace")
        if not text.strip(): return jsonify({"error": "No text could be extracted from this file."}), 422
        return jsonify({"filename": safe_name, "extracted_text": text[:50000]}), 200
    except Exception as e:
        logger.error("Upload error: %s", e)
        return jsonify({"error": "Failed to process file."}), 500

# ══════════════════════════════════════════════════════════════════════════
# QUIZ
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/quiz/generate", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def quiz_generate(user):
    try:
        data = request.get_json() or {}
        topic = sanitize_prompt(data.get("topic", "General Knowledge"))
        difficulty = sanitize(data.get("difficulty", "medium"), 20)
        num_q = min(int(data.get("num_questions", 5)), 10)
        prompt = (
            f'Generate exactly {num_q} multiple-choice quiz questions about "{topic}" at {difficulty} difficulty.\n'
            f'Return ONLY a valid JSON array. Example:\n'
            f'[{{"question": "Q?", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "Why A.", "difficulty": "{difficulty}"}}]\n'
            f'"correct" is the 0-based index of the correct option.'
        )
        raw = ai_complete(prompt, 2048); questions = extract_json(raw, [])
        if not isinstance(questions, list) or not questions:
            return jsonify({"error": "Failed to generate quiz questions. Please try again."}), 500
        for i, q in enumerate(questions):
            if not isinstance(q, dict):
                questions[i] = {"question": str(q), "options": [], "correct": 0, "explanation": ""}; continue
            opts = q.get("options") or []
            if isinstance(opts, dict): opts = list(opts.values())
            q["question"] = str(q.get("question") or "")
            q["options"] = [str(o) for o in opts]
            q["explanation"] = str(q.get("explanation") or "")
            q["difficulty"] = str(q.get("difficulty") or difficulty)
            try: q["correct"] = int(q.get("correct", 0))
            except (TypeError, ValueError): q["correct"] = 0
        quiz_id = new_id()
        try:
            get_db().quizzes.insert_one({
                "id": quiz_id, "user_id": user["user_id"], "title": f"{topic} Quiz",
                "topic": topic, "difficulty": difficulty, "questions": questions, "created_at": now_iso(),
            })
        except Exception: pass
        return jsonify({"id": quiz_id, "title": f"{topic} Quiz", "topic": topic,
                        "difficulty": difficulty, "questions": questions}), 200
    except Exception as e:
        logger.error("Quiz generate error: %s", e)
        return jsonify({"error": f"Quiz generation failed: {str(e)}"}), 500

@app.route("/api/quiz/<quiz_id>/submit", methods=["POST"])
@require_auth
def quiz_submit(user, quiz_id):
    try:
        data = request.get_json() or {}
        answers = data.get("answers", {}); time_taken = data.get("time_taken", 0)
        questions = []
        try:
            q_data = get_db().quizzes.find_one({"id": quiz_id})
            if q_data and q_data.get("user_id") and q_data["user_id"] != user["user_id"]:
                return jsonify({"error": "Quiz not found."}), 404
            questions = (q_data or {}).get("questions", [])
        except Exception: pass
        score, results = 0, []
        for i, q in enumerate(questions):
            ua = answers.get(str(i), answers.get(i, -1)); ca = q.get("correct", -1)
            ok = (int(str(ua)) == int(str(ca))
                  if str(ua).lstrip("-").isdigit() and str(ca).lstrip("-").isdigit()
                  else str(ua) == str(ca))
            if ok: score += 1
            results.append({"question": q.get("question", ""), "user_answer": ua,
                             "correct_answer": ca, "is_correct": ok, "explanation": q.get("explanation", "")})
        total = max(len(questions), 1); percentage = round(score / total * 100, 1); xp_earned = score * 50
        try:
            db = get_db()
            prof = db.user_profiles.find_one({"user_id": user["user_id"]})
            old_xp = (prof or {}).get("total_xp", 0)
            db.user_profiles.update_one({"user_id": user["user_id"]}, {"$set": {"total_xp": old_xp + xp_earned}})
        except Exception: pass
        return jsonify({
            "attempt": {"id": new_id(), "quiz_id": quiz_id, "score": score, "total": total,
                        "percentage": percentage, "time_taken": time_taken, "date": now_iso()},
            "results": results, "score": score, "total": total, "percentage": percentage,
            "xp": {"xp_earned": xp_earned},
        }), 200
    except Exception as e:
        logger.error("Quiz submit error: %s", e)
        return jsonify({"error": f"Failed to submit quiz: {str(e)}"}), 500

@app.route("/api/quiz/history")
@require_auth
def quiz_history(user):
    try:
        docs = list(get_db().quizzes.find({"user_id": user["user_id"]}).sort("created_at", -1))
        return jsonify([clean_doc(d) for d in docs]), 200
    except Exception: return jsonify([]), 200

@app.route("/api/quiz/stats")
@require_auth
def quiz_stats(user):
    return jsonify({"total_attempts": 0, "average_percentage": 0, "total_correct": 0, "total_questions": 0}), 200

@app.route("/api/quiz/<quiz_id>")
@require_auth
def get_quiz(user, quiz_id):
    try:
        doc = get_db().quizzes.find_one({"id": quiz_id, "user_id": user["user_id"]})
        if not doc: return jsonify({"error": "Quiz not found."}), 404
        return jsonify(clean_doc(doc)), 200
    except Exception: return jsonify({"error": "Quiz not found."}), 404

# ══════════════════════════════════════════════════════════════════════════
# NOTES
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/notes/generate", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def notes_generate(user):
    try:
        data = request.get_json() or {}
        topic = sanitize_prompt(data.get("topic", ""))
        subject = sanitize(data.get("subject", "General"), 100)
        if not topic: return jsonify({"error": "topic is required"}), 400
        prompt = (
            f'Generate comprehensive study notes on: {topic} (Subject: {subject}).\n'
            f'Return JSON with this structure:\n'
            f'{{"title":"Topic Title","summary":"Brief summary","content":"Detailed explanation","keyPoints":[],"examples":[],"formulas":[],"relatedTopics":[]}}\n'
            f'Make it educational and ensure valid JSON.'
        )
        raw = ai_complete(prompt, 2048); ai_data = extract_json(raw, {})
        if not isinstance(ai_data, dict):
            ai_data = {"title": topic, "summary": "", "content": str(raw),
                       "keyPoints": [], "examples": [], "formulas": [], "relatedTopics": []}
        for k in ["title", "summary", "content"]:
            ai_data[k] = str(ai_data.get(k) or (topic if k == "title" else ""))
        for k in ["keyPoints", "examples", "formulas", "relatedTopics"]:
            ai_data[k] = [str(x) for x in (ai_data.get(k) or []) if x]
        note_id = new_id()
        note = {"id": note_id, "user_id": user["user_id"], "title": ai_data.get("title", topic),
                "content": ai_data.get("content", ""), "tags": [subject, "AI-Generated"],
                "subject": subject, "created_at": now_iso(), "updated_at": now_iso()}
        try: get_db().notes.insert_one(dict(note))
        except Exception: pass
        return jsonify({"note": note, "ai_data": ai_data}), 200
    except Exception as e:
        logger.error("Notes generate error: %s", e)
        return jsonify({"error": "Notes generation failed. Please try again."}), 500

@app.route("/api/notes", methods=["GET"])
@require_auth
def notes_list(user):
    try:
        docs = list(get_db().notes.find({"user_id": user["user_id"]}).sort("created_at", -1))
        return jsonify([clean_doc(d) for d in docs]), 200
    except Exception: return jsonify([]), 200

@app.route("/api/notes", methods=["POST"])
@require_auth
def notes_create(user):
    try:
        data = request.get_json() or {}; note_id = new_id()
        note = {"id": note_id, "user_id": user["user_id"],
                "title": sanitize(data.get("title", "Untitled"), 300),
                "content": sanitize(data.get("content", ""), 50000),
                "tags": data.get("tags", []) if isinstance(data.get("tags"), list) else [],
                "subject": sanitize(data.get("subject", "General"), 100),
                "created_at": now_iso(), "updated_at": now_iso()}
        get_db().notes.insert_one(dict(note))
        return jsonify(note), 201
    except Exception as e:
        logger.error("Notes create error: %s", e)
        return jsonify({"error": "Failed to create note."}), 500

@app.route("/api/notes/search")
@require_auth
def notes_search(user):
    q = sanitize(request.args.get("q", ""), 200)
    try:
        regex = re.compile(re.escape(q), re.IGNORECASE)
        docs = list(get_db().notes.find({"user_id": user["user_id"], "$or": [{"title": regex}, {"content": regex}]}))
        return jsonify([clean_doc(d) for d in docs]), 200
    except Exception: return jsonify([]), 200

@app.route("/api/notes/<note_id>", methods=["GET"])
@require_auth
def notes_get(user, note_id):
    try:
        doc = get_db().notes.find_one({"id": note_id, "user_id": user["user_id"]})
        if not doc: return jsonify({"error": "Note not found."}), 404
        return jsonify(clean_doc(doc)), 200
    except Exception: return jsonify({"error": "Note not found."}), 404

@app.route("/api/notes/<note_id>", methods=["PUT", "PATCH"])
@require_auth
def notes_update(user, note_id):
    try:
        data = request.get_json() or {}
        safe = {k: (sanitize(str(v), 50000 if k == "content" else 300) if isinstance(v, str) else v)
                for k, v in data.items() if k in {"title", "content", "tags", "subject"}}
        safe["updated_at"] = now_iso()
        get_db().notes.update_one({"id": note_id, "user_id": user["user_id"]}, {"$set": safe})
        return jsonify({"id": note_id, **safe}), 200
    except Exception as e:
        logger.error("Notes update error: %s", e)
        return jsonify({"error": "Failed to update note."}), 500

@app.route("/api/notes/<note_id>", methods=["DELETE"])
@require_auth
def notes_delete(user, note_id):
    try:
        get_db().notes.delete_one({"id": note_id, "user_id": user["user_id"]})
        return jsonify({"success": True, "message": "Note deleted"}), 200
    except Exception as e:
        logger.error("Notes delete error: %s", e)
        return jsonify({"error": "Failed to delete note."}), 500

# ══════════════════════════════════════════════════════════════════════════
# MIND MAP
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/mindmap/generate", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def mindmap_generate(user):
    try:
        data = request.get_json() or {}
        topic = sanitize_prompt(data.get("topic", "General"))
        prompt = (
            f'Create a comprehensive mind map for: {topic}.\n'
            f'Return JSON: {{"title":"{topic}","topics":[{{"id":"t1","label":"..","color":"#3B82F6","summary":"..","subtopics":[{{"id":"s1","label":"..","summary":".."}}]}}]}}.\n'
            f'Include 3-5 main topics with 2-4 subtopics each. Use different vibrant hex colors per topic.'
        )
        raw = ai_complete(prompt, 1500); parsed = extract_json(raw, {"topics": []})
        topics = parsed.get("topics", []) if isinstance(parsed, dict) else []
        if not topics:
            topics = [
                {"id": "t1", "label": "Core Concepts", "color": "#3B82F6", "summary": "Fundamental principles",
                 "subtopics": [{"id": "st1", "label": "Definition", "summary": "Basic meaning"}]},
                {"id": "t2", "label": "Applications", "color": "#10B981", "summary": "Real-world uses",
                 "subtopics": [{"id": "st2", "label": "Industry Use", "summary": "Professional applications"}]},
            ]
        map_id = new_id()
        result = {"id": map_id, "user_id": user["user_id"], "title": f"{topic} Mind Map",
                  "topics": topics, "ai_generated": True, "created_at": now_iso()}
        try: get_db().mindmaps.insert_one(dict(result))
        except Exception: pass
        return jsonify(result), 200
    except Exception as e:
        logger.error("Mindmap generate error: %s", e)
        return jsonify({"error": "Mind map generation failed. Please try again."}), 500

@app.route("/api/mindmap", methods=["GET"])
@require_auth
def mindmap_list(user):
    try:
        docs = list(get_db().mindmaps.find({"user_id": user["user_id"]}).sort("created_at", -1))
        return jsonify([clean_doc(d) for d in docs]), 200
    except Exception: return jsonify([]), 200

@app.route("/api/mindmap", methods=["POST"])
@require_auth
def mindmap_create(user):
    try:
        data = request.get_json() or {}; map_id = new_id()
        mm = {"id": map_id, "user_id": user["user_id"],
              "title": sanitize(data.get("title", "Untitled Map"), 300),
              "topics": data.get("topics", []) if isinstance(data.get("topics"), list) else [],
              "ai_generated": False, "created_at": now_iso()}
        get_db().mindmaps.insert_one(dict(mm))
        return jsonify(mm), 201
    except Exception as e:
        logger.error("Mindmap create error: %s", e)
        return jsonify({"error": "Failed to create mind map."}), 500

@app.route("/api/mindmap/<map_id>", methods=["GET"])
@require_auth
def mindmap_get(user, map_id):
    try:
        doc = get_db().mindmaps.find_one({"id": map_id, "user_id": user["user_id"]})
        if not doc: return jsonify({"error": "Mind map not found."}), 404
        return jsonify(clean_doc(doc)), 200
    except Exception: return jsonify({"error": "Mind map not found."}), 404

@app.route("/api/mindmap/<map_id>", methods=["PUT", "PATCH"])
@require_auth
def mindmap_update(user, map_id):
    try:
        data = request.get_json() or {}
        safe = {k: (sanitize(str(v), 300) if isinstance(v, str) else v)
                for k, v in data.items() if k in {"title", "topics"}}
        get_db().mindmaps.update_one({"id": map_id, "user_id": user["user_id"]}, {"$set": safe})
        return jsonify({"id": map_id, **safe}), 200
    except Exception as e:
        logger.error("Mindmap update error: %s", e)
        return jsonify({"error": "Failed to update mind map."}), 500

@app.route("/api/mindmap/<map_id>", methods=["DELETE"])
@require_auth
def mindmap_delete(user, map_id):
    try:
        get_db().mindmaps.delete_one({"id": map_id, "user_id": user["user_id"]})
        return jsonify({"success": True}), 200
    except Exception as e:
        logger.error("Mindmap delete error: %s", e)
        return jsonify({"error": "Failed to delete mind map."}), 500

# ══════════════════════════════════════════════════════════════════════════
# STUDY PLANNER
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/study/plan", methods=["POST"])
@require_auth
@limiter.limit("10 per minute")
def study_plan_create(user):
    try:
        data = request.get_json() or {}
        subject = sanitize_prompt(data.get("subject", "General"))
        weeks_n = max(1, min(int(data.get("duration_weeks", 4)), 52))
        level = sanitize(data.get("current_level", "intermediate"), 50)
        prompt = (
            f'Create a {weeks_n}-week study plan for "{subject}" at {level} level.\n'
            f'Return ONLY valid JSON: {{"weeks":[{{"week":1,"title":"Week 1 title","tasks":[{{"id":"t-1-1","title":"Task 1","completed":false}}]}}]}}'
        )
        raw = ai_complete(prompt, 1500); parsed = extract_json(raw, {"weeks": []})
        weeks = parsed.get("weeks", []) if isinstance(parsed, dict) else []
        if not weeks:
            weeks = [{"week": i+1, "title": f"Week {i+1}: {subject}",
                      "tasks": [{"id": f"t-{i}-1", "title": "Read chapter and take notes", "completed": False},
                                 {"id": f"t-{i}-2", "title": "Practice exercises", "completed": False},
                                 {"id": f"t-{i}-3", "title": "Take a quiz", "completed": False}]}
                     for i in range(weeks_n)]
        plan_id = new_id()
        plan = {"id": plan_id, "user_id": user["user_id"], "subject": subject, "duration_weeks": weeks_n,
                "current_level": level, "progress": 0, "weeks": weeks, "created_at": now_iso()}
        try: get_db().study_plans.insert_one(dict(plan))
        except Exception: pass
        return jsonify(plan), 201
    except Exception as e:
        logger.error("Study plan error: %s", e)
        return jsonify({"error": "Failed to generate study plan."}), 500

@app.route("/api/study/plans")
@require_auth
def study_plans_list(user):
    try:
        docs = list(get_db().study_plans.find({"user_id": user["user_id"]}).sort("created_at", -1))
        return jsonify([clean_doc(d) for d in docs]), 200
    except Exception: return jsonify([]), 200

@app.route("/api/study/plan/<plan_id>")
@require_auth
def study_plan_get(user, plan_id):
    try:
        doc = get_db().study_plans.find_one({"id": plan_id, "user_id": user["user_id"]})
        if not doc: return jsonify({"error": "Study plan not found."}), 404
        return jsonify(clean_doc(doc)), 200
    except Exception: return jsonify({"error": "Study plan not found."}), 404

@app.route("/api/study/plan/<plan_id>/progress", methods=["PUT", "PATCH"])
@require_auth
def study_plan_progress(user, plan_id):
    try:
        data = request.get_json() or {}
        prog = max(0, min(100, int(data.get("progress", 0))))
        get_db().study_plans.update_one({"id": plan_id, "user_id": user["user_id"]}, {"$set": {"progress": prog}})
        return jsonify({"progress": prog}), 200
    except Exception as e:
        logger.error("Plan progress error: %s", e)
        return jsonify({"error": "Failed to update progress."}), 500

@app.route("/api/study/session", methods=["POST"])
@require_auth
def study_session_create(user):
    try:
        data = request.get_json() or {}
        mins = max(0, min(int(data.get("duration_minutes", 0)), 1440))
        subject = sanitize(data.get("subject", "General Study"), 200)
        notes_text = sanitize(data.get("notes", ""), 5000)
        xp = mins * 2
        session = {"id": new_id(), "user_id": user["user_id"], "duration_minutes": mins,
                   "subject": subject, "notes": notes_text, "xp_earned": xp, "date": now_iso()}
        try:
            db = get_db()
            db.study_sessions.insert_one(dict(session))
            prof = db.user_profiles.find_one({"user_id": user["user_id"]})
            old_xp = (prof or {}).get("total_xp", 0)
            db.user_profiles.update_one({"user_id": user["user_id"]}, {"$set": {"total_xp": old_xp + xp}})
        except Exception: pass
        return jsonify(session), 201
    except Exception as e:
        logger.error("Study session error: %s", e)
        return jsonify({"error": "Failed to record study session."}), 500

@app.route("/api/study/stats")
@require_auth
def study_stats(user):
    try:
        docs = list(get_db().study_sessions.find({"user_id": user["user_id"]}))
        sessions = [clean_doc(d) for d in docs]
        total_mins = sum(s.get("duration_minutes", 0) for s in sessions)
        return jsonify({"total_sessions": len(sessions), "total_minutes": total_mins,
                        "xp_earned": total_mins * 2, "sessions": sessions}), 200
    except Exception:
        return jsonify({"total_sessions": 0, "total_minutes": 0, "xp_earned": 0, "sessions": []}), 200

# ══════════════════════════════════════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════════════════════════════════════
def _leaderboard_data(order_col="total_xp"):
    try:
        docs = list(get_db().user_profiles.find({}, {"password": 0}).sort(order_col, -1).limit(50))
        rows = []
        for doc in docs:
            clean_doc(doc)
            row = {"id": doc.get("user_id"), "name": doc.get("name", ""),
                   "total_xp": doc.get("total_xp", 0), "current_streak": doc.get("current_streak", 0),
                   "avatar_url": doc.get("avatar_url", "")}
            rows.append(row)
        return rows
    except Exception: return []

@app.route("/api/leaderboard/global")
def leaderboard_global(): return jsonify(_leaderboard_data("total_xp")), 200

@app.route("/api/leaderboard/streak")
def leaderboard_streak(): return jsonify(_leaderboard_data("current_streak")), 200

@app.route("/api/leaderboard/rank")
def leaderboard_rank():
    user = get_user_from_token(); rows = _leaderboard_data("total_xp")
    uid = (user or {}).get("user_id", "")
    rank = next((i+1 for i, r in enumerate(rows) if r.get("id") == uid), len(rows))
    return jsonify({"rank": rank, "total_users": len(rows), "user": {}}), 200

@app.route("/api/leaderboard")
def leaderboard_fallback(): return jsonify(_leaderboard_data("total_xp")), 200

# ══════════════════════════════════════════════════════════════════════════
# ERROR HANDLERS
# ══════════════════════════════════════════════════════════════════════════
@app.errorhandler(404)
def not_found(_): return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(413)
def too_large(_): return jsonify({"error": "Request body too large (max 16 MB)"}), 413

@app.errorhandler(429)
def rate_limited(_): return jsonify({"error": "Too many requests. Please slow down."}), 429

@app.errorhandler(500)
def server_error(e):
    logger.error("Unhandled error: %s", e)
    return jsonify({"error": "Internal server error"}), 500
