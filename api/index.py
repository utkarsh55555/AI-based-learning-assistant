"""
api/index.py
============
Self-contained Flask serverless function for Vercel.
All logic lives here — no external backend imports needed.
"""

import os
import json
import time
import traceback
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify
from flask_cors import CORS

# ── App factory ────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

CORS(app,
     resources={r"/api/*": {"origins": os.environ.get('CORS_ORIGINS', '*').split(',')}},
     allow_headers=["Content-Type", "Authorization", "X-CSRF-Token"],
     methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
     supports_credentials=False)

# ── Lazy clients (initialized on first use) ────────────────────────────────
_supabase = None
_openai   = None

def get_supabase():
    global _supabase
    if _supabase is None:
        from supabase import create_client
        url = os.environ.get('SUPABASE_URL', '')
        key = os.environ.get('SUPABASE_SERVICE_KEY', os.environ.get('SUPABASE_ANON_KEY', ''))
        _supabase = create_client(url, key)
    return _supabase

def get_openai():
    global _openai
    if _openai is None:
        from openai import OpenAI
        _openai = OpenAI(
            api_key=os.environ.get('OPENROUTER_API_KEY', ''),
            base_url=os.environ.get('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        )
    return _openai

# ── Auth helper ────────────────────────────────────────────────────────────
def get_user_from_token():
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:]
    try:
        sb = get_supabase()
        user = sb.auth.get_user(token)
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

# ── Error handlers ─────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

# ══════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════

# ── Health / Info ──────────────────────────────────────────────────────────
@app.route('/health')
def health():
    return jsonify({"status": "healthy", "message": "Obsidian API is running"}), 200

@app.route('/api/test')
def api_test():
    return jsonify({"status": "ok", "message": "Backend is reachable"}), 200

@app.route('/api/')
@app.route('/')
def root():
    return jsonify({
        "name": "Obsidian API",
        "version": "1.0.0",
        "description": "AI Learning Companion Backend",
        "endpoints": {
            "auth": "/api/auth",
            "quiz": "/api/quiz",
            "tutor": "/api/tutor",
            "notes": "/api/notes",
            "mindmap": "/api/mindmap",
            "study": "/api/study",
            "leaderboard": "/api/leaderboard",
        }
    }), 200

# ── CSRF Token (no-op in serverless — we rely on CORS + Bearer token) ─────
@app.route('/api/csrf-token', methods=['GET'])
def csrf_token():
    import secrets
    return jsonify({"csrf_token": secrets.token_hex(32)}), 200

# ── AUTH ───────────────────────────────────────────────────────────────────
@app.route('/api/auth/signup', methods=['POST', 'OPTIONS'])
def signup():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data = request.get_json() or {}
        email    = data.get('email', '')
        password = data.get('password', '')
        name     = data.get('name', email.split('@')[0])

        sb = get_supabase()
        resp = sb.auth.sign_up({"email": email, "password": password})

        if resp.user:
            # Upsert profile
            try:
                sb.table('users').upsert({
                    "id": resp.user.id,
                    "email": email,
                    "name": name,
                    "total_xp": 0,
                    "current_streak": 0,
                }).execute()
            except Exception:
                pass

        return jsonify({
            "user": {
                "id": resp.user.id if resp.user else None,
                "email": email,
                "name": name,
            },
            "access_token":  resp.session.access_token  if resp.session else None,
            "refresh_token": resp.session.refresh_token if resp.session else None,
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data = request.get_json() or {}
        email    = data.get('email', '')
        password = data.get('password', '')

        sb   = get_supabase()
        resp = sb.auth.sign_in_with_password({"email": email, "password": password})

        # Fetch profile
        profile = {}
        try:
            prof = sb.table('users').select('*').eq('id', resp.user.id).single().execute()
            profile = prof.data or {}
        except Exception:
            pass

        return jsonify({
            "user": {
                "id":             resp.user.id,
                "email":          resp.user.email,
                "name":           profile.get('name', resp.user.email.split('@')[0]),
                "total_xp":       profile.get('total_xp', 0),
                "current_streak": profile.get('current_streak', 0),
            },
            "access_token":  resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 401

@app.route('/api/auth/logout', methods=['POST', 'OPTIONS'])
def logout():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if token:
            get_supabase().auth.sign_out()
    except Exception:
        pass
    return jsonify({"message": "Logged out"}), 200

@app.route('/api/auth/me', methods=['GET'])
def me():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        prof = get_supabase().table('users').select('*').eq('id', user.id).single().execute()
        profile = prof.data or {}
    except Exception:
        profile = {}
    return jsonify({"user": {
        "id":             user.id,
        "email":          user.email,
        "name":           profile.get('name', ''),
        "total_xp":       profile.get('total_xp', 0),
        "current_streak": profile.get('current_streak', 0),
    }}), 200

@app.route('/api/auth/refresh', methods=['POST'])
def refresh():
    try:
        data = request.get_json() or {}
        refresh_token = data.get('refresh_token', '')
        resp = get_supabase().auth.refresh_session(refresh_token)
        return jsonify({
            "access_token":  resp.session.access_token,
            "refresh_token": resp.session.refresh_token,
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 401

# ── TUTOR / AI CHAT ────────────────────────────────────────────────────────
@app.route('/api/tutor/chat', methods=['POST', 'OPTIONS'])
def tutor_chat():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data    = request.get_json() or {}
        message = data.get('message', '')
        history = data.get('conversation_history', [])

        client = get_openai()
        messages = [
            {"role": "system", "content": "You are Obsidian, an expert AI learning assistant. Help students understand concepts clearly, generate practice questions, and build mind maps. Be encouraging and thorough."},
        ] + history + [{"role": "user", "content": message}]

        resp = client.chat.completions.create(
            model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            messages=messages,
            max_tokens=1024,
        )

        reply = resp.choices[0].message.content
        new_history = history + [
            {"role": "user",      "content": message},
            {"role": "assistant", "content": reply},
        ]
        return jsonify({"response": reply, "conversation_history": new_history}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── QUIZ ───────────────────────────────────────────────────────────────────
@app.route('/api/quiz/generate', methods=['POST', 'OPTIONS'])
def quiz_generate():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data       = request.get_json() or {}
        topic      = data.get('topic', 'General Knowledge')
        difficulty = data.get('difficulty', 'medium')
        num_q      = min(int(data.get('num_questions', 5)), 10)

        client = get_openai()
        prompt = f"""Generate {num_q} multiple-choice quiz questions about "{topic}" at {difficulty} difficulty.
Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Why this answer is correct."
  }}
]
"correct" is the 0-based index of the correct option."""

        resp = client.chat.completions.create(
            model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )

        raw = resp.choices[0].message.content.strip()
        # Extract JSON array from response
        start = raw.find('[')
        end   = raw.rfind(']') + 1
        questions = json.loads(raw[start:end]) if start != -1 else []

        import uuid
        quiz_id = str(uuid.uuid4())[:8]

        # Save to Supabase if user is authenticated
        user = get_user_from_token()
        if user:
            try:
                get_supabase().table('quizzes').insert({
                    "id": quiz_id, "user_id": user.id,
                    "title": f"{topic} Quiz", "topic": topic,
                    "difficulty": difficulty, "questions": questions,
                }).execute()
            except Exception:
                pass

        return jsonify({
            "id": quiz_id, "title": f"{topic} Quiz",
            "topic": topic, "difficulty": difficulty,
            "questions": questions,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quiz/<quiz_id>/submit', methods=['POST', 'OPTIONS'])
def quiz_submit(quiz_id):
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data       = request.get_json() or {}
        answers    = data.get('answers', {})
        time_taken = data.get('time_taken', 0)

        # Try to get quiz from Supabase
        questions = []
        try:
            q = get_supabase().table('quizzes').select('questions').eq('id', quiz_id).single().execute()
            questions = q.data.get('questions', []) if q.data else []
        except Exception:
            pass

        score = 0
        results = []
        for i, q in enumerate(questions):
            user_ans    = answers.get(str(i), answers.get(i, -1))
            correct_ans = q.get('correct', -1)
            is_correct  = str(user_ans) == str(correct_ans) or user_ans == correct_ans
            if is_correct:
                score += 1
            results.append({
                "question":       q.get('question', ''),
                "user_answer":    user_ans,
                "correct_answer": correct_ans,
                "is_correct":     is_correct,
                "explanation":    q.get('explanation', ''),
            })

        total      = len(questions)
        percentage = (score / total * 100) if total > 0 else 0
        xp_earned  = score * 50

        # Update user XP
        user = get_user_from_token()
        if user:
            try:
                sb   = get_supabase()
                prof = sb.table('users').select('total_xp').eq('id', user.id).single().execute()
                old_xp = prof.data.get('total_xp', 0) if prof.data else 0
                sb.table('users').update({"total_xp": old_xp + xp_earned}).eq('id', user.id).execute()
            except Exception:
                pass

        attempt = {
            "id": quiz_id + "_attempt",
            "quiz_id": quiz_id, "score": score, "total": total,
            "percentage": percentage, "time_taken": time_taken,
            "date": datetime.utcnow().isoformat(),
        }

        return jsonify({
            "attempt": attempt, "results": results,
            "score": score, "total": total,
            "percentage": percentage,
            "xp": {"xp_earned": xp_earned},
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quiz/history', methods=['GET'])
def quiz_history():
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    try:
        resp = get_supabase().table('quizzes').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
        return jsonify(resp.data or []), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/quiz/stats', methods=['GET'])
def quiz_stats():
    return jsonify({"total_attempts": 0, "average_percentage": 0}), 200

# ── MIND MAP ───────────────────────────────────────────────────────────────
@app.route('/api/mindmap/generate', methods=['POST', 'OPTIONS'])
def mindmap_generate():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data  = request.get_json() or {}
        topic = data.get('topic', 'General')

        client = get_openai()
        prompt = f"""Create a detailed mind map structure for the topic: "{topic}"
Return ONLY valid JSON in this format:
{{
  "nodes": [
    {{"id": "root", "label": "{topic}", "x": 400, "y": 300, "isRoot": true, "description": "Central topic"}},
    {{"id": "n1", "parentId": "root", "label": "Subtopic 1", "x": 200, "y": 150, "description": "..."}}
  ]
}}
Include 1 root node and 6-8 child/grandchild nodes with varied x,y positions."""

        resp = client.chat.completions.create(
            model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )

        raw   = resp.choices[0].message.content.strip()
        start = raw.find('{')
        end   = raw.rfind('}') + 1
        data_parsed = json.loads(raw[start:end]) if start != -1 else {"nodes": []}
        nodes = data_parsed.get('nodes', [])

        return jsonify({"topic": topic, "nodes": nodes}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── NOTES ──────────────────────────────────────────────────────────────────
@app.route('/api/notes/generate', methods=['POST', 'OPTIONS'])
def notes_generate():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data    = request.get_json() or {}
        topic   = data.get('topic', '')
        subject = data.get('subject', 'General')

        client = get_openai()
        prompt = f"""Generate comprehensive study notes for: "{topic}" (Subject: {subject})
Return ONLY valid JSON:
{{
  "title": "...",
  "summary": "...",
  "content": "Full markdown notes here...",
  "keyPoints": ["point1", "point2", "point3"],
  "examples": ["example1", "example2"],
  "formulas": [],
  "relatedTopics": ["topic1", "topic2"]
}}"""

        resp = client.chat.completions.create(
            model=os.environ.get('OPENROUTER_MODEL', 'openai/gpt-4o-mini'),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
        )

        raw   = resp.choices[0].message.content.strip()
        start = raw.find('{')
        end   = raw.rfind('}') + 1
        ai_data = json.loads(raw[start:end]) if start != -1 else {"title": topic, "content": raw}

        import uuid
        note_id = str(uuid.uuid4())[:8]
        note = {
            "id":         note_id,
            "title":      ai_data.get('title', topic),
            "content":    ai_data.get('content', ''),
            "tags":       [subject, 'AI-Generated'],
            "subject":    subject,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Save to Supabase
        user = get_user_from_token()
        if user:
            try:
                get_supabase().table('notes').insert({**note, "user_id": user.id}).execute()
            except Exception:
                pass

        return jsonify({"note": note, "ai_data": ai_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notes', methods=['GET', 'POST', 'OPTIONS'])
def notes():
    if request.method == 'OPTIONS':
        return '', 204
    user = get_user_from_token()
    if not user:
        return jsonify([]), 200
    if request.method == 'GET':
        try:
            resp = get_supabase().table('notes').select('*').eq('user_id', user.id).order('created_at', desc=True).execute()
            return jsonify(resp.data or []), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    if request.method == 'POST':
        try:
            data = request.get_json() or {}
            import uuid
            note = {
                "id":         str(uuid.uuid4())[:8],
                "user_id":    user.id,
                "title":      data.get('title', 'Untitled'),
                "content":    data.get('content', ''),
                "tags":       data.get('tags', []),
                "subject":    data.get('subject', 'General'),
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            get_supabase().table('notes').insert(note).execute()
            return jsonify(note), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ── STUDY PLAN ─────────────────────────────────────────────────────────────
@app.route('/api/study/plan', methods=['POST', 'OPTIONS'])
def study_plan():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data = request.get_json() or {}
        return jsonify({"plan": data, "status": "created"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/study/sessions', methods=['GET', 'POST', 'OPTIONS'])
def study_sessions():
    if request.method == 'OPTIONS':
        return '', 204
    return jsonify([]), 200

# ── LEADERBOARD ────────────────────────────────────────────────────────────
@app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    try:
        resp = get_supabase().table('users').select('name,total_xp,current_streak').order('total_xp', desc=True).limit(20).execute()
        return jsonify(resp.data or []), 200
    except Exception as e:
        return jsonify({"error": str(e), "data": []}), 500

# ── USER ───────────────────────────────────────────────────────────────────
@app.route('/api/user/profile', methods=['GET'])
def user_profile():
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        prof = get_supabase().table('users').select('*').eq('id', user.id).single().execute()
        return jsonify(prof.data or {}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/profile', methods=['PUT', 'PATCH', 'OPTIONS'])
def update_profile():
    if request.method == 'OPTIONS':
        return '', 204
    user = get_user_from_token()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        data = request.get_json() or {}
        get_supabase().table('users').update(data).eq('id', user.id).execute()
        return jsonify({"message": "Profile updated"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
