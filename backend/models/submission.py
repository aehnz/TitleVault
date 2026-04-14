"""
Submission model — hybrid approach.
Indexed columns for query performance + JSON payload for the full document.
"""
from models import db
from datetime import datetime
import uuid


class Submission(db.Model):
    __tablename__ = 'submissions'

    id = db.Column(db.String(64), primary_key=True, default=lambda: f"sub_{uuid.uuid4().hex[:16]}")
    submission_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='DRAFT', index=True)
    created_by = db.Column(db.String(255), nullable=False, index=True)
    schema_version = db.Column(db.String(10), default='v1')
    parent_submission_id = db.Column(db.String(64), nullable=True, index=True)
    revision_number = db.Column(db.Integer, default=1)
    locked = db.Column(db.Boolean, default=False)
    parcel_id = db.Column(db.String(64), nullable=True, index=True)
    change_kind = db.Column(db.String(50), nullable=True)

    # Store the full JSON payload (denormalized — normalize in Phase 5 if needed)
    payload = db.Column(db.JSON, nullable=False, default=dict)

    # Audit trail as JSON array
    audit_trail = db.Column(db.JSON, default=list)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        """Return the full submission as the frontend expects it."""
        data = dict(self.payload) if self.payload else {}
        # Ensure meta is synced with indexed columns
        if 'meta' not in data:
            data['meta'] = {}
        data['meta'].update({
            'submission_id': self.submission_id,
            'status': self.status,
            'created_by': self.created_by,
            'schema_version': self.schema_version,
            'parent_submission_id': self.parent_submission_id,
            'revision_number': self.revision_number,
            'locked': self.locked,
            'change_kind': self.change_kind,
            'audit_trail': self.audit_trail or [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        })
        return data

    def update_from_payload(self, data: dict):
        """Sync indexed columns from the incoming payload dict."""
        meta = data.get('meta', {})
        if meta.get('submission_id'):
            self.submission_id = meta['submission_id']
        if meta.get('status'):
            self.status = meta['status']
        if meta.get('created_by'):
            self.created_by = meta['created_by']
        if meta.get('schema_version'):
            self.schema_version = meta['schema_version']
        if meta.get('parent_submission_id') is not None:
            self.parent_submission_id = meta['parent_submission_id']
        if meta.get('revision_number') is not None:
            self.revision_number = meta['revision_number']
        if meta.get('locked') is not None:
            self.locked = meta['locked']
        if meta.get('change_kind') is not None:
            self.change_kind = meta['change_kind']

        # Extract parcel_id for indexing
        parcel = data.get('parcel', {})
        if parcel and parcel.get('parcel_id'):
            self.parcel_id = parcel['parcel_id']

        self.payload = data
