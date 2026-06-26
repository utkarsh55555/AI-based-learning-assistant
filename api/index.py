"""
api/index.py — Self-contained Flask serverless function for Vercel.
Covers all API endpoints expected by the frontend (src/utils/api.ts).
"""

import os, json, uuid, traceback
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── App ────────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

CORS(app,
     resources={r"/*": {"origins": "*"}},
     allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     supports_credentials=False)

# ── Lazy singletons ────────────────────────────────────────────────────────
_supabase = None
_ai       = None

def get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        _supabase = create_client(
            os.environ.get('SUPABASE_URL', ''),
            os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_ANON_KEY', ''))
        )
    return _supabase

def get_ai():
    global _ai
    if _ai is None:
        from openai import OpenAI
        _ai = OpenAI(
            api_key=os.environ.get('OPENROUTER_API_KEY', ''),
            base_url=os.environ.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
            default_headers={
                "HTTP-Referer": "https://ai-learning-assistant-rho-ecru.vercel.app",
                "X-Title": "Obsidian AI Learning Assistant",
            }
        )
    return _ai

AI_MODEL = os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini')

# ── Helpers ────────────────────────────────────────────────────────────────
def now_iso():
    return datetime.utcnow().isoformat() + 'Z'

def extract_json(text: str, fallback):
    """Safely extract the first JSON object or array from an LLM response."""
    try:
        text = text.strip()
        # Try array first
        s = text.find('[')
        if s != -1:
            e = text.rfind(']')
            if e != -1:
                return json.loads(text[s:e+1])
        # Then object
        s = text.find('{')
        if s != -1:
            e = text.rfind('}')
            if e != -1:
                return json.loads(text[s:e+1])
    except Exception:
        pass
    return fallback

def ai_complete(prompt: str, max_tokens=2048) -> str:
    resp = get_ai().chat.completions.create(
        model=AI_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()

def get_user_from_token():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth[7:]
    try:
        user = get_supabase().auth.get_user(token)
        return user.user if user else None
    except Exception:
        return None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_user_from_token()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401
        return f(user, *args, **kwargs)
    return decorated

def safe_table(table, action_fn):
    """Run a Supabase table operation; return (data, error)."""
    try:
        return action_fn(get_supabase().table(table)), None
    except Exception as exc:
        return None, str(exc)

# ── CORS preflight ─────────────────────────────────────────────────────────
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        from flask import make_response
        r = make_response('', 204)
        r.headers['Access-Control-Allow-Origin']  = '*'
        r.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
        r.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-CSRF-Token'
        return r

# ══════════════════════════════════════════════════════════════════════════
# HEALTH / INFO
# ══════════════════════════════════════════════════════════════════════════
@app.route('/health')
def health():
    return jsonify({"status": "healthy", "message": "Obsidian API is running"}), 200

@app.route('/api/test')
def api_test():
    return jsonify({"status": "ok", "message": "Backend is reachable"}), 200

@app.route('/api/')
@app.route('/api')
def api_root():
    return jsonify({"name": "Obsidian API", "version": "2.0.0"}), 200

@app.route('/api/csrf-token')
def csrf_token():
    import secrets
    return jsonify({"csrf_token": secrets.token_hex(32)}), 200

# ══════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data     = request.get_json() or {}
        email    = (data.get('email') or '').strip()
        password = data.get('password', '')
        name     = (data.get('name') or email.split('@')[0]).strip()

        sb   = get_supabase()
        resp = sb.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"name": name, "full_name": name}}
        })

        if not resp.user:
            return jsonify({"error": "Signup failed. Please try again."}), 400

        # Persist profile in custom table (best-effort)
        try:
            sb.table('users').upsert({
                "id": resp.user.id, "email": email, "name": name,
                "total_xp": 0, "current_streak": 0,
                "created_at": now_iso(),
            }).execute()
        except Exception:
            pass

        return jsonify({
            "user": {
                "id": resp.user.id, "email": email, "name": name,
                "total_xp": 0, "current_streak": 0, "is_new_user": True,
            },
            "access_token":  resp.session.access_token  if resp.session else None,
            "refresh_token": resp.session.refresh_token if resp.session else None,
        }), 201

    except Exception as e:
        msg = str(e)
        if 'already registered' in msg.lower() or 'already been registered' in msg.lower():
            return jsonify({"error": "An account with this email already exists."}), 409
        return jsonify({"error": "Signup failed. Please check your details."}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data     = request.get_json() or {}
        email    = (data.get('email') or '').strip()
        password = data.get('password', '')

        sb   = get_supabase()
        resp = sb.auth.sign_in_with_password({"email": email, "password": password})

        # Resolve display name: auth metadata → users table → email prefix
        meta = resp.user.user_metadata or {}
        name = meta.get('name') or meta.get('full_name') or ''

        profile = {}
        try:
            prof = sb.table('users').select('*').eq('id', resp.user.id).single().execute()
            profile = prof.data or {}
            if not name:
                name = profile.get('name', '')
        except Exception:
            pass

        if not name:
            name = email.split('@')[0]

        return jsonify({
            "user": {
                "id":             resp.user.id,
                "email":          email,
                "name":           name,
                "total_xp":       profile.get('total_xp', 0),
                "current_streak": profile.get('current_streak', 0),
                "is_new_user":    False,
            },
            "access_token":  resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }), 200

    except Exception as e:
        msg = str(e).lower()
        if 'invalid' in msg or 'credentials' in msg or 'password' in msg or '400' in msg:
            return jsonify({"error": "Incorrect password. Please try again."}), 401
        if 'not found' in msg or 'no user' in msg or '404' in msg:
            return jsonify({"error": "No account found with this email."}), 401
        return jsonify({"error": "Login failed. Please check your credentials."}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    try:
        get_supabase().auth.sign_out()
    except Exception:
        pass
    return jsonify({"message": "Logged out successfully"}), 200

@app.route('/api/auth/me')
def me():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    meta = user.user_metadata or {}
    name = meta.get('name') or meta.get('full_name') or ''
    profile = {}
    try:
        prof = get_supabase().table('users').select('*').eq('id', user.id).single().execute()
        profile = prof.data or {}
        if not name:
            name = profile.get('name', '')
    except Exception:
        pass
    if not name:
        name = (user.email or '').split('@')[0]

    return jsonify({"user": {
        "id":             user.id,
        "email":          user.email,
        "name":           name,
        "total_xp":       profile.get('total_xp', 0),
        "current_streak": profile.get('current_streak', 0),
        "avatar_url":     profile.get('avatar_url', meta.get('avatar_url', '')),
    }}), 200

@app.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    try:
        data = request.get_json() or {}
        rt   = data.get('refresh_token', '')
        resp = get_supabase().auth.refresh_session(rt)
        return jsonify({
            "access_token":  resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 401

# ══════════════════════════════════════════════════════════════════════════
# USER PROFILE & DASHBOARD
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/user/profile', methods=['GET'])
@require_auth
def get_profile(user):
    meta = user.user_metadata or {}
    profile = {}
    try:
        r = get_supabase().table('users').select('*').eq('id', user.id).single().execute()
        profile = r.data or {}
    except Exception:
        pass
    name = profile.get('name') or meta.get('name') or meta.get('full_name') or user.email.split('@')[0]
    return jsonify({"profile": {
        "id":             user.id,
        "email":          user.email,
        "name":           name,
        "bio":            profile.get('bio', ''),
        "avatar_url":     profile.get('avatar_url', ''),
        "total_xp":       profile.get('total_xp', 0),
        "current_streak": profile.get('current_streak', 0),
    }}), 200

@app.route('/api/user/profile', methods=['PUT', 'PATCH'])
@require_auth
def update_profile(user):
    try:
        data = request.get_json() or {}
        get_supabase().table('users').upsert({
            "id": user.id, **data, "updated_at": now_iso()
        }).execute()
        return jsonify({"message": "Profile updated", "profile": data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/dashboard')
@require_auth
def dashboard(user):
    profile = {}
    try:
        r = get_supabase().table('users').select('*').eq('id', user.id).single().execute()
        profile = r.data or {}
    except Exception:
        pass
    xp     = profile.get('total_xp', 0)
    streak = profile.get('current_streak', 0)
    return jsonify({
        "xp": xp, "streak": streak,
        "level": max(1, xp // 100),
        "stats": {"quizzes_taken": 0, "average_score": 0, "focus_minutes": 0},
        "recent_activities": [],
    }), 200

# ══════════════════════════════════════════════════════════════════════════
# AI TUTOR / CHAT
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/tutor/chat', methods=['POST'])
def tutor_chat():
    try:
        data    = request.get_json() or {}
        message = data.get('message', '')
        history = data.get('conversation_history', [])

        messages = [{
            "role": "system",
            "content": "You are Obsidian, an expert AI learning assistant. Help students understand concepts clearly, generate practice questions, and explain topics at any level. Be thorough, encouraging, and use markdown formatting."
        }] + history + [{"role": "user", "content": message}]

        resp  = get_ai().chat.completions.create(model=AI_MODEL, messages=messages, max_tokens=1200)
        reply = resp.choices[0].message.content

        return jsonify({
            "response": reply,
            "conversation_history": history + [
                {"role": "user",      "content": message},
                {"role": "assistant", "content": reply},
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": f"AI service error: {str(e)}"}), 500

@app.route('/api/tutor/explain', methods=['POST'])
def tutor_explain():
    try:
        data  = request.get_json() or {}
        topic = data.get('topic', '')
        level = data.get('level', 'intermediate')
        reply = ai_complete(f"Explain '{topic}' at a {level} level. Use clear markdown formatting.", 900)
        return jsonify({"explanation": reply}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════════════
# QUIZ
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/quiz/generate', methods=['POST'])
def quiz_generate():
    try:
        data       = request.get_json() or {}
        topic      = data.get('topic', 'General Knowledge')
        difficulty = data.get('difficulty', 'medium')
        num_q      = min(int(data.get('num_questions', 5)), 10)

        prompt = f"""Generate exactly {num_q} multiple-choice quiz questions about "{topic}" at {difficulty} difficulty.
Return ONLY a valid JSON array. No text before or after. Example format:
[
  {{
    "question": "Question text?",
    "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct": 0,
    "explanation": "Why Choice A is correct.",
    "difficulty": "{difficulty}"
  }}
]
"correct" is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D)."""

        raw       = ai_complete(prompt, 2048)
        questions = extract_json(raw, [])

        if not isinstance(questions, list) or len(questions) == 0:
            return jsonify({"error": "Failed to generate quiz questions. Please try again."}), 500

        quiz_id = str(uuid.uuid4())[:8]

        # Persist (best-effort)
        user = get_user_from_token()
        if user:
            try:
                get_supabase().table('quizzes').insert({
                    "id": quiz_id, "user_id": user.id,
                    "title": f"{topic} Quiz", "topic": topic,
                    "difficulty": difficulty, "questions": questions,
                    "created_at": now_iso(),
                }).execute()
            except Exception:
                pass

        return jsonify({
            "id": quiz_id, "title": f"{topic} Quiz",
            "topic": topic, "difficulty": difficulty, "questions": questions,
        }), 200

    except Exception as e:
        return jsonify({"error": f"Quiz generation failed: {str(e)}"}), 500

@app.route('/api/quiz/<quiz_id>/submit', methods=['POST'])
def quiz_submit(quiz_id):
    try:
        data       = request.get_json() or {}
        answers    = data.get('answers', {})
        time_taken = data.get('time_taken', 0)

        questions = []
        try:
            q = get_supabase().table('quizzes').select('questions').eq('id', quiz_id).single().execute()
            questions = (q.data or {}).get('questions', [])
        except Exception:
            pass

        score, results = 0, []
        for i, q in enumerate(questions):
            ua = answers.get(str(i), answers.get(i, -1))
            ca = q.get('correct', -1)
            ok = int(str(ua)) == int(str(ca)) if str(ua).lstrip('-').isdigit() and str(ca).lstrip('-').isdigit() else str(ua) == str(ca)
            if ok:
                score += 1
            results.append({
                "question": q.get('question', ''),
                "user_answer": ua, "correct_answer": ca,
                "is_correct": ok, "explanation": q.get('explanation', ''),
            })

        total      = max(len(questions), 1)
        percentage = round(score / total * 100, 1)
        xp_earned  = score * 50

        # Update XP
        user = get_user_from_token()
        if user:
            try:
                sb   = get_supabase()
                prof = sb.table('users').select('total_xp').eq('id', user.id).single().execute()
                old  = (prof.data or {}).get('total_xp', 0)
                sb.table('users').update({"total_xp": old + xp_earned}).eq('id', user.id).execute()
            except Exception:
                pass

        return jsonify({
            "attempt": {
                "id": quiz_id + "_att", "quiz_id": quiz_id,
                "score": score, "total": total, "percentage": percentage,
                "time_taken": time_taken, "date": now_iso(),
            },
            "results": results, "score": score, "total": total,
            "percentage": percentage, "xp": {"xp_earned": xp_earned},
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quiz/history')
def quiz_history():
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    try:
        r = get_supabase().table('quizzes').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/quiz/stats')
def quiz_stats():
    return jsonify({"total_attempts": 0, "average_percentage": 0, "total_correct": 0, "total_questions": 0}), 200

@app.route('/api/quiz/<quiz_id>')
def get_quiz(quiz_id):
    try:
        r = get_supabase().table('quizzes').select('*').eq('id', quiz_id).single().execute()
        return jsonify(r.data or {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

# ══════════════════════════════════════════════════════════════════════════
# NOTES
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/notes/generate', methods=['POST'])
def notes_generate():
    try:
        data    = request.get_json() or {}
        topic   = data.get('topic', '')
        subject = data.get('subject', 'General')

        prompt = f"""Create comprehensive study notes for: "{topic}" (Subject: {subject}).
Return ONLY valid JSON, no text before or after:
{{
  "title": "Clear title for these notes",
  "summary": "One paragraph summary of the topic",
  "content": "Full markdown study notes with headers, bullet points, and examples",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "examples": ["Example 1", "Example 2"],
  "formulas": ["Formula or rule 1 (if applicable)"],
  "relatedTopics": ["Related topic 1", "Related topic 2", "Related topic 3"]
}}"""

        raw     = ai_complete(prompt, 2048)
        ai_data = extract_json(raw, {
            "title": topic, "summary": f"Study notes for {topic}.",
            "content": raw, "keyPoints": [], "examples": [],
            "formulas": [], "relatedTopics": [],
        })

        note_id = str(uuid.uuid4())[:8]
        note = {
            "id": note_id,
            "title":      ai_data.get('title', topic),
            "content":    ai_data.get('content', ''),
            "tags":       [subject, 'AI-Generated'],
            "subject":    subject,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }

        user = get_user_from_token()
        if user:
            try:
                get_supabase().table('notes').insert({**note, "user_id": user.id}).execute()
            except Exception:
                pass

        return jsonify({"note": note, "ai_data": ai_data}), 200

    except Exception as e:
        return jsonify({"error": f"Notes generation failed: {str(e)}"}), 500

@app.route('/api/notes', methods=['GET'])
def notes_list():
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    try:
        r = get_supabase().table('notes').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/notes', methods=['POST'])
def notes_create():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data    = request.get_json() or {}
        note_id = str(uuid.uuid4())[:8]
        note = {
            "id": note_id, "user_id": user.id,
            "title":      data.get('title', 'Untitled'),
            "content":    data.get('content', ''),
            "tags":       data.get('tags', []),
            "subject":    data.get('subject', 'General'),
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        get_supabase().table('notes').insert(note).execute()
        return jsonify(note), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes/search')
def notes_search():
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    q = request.args.get('q', '')
    try:
        r = get_supabase().table('notes').select('*').eq('user_id', user.id).ilike('title', f'%{q}%').execute()
        return jsonify(r.data or []), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/notes/<note_id>', methods=['GET'])
def notes_get(note_id):
    try:
        r = get_supabase().table('notes').select('*').eq('id', note_id).single().execute()
        return jsonify(r.data or {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/api/notes/<note_id>', methods=['PUT', 'PATCH'])
@require_auth
def notes_update(user, note_id):
    try:
        data = request.get_json() or {}
        data['updated_at'] = now_iso()
        get_supabase().table('notes').update(data).eq('id', note_id).eq('user_id', user.id).execute()
        return jsonify({"id": note_id, **data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@require_auth
def notes_delete(user, note_id):
    try:
        get_supabase().table('notes').delete().eq('id', note_id).eq('user_id', user.id).execute()
        return jsonify({"success": True, "message": "Note deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════════════
# MIND MAP
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/mindmap/generate', methods=['POST'])
def mindmap_generate():
    try:
        data  = request.get_json() or {}
        topic = data.get('topic', 'General')

        prompt = f"""Create a rich mind map for the topic: "{topic}".
Return ONLY valid JSON, no text before or after:
{{
  "topics": [
    {{"id": "root", "label": "{topic}", "x": 400, "y": 300, "isRoot": true, "description": "Central concept of {topic}"}},
    {{"id": "n1", "parentId": "root", "label": "Core Concepts", "x": 180, "y": 160, "description": "Fundamental ideas and definitions"}},
    {{"id": "n1a", "parentId": "n1", "label": "Definition", "x": 80, "y": 80, "description": "What {topic} means"}},
    {{"id": "n1b", "parentId": "n1", "label": "Key Principles", "x": 80, "y": 200, "description": "The main rules or laws"}},
    {{"id": "n2", "parentId": "root", "label": "Applications", "x": 620, "y": 160, "description": "Real-world uses of {topic}"}},
    {{"id": "n2a", "parentId": "n2", "label": "Industry Use", "x": 720, "y": 80, "description": "How professionals use this"}},
    {{"id": "n2b", "parentId": "n2", "label": "Examples", "x": 720, "y": 200, "description": "Concrete examples"}},
    {{"id": "n3", "parentId": "root", "label": "Challenges", "x": 180, "y": 440, "description": "Common difficulties"}},
    {{"id": "n4", "parentId": "root", "label": "Future Trends", "x": 620, "y": 440, "description": "Where {topic} is heading"}}
  ]
}}
Replace all placeholder text with REAL, specific content about "{topic}"."""

        raw    = ai_complete(prompt, 1500)
        parsed = extract_json(raw, {"topics": []})
        topics = parsed.get('topics', []) if isinstance(parsed, dict) else []

        if not topics:
            # Fallback structure
            topics = [
                {"id": "root", "label": topic, "x": 400, "y": 300, "isRoot": True, "description": f"Central topic: {topic}"},
                {"id": "n1", "parentId": "root", "label": "Core Concepts", "x": 180, "y": 160, "description": "Fundamental principles"},
                {"id": "n2", "parentId": "root", "label": "Applications", "x": 620, "y": 160, "description": "Real-world uses"},
                {"id": "n3", "parentId": "root", "label": "Challenges", "x": 180, "y": 440, "description": "Common difficulties"},
                {"id": "n4", "parentId": "root", "label": "Future Trends", "x": 620, "y": 440, "description": "Upcoming developments"},
            ]

        map_id = str(uuid.uuid4())[:8]
        result = {
            "id": map_id,
            "title": f"{topic} Mind Map",
            "topics": topics,
            "ai_generated": True,
            "created_at": now_iso(),
        }

        user = get_user_from_token()
        if user:
            try:
                get_supabase().table('mindmaps').insert({**result, "user_id": user.id}).execute()
            except Exception:
                pass

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Mind map generation failed: {str(e)}"}), 500

@app.route('/api/mindmap', methods=['GET'])
def mindmap_list():
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    try:
        r = get_supabase().table('mindmaps').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/mindmap', methods=['POST'])
@require_auth
def mindmap_create(user):
    try:
        data   = request.get_json() or {}
        map_id = str(uuid.uuid4())[:8]
        mm = {
            "id": map_id, "user_id": user.id,
            "title":        data.get('title', 'Untitled Map'),
            "topics":       data.get('topics', []),
            "ai_generated": False, "created_at": now_iso(),
        }
        get_supabase().table('mindmaps').insert(mm).execute()
        return jsonify(mm), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/mindmap/<map_id>', methods=['GET'])
def mindmap_get(map_id):
    try:
        r = get_supabase().table('mindmaps').select('*').eq('id', map_id).single().execute()
        return jsonify(r.data or {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/api/mindmap/<map_id>', methods=['PUT', 'PATCH'])
@require_auth
def mindmap_update(user, map_id):
    try:
        data = request.get_json() or {}
        get_supabase().table('mindmaps').update(data).eq('id', map_id).eq('user_id', user.id).execute()
        return jsonify({"id": map_id, **data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/mindmap/<map_id>', methods=['DELETE'])
@require_auth
def mindmap_delete(user, map_id):
    try:
        get_supabase().table('mindmaps').delete().eq('id', map_id).eq('user_id', user.id).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ══════════════════════════════════════════════════════════════════════════
# STUDY PLANNER
# ══════════════════════════════════════════════════════════════════════════
@app.route('/api/study/plan', methods=['POST'])
@require_auth
def study_plan_create(user):
    try:
        data    = request.get_json() or {}
        subject = data.get('subject', 'General')
        weeks_n = int(data.get('duration_weeks', 4))
        level   = data.get('current_level', 'intermediate')

        prompt = f"""Create a {weeks_n}-week study plan for "{subject}" at {level} level.
Return ONLY valid JSON:
{{
  "weeks": [
    {{
      "week": 1,
      "title": "Week 1 title",
      "tasks": [
        {{"id": "t-1-1", "title": "Task 1", "completed": false}},
        {{"id": "t-1-2", "title": "Task 2", "completed": false}},
        {{"id": "t-1-3", "title": "Task 3", "completed": false}}
      ]
    }}
  ]
}}"""

        raw    = ai_complete(prompt, 1500)
        parsed = extract_json(raw, {"weeks": []})
        weeks  = parsed.get('weeks', []) if isinstance(parsed, dict) else []

        if not weeks:
            weeks = [{"week": i+1, "title": f"Week {i+1}: {subject}", "tasks": [
                {"id": f"t-{i}-1", "title": "Read chapter and take notes", "completed": False},
                {"id": f"t-{i}-2", "title": "Practice exercises", "completed": False},
                {"id": f"t-{i}-3", "title": "Take a quiz", "completed": False},
            ]} for i in range(weeks_n)]

        plan_id = str(uuid.uuid4())[:8]
        plan = {
            "id": plan_id, "user_id": user.id,
            "subject": subject, "duration_weeks": weeks_n,
            "current_level": level, "progress": 0,
            "weeks": weeks, "created_at": now_iso(),
        }
        try:
            get_supabase().table('study_plans').insert(plan).execute()
        except Exception:
            pass
        return jsonify(plan), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study/plans')
@require_auth
def study_plans_list(user):
    try:
        r = get_supabase().table('study_plans').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
        return jsonify(r.data or []), 200
    except Exception:
        return jsonify([]), 200

@app.route('/api/study/plan/<plan_id>')
@require_auth
def study_plan_get(user, plan_id):
    try:
        r = get_supabase().table('study_plans').select('*').eq('id', plan_id).single().execute()
        return jsonify(r.data or {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 404

@app.route('/api/study/plan/<plan_id>/progress', methods=['PUT', 'PATCH'])
@require_auth
def study_plan_progress(user, plan_id):
    try:
        data = request.get_json() or {}
        prog = data.get('progress', 0)
        get_supabase().table('study_plans').update({"progress": prog}).eq('id', plan_id).eq('user_id', user.id).execute()
        return jsonify({"progress": prog}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study/session', methods=['POST'])
@require_auth
def study_session_create(user):
    try:
        data     = request.get_json() or {}
        mins     = int(data.get('duration_minutes', 0))
        subject  = data.get('subject', 'General Study')
        notes    = data.get('notes', '')
        xp       = mins * 2
        session  = {
            "id": str(uuid.uuid4())[:8], "user_id": user.id,
            "duration_minutes": mins, "subject": subject,
            "notes": notes, "xp_earned": xp, "date": now_iso(),
        }
        try:
            get_supabase().table('study_sessions').insert(session).execute()
            sb   = get_supabase()
            prof = sb.table('users').select('total_xp').eq('id', user.id).single().execute()
            old  = (prof.data or {}).get('total_xp', 0)
            sb.table('users').update({"total_xp": old + xp}).eq('id', user.id).execute()
        except Exception:
            pass
        return jsonify(session), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study/stats')
@require_auth
def study_stats(user):
    try:
        r = get_supabase().table('study_sessions').select('*').eq('user_id', user.id).execute()
        sessions = r.data or []
        total_mins = sum(s.get('duration_minutes', 0) for s in sessions)
        return jsonify({
            "total_sessions": len(sessions),
            "total_minutes": total_mins,
            "xp_earned": total_mins * 2,
            "sessions": sessions,
        }), 200
    except Exception:
        return jsonify({"total_sessions": 0, "total_minutes": 0, "xp_earned": 0, "sessions": []}), 200

# ══════════════════════════════════════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════════════════════════════════════
def _leaderboard_data(order_col='total_xp'):
    try:
        r = get_supabase().table('users').select('id,name,email,total_xp,current_streak,avatar_url').order(order_col, desc=True).limit(50).execute()
        rows = r.data or []
        # Mask email for display name fallback
        for row in rows:
            if not row.get('name'):
                row['name'] = (row.get('email') or '').split('@')[0]
        return rows
    except Exception:
        return []

@app.route('/api/leaderboard/global')
def leaderboard_global():
    return jsonify(_leaderboard_data('total_xp')), 200

@app.route('/api/leaderboard/streak')
def leaderboard_streak():
    return jsonify(_leaderboard_data('current_streak')), 200

@app.route('/api/leaderboard/rank')
def leaderboard_rank():
    user = get_user_from_token()
    rows = _leaderboard_data('total_xp')
    rank = next((i+1 for i, r in enumerate(rows) if r.get('id') == (user.id if user else '')), len(rows))
    return jsonify({"rank": rank, "total_users": len(rows), "user": {}}), 200

@app.route('/api/leaderboard')
def leaderboard_fallback():
    return jsonify(_leaderboard_data('total_xp')), 200

# ══════════════════════════════════════════════════════════════════════════
# CATCH-ALL
# ══════════════════════════════════════════════════════════════════════════
@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "detail": str(e)}), 500
