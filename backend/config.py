"""
Application configuration — loaded from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('JWT_SECRET', 'udhbha-dev-secret-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///udhbha.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGINS = [
        o.strip()
        for o in os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(',')
    ]
    TOKEN_EXPIRY_HOURS = int(os.environ.get('TOKEN_EXPIRY_HOURS', '24'))
    DEBUG = os.environ.get('FLASK_DEBUG', '1') == '1'
    
    # Supabase Integrations
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')


class TestConfig(Config):
    """Testing configuration."""
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    TESTING = True
