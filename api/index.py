"""
api/index.py
============
Vercel Serverless Function entry point for the Flask backend.
"""

import sys
import os
import traceback

# ── Path setup ─────────────────────────────────────────────────────────────
# Include the Flask backend source on sys.path
_BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'obsidian-backend-flask')
sys.path.insert(0, os.path.abspath(_BACKEND_DIR))

# ── Attempt to load the full Flask app ─────────────────────────────────────
_import_error = None
_import_traceback = None

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(_BACKEND_DIR, '.env'))
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env'))
except ImportError:
    pass

try:
    from app import create_app
    app = create_app()
    app.config['PREFERRED_URL_SCHEME'] = 'https'

except Exception as e:
    _import_error = str(e)
    _import_traceback = traceback.format_exc()

    # ── Fallback diagnostic app ─────────────────────────────────────────────
    # If the real Flask app fails to load, this diagnostic app returns the
    # exact Python error so we can see what went wrong.
    from flask import Flask, jsonify
    app = Flask(__name__)

    @app.route('/health')
    @app.route('/api/test')
    @app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
    def diagnostic(path=''):
        return jsonify({
            "status": "error",
            "message": "Flask app failed to initialize",
            "error": _import_error,
            "traceback": _import_traceback,
            "backend_dir": _BACKEND_DIR,
            "backend_exists": os.path.isdir(_BACKEND_DIR),
            "backend_files": os.listdir(_BACKEND_DIR) if os.path.isdir(_BACKEND_DIR) else [],
            "sys_path": sys.path[:5],
            "cwd": os.getcwd(),
            "cwd_files": os.listdir(os.getcwd()),
        }), 500
