"""
api/index.py
============
Vercel Serverless Function entry point for the Flask backend.
Vercel's Python runtime looks for a callable named `app` or `handler` in this file.
"""

import sys
import os

# Make the Flask app package importable from within Vercel's function environment.
# The backend source lives at src/obsidian-backend-flask relative to the project root.
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'obsidian-backend-flask')
sys.path.insert(0, os.path.abspath(_BACKEND_DIR))

# Load environment variables from .env files if python-dotenv is available
try:
    from dotenv import load_dotenv
    # Try loading from backend dir first, then project root
    load_dotenv(os.path.join(_BACKEND_DIR, '.env'))
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass  # dotenv not critical in production — Vercel injects env vars directly

# Import the Flask application factory
from app import create_app

# Vercel expects a module-level WSGI `app` object
app = create_app()

# Override FORCE_HTTPS for Vercel (already behind TLS proxy)
app.config['PREFERRED_URL_SCHEME'] = 'https'
