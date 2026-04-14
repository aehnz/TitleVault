"""User model — stores authentication credentials."""
from models import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password = db.Column(db.String(255), nullable=False)  # bcrypt hash
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='surveyor')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
