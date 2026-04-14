from __future__ import annotations
"""Submission repository — indexed queries replacing linear scan."""
from models import db
from models.submission import Submission


class SubmissionRepo:
    @staticmethod
    def find_by_submission_id(submission_id: str) -> Submission | None:
        return Submission.query.filter_by(submission_id=submission_id).first()

    @staticmethod
    def find_by_email(email: str, page: int = 1, per_page: int = 50):
        return Submission.query.filter_by(created_by=email) \
            .order_by(Submission.updated_at.desc()) \
            .paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def find_all(page: int = 1, per_page: int = 50, status: str = None):
        query = Submission.query
        if status:
            query = query.filter_by(status=status)
        return query.order_by(Submission.updated_at.desc()) \
            .paginate(page=page, per_page=per_page, error_out=False)

    @staticmethod
    def find_approved_by_parcel(parcel_id: str) -> Submission | None:
        return Submission.query.filter_by(
            parcel_id=parcel_id, status='APPROVED'
        ).order_by(Submission.revision_number.desc()).first()

    @staticmethod
    def create(data: dict) -> Submission:
        sub = Submission()
        sub.update_from_payload(data)
        sub.audit_trail = data.get('meta', {}).get('audit_trail', [])
        db.session.add(sub)
        db.session.commit()
        return sub

    @staticmethod
    def update(submission: Submission, data: dict) -> Submission:
        submission.update_from_payload(data)
        submission.audit_trail = data.get('meta', {}).get('audit_trail', submission.audit_trail)
        db.session.commit()
        return submission

    @staticmethod
    def delete(submission: Submission):
        db.session.delete(submission)
        db.session.commit()

    @staticmethod
    def count_by_status() -> dict:
        """Get submission counts grouped by status."""
        from sqlalchemy import func
        results = db.session.query(
            Submission.status, func.count(Submission.id)
        ).group_by(Submission.status).all()
        return {status: count for status, count in results}
