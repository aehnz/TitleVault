from __future__ import annotations
"""User repository — database queries for User model."""
from models import db
from models.user import User


class UserRepo:
    @staticmethod
    def find_by_email(email: str) -> User | None:
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create(email: str, password_hash: str, name: str, role: str = 'surveyor') -> User:
        user = User(email=email, password=password_hash, name=name, role=role)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def update_password(user: User, new_hash: str):
        user.password = new_hash
        db.session.commit()
