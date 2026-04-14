"""Transparency bundle model."""
from models import db
from datetime import datetime
import uuid


class TransparencyBundle(db.Model):
    __tablename__ = 'transparency_bundles'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"tb_{uuid.uuid4().hex[:16]}")
    submission_id = db.Column(db.String(64), nullable=False, index=True)
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return dict(self.payload) if self.payload else {}
