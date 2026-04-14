"""
SQLAlchemy models package.
The `db` instance is created here and initialized with the app in the factory.
"""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models so they are registered with SQLAlchemy
from models.user import User
from models.submission import Submission
from models.audit_report import AuditReport
from models.registrar_record import RegistrarRecord
from models.transparency_bundle import TransparencyBundle
