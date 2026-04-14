"""Registrar record model."""
from models import db
from datetime import datetime
import uuid


class RegistrarRecord(db.Model):
    __tablename__ = 'registrar_records'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"reg_{uuid.uuid4().hex[:16]}")
    submission_id = db.Column(db.String(64), nullable=False, unique=True, index=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        data = dict(self.payload) if self.payload else {}
        data['submission_id'] = self.submission_id
        return data
