from functools import wraps
from flask import request
from utils.response import error_response
import jwt
from config.settings import settings
from supabase_client import supabase

def verify_token(token: str):
    """Verify Supabase JWT token"""
    try:
        # Supabase JWT verification - get_user expects the access token
        response = supabase.auth.get_user(token)
        if response and response.user:
            return response
        return None
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return None

def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return error_response("No authorization header", status_code=401)
        
        try:
            # Extract token from "Bearer <token>"
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            
            user = verify_token(token)
            if not user:
                return error_response("Invalid or expired token", status_code=401)
            
            # Add user to request context
            request.current_user = user
            
            return f(*args, **kwargs)
            
        except IndexError:
            return error_response("Invalid authorization header format", status_code=401)
        except Exception as e:
            return error_response(f"Authentication error: {str(e)}", status_code=401)
    
    return decorated_function

def optional_auth(f):
    """Decorator for optional authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
                user = verify_token(token)
                request.current_user = user
            except:
                request.current_user = None
        else:
            request.current_user = None
        
        return f(*args, **kwargs)
    
    return decorated_function
