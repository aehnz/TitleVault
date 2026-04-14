"""
JWT Authentication Middleware for UDHBHA Property Registry
Provides token creation, verification, and route protection.
"""

import os
import jwt
import functools
from flask import request, jsonify, g
from datetime import datetime, timedelta


# Secret key — MUST be overridden via environment variable in production
SECRET_KEY = os.environ.get('JWT_SECRET', 'udhbha-dev-secret-change-in-production')
TOKEN_EXPIRY_HOURS = int(os.environ.get('TOKEN_EXPIRY_HOURS', '24'))


def create_token(email: str, name: str, role: str = 'surveyor') -> str:
    """
    Create a signed JWT token for an authenticated user.
    
    Args:
        email: User's email address
        name: User's display name
        role: User role (surveyor, auditor, registrar)
    
    Returns:
        Encoded JWT token string
    """
    payload = {
        'email': email,
        'name': name,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    
    Args:
        token: Raw JWT token string
    
    Returns:
        Decoded payload dictionary
    
    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is malformed or tampered
    """
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def require_auth(f):
    """
    Decorator that protects a Flask route with JWT authentication.
    Extracts the Bearer token from the Authorization header, verifies it,
    and injects the decoded user payload into Flask's `g.current_user`.
    
    Usage:
        @app.route('/protected')
        @require_auth
        def protected_route():
            user = g.current_user  # {'email': '...', 'name': '...', 'role': '...'}
            ...
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or malformed Authorization header'}), 401
        
        token = auth_header[7:]  # Strip 'Bearer ' prefix
        
        if not token:
            return jsonify({'error': 'Empty auth token'}), 401
        
        try:
            payload = decode_token(token)
            g.current_user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({'error': 'Invalid auth token', 'code': 'TOKEN_INVALID'}), 401
        
        return f(*args, **kwargs)
    
    return decorated


def require_role(*roles):
    """
    Decorator that restricts a route to specific user roles.
    Must be used AFTER @require_auth.
    
    Usage:
        @app.route('/admin-only')
        @require_auth
        @require_role('auditor', 'registrar')
        def admin_route():
            ...
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            
            if user.get('role') not in roles:
                return jsonify({
                    'error': f'Insufficient permissions. Required role: {", ".join(roles)}',
                    'code': 'FORBIDDEN'
                }), 403
            
            return f(*args, **kwargs)
        return decorated
    return decorator
