"""Audit report model."""
from models import db
from datetime import datetime
import uuid


class AuditReport(db.Model):
    __tablename__ = 'audit_reports'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"aud_{uuid.uuid4().hex[:16]}")
    submission_id = db.Column(db.String(64), nullable=False, index=True)
    audit_id = db.Column(db.String(64), nullable=True)
    parent_submission_id = db.Column(db.String(64), nullable=True)
    auditor_id = db.Column(db.String(255), nullable=True)
    decision = db.Column(db.String(20), nullable=True)  # PASS, RETURNED, FAIL
    payload = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        data = dict(self.payload) if self.payload else {}
        data['submission_id'] = self.submission_id
        data['audit_id'] = self.audit_id
        data['decision'] = self.decision
        return data
