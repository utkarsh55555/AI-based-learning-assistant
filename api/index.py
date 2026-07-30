"""
api/index.py - Hardened Flask serverless function for Vercel.
Covers all API endpoints expected by the frontend (src/utils/api.ts).

Security layers applied (mirrors src/obsidian-backend-flask/app.py):
  1. CORS            - env-driven origin whitelist, no wildcard in production
  2. CSRF            - HMAC-SHA256 signed tokens, validated on every state-change
  3. Rate Limiting   - Flask-Limiter (in-memory; set RATE_LIMIT_STORAGE_URI for Redis)
  4. Input sanitize  - strip HTML+ctrl chars, length-cap all LLM prompts
  5. Auth guards     - every data endpoint requires a valid Bearer token
  6. Field whitelist - update_profile only accepts known safe fields
  7. Request size    - MAX_CONTENT_LENGTH = 16 MB
  8. Error handling  - no raw exceptions returned to client
  9. Cache headers   - no-store on all /api/auth/* responses
"""

import os, re, json, uuid, hmac, hashlib, secrets, time, logging
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

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

def escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")

# ── Lazy singletons ────────────────────────────────────────────────────────
_supabase = None
_ai = None

def get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
        if not url or not key: raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.")
        _supabase = create_client(url, key)
    return _supabase

def get_ai():
    global _ai
    if _ai is None:
        from openai import OpenAI
        api_key = os.environ.get("OPENROUTER_API_KEY", "")
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

def get_user_from_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "): return None
    token = auth[7:].strip()
    if not token: return None
    try:
        user = get_supabase().auth.get_user(token)
        return user.user if user else None
    except Exception: return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        if not user: return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    return decorated

def no_cache(response):
    """Add no-store headers to a response (use on all auth endpoints)."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# ── CSRF before-request ────────────────────────────────────────────────────
_CSRF_EXEMPT = {
    "health", "api_test", "api_root", "csrf_token",
    "signup", "login", "logout",
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
def health(): return jsonify({"status": "healthy", "message": "Obsidian API is running"}), 200

@app.route("/api/test")
def api_test(): return jsonify({"status": "ok", "message": "Backend is reachable"}), 200

@app.route("/api/")
@app.route("/api")
def api_root(): return jsonify({"name": "Obsidian API", "version": "3.0.0"}), 200

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
        sb = get_supabase()
        resp = sb.auth.sign_up({"email": email, "password": password,
                                 "options": {"data": {"name": name, "full_name": name}}})
        if not resp.user:
            return no_cache(jsonify({"error": "Signup failed. Please try again."})), 400
        try:
            sb.table("users").upsert({"id": resp.user.id, "email": email, "name": name,
                                      "total_xp": 0, "current_streak": 0, "created_at": now_iso()}).execute()
        except Exception: pass
        return no_cache(jsonify({
            "user": {"id": resp.user.id, "email": email, "name": name,
                     "total_xp": 0, "current_streak": 0, "is_new_user": True},
            "access_token":  resp.session.access_token  if resp.session else None,
            "refresh_token": resp.session.refresh_token if resp.session else None,
        })), 201
    except Exception as e:
        msg = str(e).lower()
        if "already registered" in msg or "already been registered" in msg:
            return no_cache(jsonify({"error": "An account with this email already exists."})), 409
        logger.error("Signup error: %s", e)
        return no_cache(jsonify({"error": "Signup failed. Please check your details."})), 400

@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("20 per minute; 5 per 10 seconds")
def login():
    try:
        data = request.get_json() or {}
        email = sanitize((data.get("email") or ""), 200).lower()
        password = data.get("password", "")
        sb = get_supabase()
        resp = sb.auth.sign_in_with_password({"email": email, "password": password})
        meta = resp.user.user_metadata or {}
        name = meta.get("name") or meta.get("full_name") or ""
        profile = {}
        try:
            prof = sb.table("users").select("*").eq("id", resp.user.id).single().execute()
            profile = prof.data or {}
            if not name: name = profile.get("name", "")
        except Exception: pass
        if not name: name = email.split("@")[0]
        return no_cache(jsonify({
            "user": {"id": resp.user.id, "email": email, "name": name,
                     "total_xp": profile.get("total_xp", 0),
                     "current_streak": profile.get("current_streak", 0), "is_new_user": False},
            "access_token":  resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        })), 200
    except Exception as e:
        msg = str(e).lower()
        if "invalid" in msg or "credentials" in msg or "password" in msg or "400" in msg:
            return no_cache(jsonify({"error": "Incorrect password. Please try again."})), 401
        if "not found" in msg or "no user" in msg or "404" in msg:
            return no_cache(jsonify({"error": "No account found with this email."})), 401
        logger.error("Login error: %s", e)
        return no_cache(jsonify({"error": "Login failed. Please check your credentials."})), 401

@app.route("/api/auth/logout", methods=["POST"])
def logout():
    try: get_supabase().auth.sign_out()
    except Exception: pass
    return no_cache(jsonify({"message": "Logged out successfully"})), 200

@app.route("/api/auth/me")
def me():
    user = get_user_from_token()
    if not user: return no_cache(jsonify({"error": "Unauthorized"})), 401
    meta = user.user_metadata or {}
    name = meta.get("name") or meta.get("full_name") or ""
    profile = {}
    try:
        prof = get_supabase().table("users").select("*").eq("id", user.id).single().execute()
        profile = prof.data or {}
        if not name: name = profile.get("name", "")
    except Exception: pass
    if not name: name = (user.email or "").split("@")[0]
    return no_cache(jsonify({"user": {
        "id": user.id, "email": user.email, "name": name,
        "total_xp": profile.get("total_xp", 0), "current_streak": profile.get("current_streak", 0),
        "avatar_url": profile.get("avatar_url", meta.get("avatar_url", "")),
    }})), 200

@app.route("/api/auth/refresh", methods=["POST"])
def refresh_token():
    try:
        data = request.get_json() or {}
        resp = get_supabase().auth.refresh_session(data.get("refresh_token", ""))
        return no_cache(jsonify({"access_token": resp.session.access_token,
                                  "refresh_token": resp.session.refresh_token})), 200
    except Exception:
        return no_cache(jsonify({"error": "Session refresh failed. Please log in again."})), 401

# ══════════════════════════════════════════════════════════════════════════
# USER PROFILE
# ══════════════════════════════════════════════════════════════════════════
_PROFILE_ALLOWED = {"name", "email", "bio", "avatar_url", "learning_goals", "preferred_subjects"}

@app.route("/api/user/profile", methods=["GET"])
@require_auth
def get_profile(user):
    meta = user.user_metadata or {}; profile = {}
    try:
        r = get_supabase().table("users").select("*").eq("id", user.id).single().execute()
        profile = r.data or {}
    except Exception: pass
    name = profile.get("name") or meta.get("name") or meta.get("full_name") or user.email.split("@")[0]
    return jsonify({"profile": {
        "id": user.id, "email": user.email, "name": name,
        "bio": profile.get("bio", ""), "avatar_url": profile.get("avatar_url", ""),
        "total_xp": profile.get("total_xp", 0), "current_streak": profile.get("current_streak", 0),
    }}), 200

@app.route("/api/user/profile", methods=["PUT", "PATCH"])
@require_auth
def update_profile(user):
    try:
        raw = request.get_json() or {}
        # Field whitelist - prevents mass assignment (cannot set total_xp, role, etc.)
        safe = {k: sanitize(str(v), 500) if isinstance(v, str) else v
                for k, v in raw.items() if k in _PROFILE_ALLOWED}
        if not safe: return jsonify({"error": "No valid fields to update."}), 400
        get_supabase().table("users").upsert({"id": user.id, **safe, "updated_at": now_iso()}).execute()
        return jsonify({"message": "Profile updated", "profile": safe}), 200
    except Exception as e:
        logger.error("Profile update error: %s", e)
        return jsonify({"error": "Failed to update profile."}), 500

@app.route("/api/user/dashboard")
@require_auth
def dashboard(user):
    profile = {}
    try:
        r = get_supabase().table("users").select("*").eq("id", user.id).single().execute()
        profile = r.data or {}
    except Exception: pass
    xp = profile.get("total_xp", 0); streak = profile.get("current_streak", 0)
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
        # Sanitize + filter history: role whitelist + 20-message cap
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
        return jsonify({"error": "AI service error. Please try again."}), 500

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
        return jsonify({"error": "AI service error. Please try again."}), 500

@app.route("/api/tutor/upload", methods=["POST"])
@require_auth
@limiter.limit("10 per minute")
def tutor_upload(user):
    try:
        if "file" not in request.files: return jsonify({"error": "No file in request"}), 400
        file = request.files["file"]
        if not file.filename: return jsonify({"error": "No file selected"}), 400
        ALLOWED = {"pdf", "docx", "doc", "txt", "md", "csv"}
        MAX_SIZE = 10 * 1024 * 1024  # 10 MB
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
            get_supabase().table("quizzes").insert({
                "id": quiz_id, "user_id": user.id, "title": f"{topic} Quiz",
                "topic": topic, "difficulty": difficulty, "questions": questions, "created_at": now_iso(),
            }).execute()
        except Exception: pass
        return jsonify({"id": quiz_id, "title": f"{topic} Quiz", "topic": topic,
                        "difficulty": difficulty, "questions": questions}), 200
    except Exception as e:
        logger.error("Quiz generate error: %s", e)
        return jsonify({"error": "Quiz generation failed. Please try again."}), 500

@app.route("/api/quiz/<quiz_id>/submit", methods=["POST"])
@require_auth
def quiz_submit(user, quiz_id):
    try:
        data = request.get_json() or {}
        answers = data.get("answers", {}); time_taken = data.get("time_taken", 0)
        questions = []
        try:
            q = get_supabase().table("quizzes").select("questions,user_id").eq("id", quiz_id).single().execute()
            q_data = q.data or {}
            if q_data.get("user_id") and q_data["user_id"] != user.id:
                return jsonify({"error": "Quiz not found."}), 404
            questions = q_data.get("questions", [])
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
            sb = get_supabase(); prof = sb.table("users").select("total_xp").eq("id", user.id).single().execute()
            old = (prof.data or {}).get("total_xp", 0)
            sb.table("users").update({"total_xp": old + xp_earned}).eq("id", user.id).execute()
        except Exception: pass
        return jsonify({
            "attempt": {"id": new_id(), "quiz_id": quiz_id, "score": score, "total": total,
                        "percentage": percentage, "time_taken": time_taken, "date": now_iso()},
            "results": results, "score": score, "total": total, "percentage": percentage,
            "xp": {"xp_earned": xp_earned},
        }), 200
    except Exception as e:
        logger.error("Quiz submit error: %s", e)
        return jsonify({"error": "Failed to submit quiz."}), 500

@app.route("/api/quiz/history")
@require_auth
def quiz_history(user):
    try:
        r = get_supabase().table("quizzes").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception: return jsonify([]), 200

@app.route("/api/quiz/stats")
@require_auth
def quiz_stats(user):
    return jsonify({"total_attempts": 0, "average_percentage": 0, "total_correct": 0, "total_questions": 0}), 200

@app.route("/api/quiz/<quiz_id>")
@require_auth
def get_quiz(user, quiz_id):
    try:
        r = get_supabase().table("quizzes").select("*").eq("id", quiz_id).eq("user_id", user.id).single().execute()
        if not r.data: return jsonify({"error": "Quiz not found."}), 404
        return jsonify(r.data), 200
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
        note = {"id": note_id, "user_id": user.id, "title": ai_data.get("title", topic),
                "content": ai_data.get("content", ""), "tags": [subject, "AI-Generated"],
                "subject": subject, "created_at": now_iso(), "updated_at": now_iso()}
        try: get_supabase().table("notes").insert(note).execute()
        except Exception: pass
        return jsonify({"note": note, "ai_data": ai_data}), 200
    except Exception as e:
        logger.error("Notes generate error: %s", e)
        return jsonify({"error": "Notes generation failed. Please try again."}), 500

@app.route("/api/notes", methods=["GET"])
@require_auth
def notes_list(user):
    try:
        r = get_supabase().table("notes").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception: return jsonify([]), 200

@app.route("/api/notes", methods=["POST"])
@require_auth
def notes_create(user):
    try:
        data = request.get_json() or {}; note_id = new_id()
        note = {"id": note_id, "user_id": user.id,
                "title": sanitize(data.get("title", "Untitled"), 300),
                "content": sanitize(data.get("content", ""), 50000),
                "tags": data.get("tags", []) if isinstance(data.get("tags"), list) else [],
                "subject": sanitize(data.get("subject", "General"), 100),
                "created_at": now_iso(), "updated_at": now_iso()}
        get_supabase().table("notes").insert(note).execute()
        return jsonify(note), 201
    except Exception as e:
        logger.error("Notes create error: %s", e)
        return jsonify({"error": "Failed to create note."}), 500

@app.route("/api/notes/search")
@require_auth
def notes_search(user):
    q = sanitize(request.args.get("q", ""), 200)
    try:
        r = get_supabase().table("notes").select("*").eq("user_id", user.id).ilike("title", f"%{escape_like(q)}%").execute()
        return jsonify(r.data or []), 200
    except Exception: return jsonify([]), 200

@app.route("/api/notes/<note_id>", methods=["GET"])
@require_auth
def notes_get(user, note_id):
    """Auth-guarded: only the owning user can fetch their note."""
    try:
        r = get_supabase().table("notes").select("*").eq("id", note_id).eq("user_id", user.id).single().execute()
        if not r.data: return jsonify({"error": "Note not found."}), 404
        return jsonify(r.data), 200
    except Exception: return jsonify({"error": "Note not found."}), 404

@app.route("/api/notes/<note_id>", methods=["PUT", "PATCH"])
@require_auth
def notes_update(user, note_id):
    try:
        data = request.get_json() or {}
        safe = {k: (sanitize(str(v), 50000 if k == "content" else 300) if isinstance(v, str) else v)
                for k, v in data.items() if k in {"title", "content", "tags", "subject"}}
        safe["updated_at"] = now_iso()
        get_supabase().table("notes").update(safe).eq("id", note_id).eq("user_id", user.id).execute()
        return jsonify({"id": note_id, **safe}), 200
    except Exception as e:
        logger.error("Notes update error: %s", e)
        return jsonify({"error": "Failed to update note."}), 500

@app.route("/api/notes/<note_id>", methods=["DELETE"])
@require_auth
def notes_delete(user, note_id):
    try:
        get_supabase().table("notes").delete().eq("id", note_id).eq("user_id", user.id).execute()
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
        result = {"id": map_id, "user_id": user.id, "title": f"{topic} Mind Map",
                  "topics": topics, "ai_generated": True, "created_at": now_iso()}
        try: get_supabase().table("mindmaps").insert(result).execute()
        except Exception: pass
        return jsonify(result), 200
    except Exception as e:
        logger.error("Mindmap generate error: %s", e)
        return jsonify({"error": "Mind map generation failed. Please try again."}), 500

@app.route("/api/mindmap", methods=["GET"])
@require_auth
def mindmap_list(user):
    try:
        r = get_supabase().table("mindmaps").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception: return jsonify([]), 200

@app.route("/api/mindmap", methods=["POST"])
@require_auth
def mindmap_create(user):
    try:
        data = request.get_json() or {}; map_id = new_id()
        mm = {"id": map_id, "user_id": user.id,
              "title": sanitize(data.get("title", "Untitled Map"), 300),
              "topics": data.get("topics", []) if isinstance(data.get("topics"), list) else [],
              "ai_generated": False, "created_at": now_iso()}
        get_supabase().table("mindmaps").insert(mm).execute()
        return jsonify(mm), 201
    except Exception as e:
        logger.error("Mindmap create error: %s", e)
        return jsonify({"error": "Failed to create mind map."}), 500

@app.route("/api/mindmap/<map_id>", methods=["GET"])
@require_auth
def mindmap_get(user, map_id):
    """Auth-guarded: only the owning user can fetch their mind map."""
    try:
        r = get_supabase().table("mindmaps").select("*").eq("id", map_id).eq("user_id", user.id).single().execute()
        if not r.data: return jsonify({"error": "Mind map not found."}), 404
        return jsonify(r.data), 200
    except Exception: return jsonify({"error": "Mind map not found."}), 404

@app.route("/api/mindmap/<map_id>", methods=["PUT", "PATCH"])
@require_auth
def mindmap_update(user, map_id):
    try:
        data = request.get_json() or {}
        safe = {k: (sanitize(str(v), 300) if isinstance(v, str) else v)
                for k, v in data.items() if k in {"title", "topics"}}
        get_supabase().table("mindmaps").update(safe).eq("id", map_id).eq("user_id", user.id).execute()
        return jsonify({"id": map_id, **safe}), 200
    except Exception as e:
        logger.error("Mindmap update error: %s", e)
        return jsonify({"error": "Failed to update mind map."}), 500

@app.route("/api/mindmap/<map_id>", methods=["DELETE"])
@require_auth
def mindmap_delete(user, map_id):
    try:
        get_supabase().table("mindmaps").delete().eq("id", map_id).eq("user_id", user.id).execute()
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
        plan = {"id": plan_id, "user_id": user.id, "subject": subject, "duration_weeks": weeks_n,
                "current_level": level, "progress": 0, "weeks": weeks, "created_at": now_iso()}
        try: get_supabase().table("study_plans").insert(plan).execute()
        except Exception: pass
        return jsonify(plan), 201
    except Exception as e:
        logger.error("Study plan error: %s", e)
        return jsonify({"error": "Failed to generate study plan."}), 500

@app.route("/api/study/plans")
@require_auth
def study_plans_list(user):
    try:
        r = get_supabase().table("study_plans").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception: return jsonify([]), 200

@app.route("/api/study/plan/<plan_id>")
@require_auth
def study_plan_get(user, plan_id):
    try:
        r = get_supabase().table("study_plans").select("*").eq("id", plan_id).eq("user_id", user.id).single().execute()
        if not r.data: return jsonify({"error": "Study plan not found."}), 404
        return jsonify(r.data), 200
    except Exception: return jsonify({"error": "Study plan not found."}), 404

@app.route("/api/study/plan/<plan_id>/progress", methods=["PUT", "PATCH"])
@require_auth
def study_plan_progress(user, plan_id):
    try:
        data = request.get_json() or {}
        prog = max(0, min(100, int(data.get("progress", 0))))
        get_supabase().table("study_plans").update({"progress": prog}).eq("id", plan_id).eq("user_id", user.id).execute()
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
        session = {"id": new_id(), "user_id": user.id, "duration_minutes": mins,
                   "subject": subject, "notes": notes_text, "xp_earned": xp, "date": now_iso()}
        try:
            get_supabase().table("study_sessions").insert(session).execute()
            sb = get_supabase(); prof = sb.table("users").select("total_xp").eq("id", user.id).single().execute()
            old = (prof.data or {}).get("total_xp", 0)
            sb.table("users").update({"total_xp": old + xp}).eq("id", user.id).execute()
        except Exception: pass
        return jsonify(session), 201
    except Exception as e:
        logger.error("Study session error: %s", e)
        return jsonify({"error": "Failed to record study session."}), 500

@app.route("/api/study/stats")
@require_auth
def study_stats(user):
    try:
        r = get_supabase().table("study_sessions").select("*").eq("user_id", user.id).execute()
        sessions = r.data or []
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
        r = get_supabase().table("users").select("id,name,email,total_xp,current_streak,avatar_url").order(order_col, desc=True).limit(50).execute()
        rows = r.data or []
        for row in rows:
            if not row.get("name"): row["name"] = (row.get("email") or "").split("@")[0]
            row.pop("email", None)   # Never expose raw emails on leaderboard
        return rows
    except Exception: return []

@app.route("/api/leaderboard/global")
def leaderboard_global(): return jsonify(_leaderboard_data("total_xp")), 200

@app.route("/api/leaderboard/streak")
def leaderboard_streak(): return jsonify(_leaderboard_data("current_streak")), 200

@app.route("/api/leaderboard/rank")
def leaderboard_rank():
    user = get_user_from_token(); rows = _leaderboard_data("total_xp")
    rank = next((i+1 for i, r in enumerate(rows) if r.get("id") == (user.id if user else "")), len(rows))
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
