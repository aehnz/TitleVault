from __future__ import annotations
"""Audit repository — queries for AuditReport, RegistrarRecord, TransparencyBundle."""
from models import db
from models.audit_report import AuditReport
from models.registrar_record import RegistrarRecord
from models.transparency_bundle import TransparencyBundle


class AuditReportRepo:
    @staticmethod
    def find_by_submission_id(submission_id: str) -> AuditReport | None:
        return AuditReport.query.filter_by(submission_id=submission_id).first()

    @staticmethod
    def find_all():
        return AuditReport.query.order_by(AuditReport.created_at.desc()).all()

    @staticmethod
    def upsert(data: dict) -> AuditReport:
        submission_id = data.get('submission_id')
        existing = AuditReport.query.filter_by(submission_id=submission_id).first()
        if existing:
            existing.payload = data
            existing.decision = data.get('decision')
            existing.auditor_id = data.get('auditor_id')
            existing.audit_id = data.get('audit_id')
            db.session.commit()
            return existing
        else:
            report = AuditReport(
                submission_id=submission_id,
                audit_id=data.get('audit_id'),
                auditor_id=data.get('auditor_id'),
                decision=data.get('decision'),
                payload=data,
            )
            db.session.add(report)
            db.session.commit()
            return report


class RegistrarRecordRepo:
    @staticmethod
    def find_by_submission_id(submission_id: str) -> RegistrarRecord | None:
        return RegistrarRecord.query.filter_by(submission_id=submission_id).first()

    @staticmethod
    def find_all():
        return RegistrarRecord.query.order_by(RegistrarRecord.created_at.desc()).all()

    @staticmethod
    def find_by_tx_hash(tx_hash: str) -> RegistrarRecord | None:
        """Find a registrar record by blockchain transaction hash (in payload)."""
        all_records = RegistrarRecord.query.all()
        for r in all_records:
            if r.payload and r.payload.get('chain_anchor', {}).get('tx_hash') == tx_hash:
                return r
        return None

    @staticmethod
    def upsert(data: dict) -> RegistrarRecord:
        submission_id = data.get('submission_id')
        existing = RegistrarRecord.query.filter_by(submission_id=submission_id).first()
        if existing:
            existing.payload = data
            db.session.commit()
            return existing
        else:
            record = RegistrarRecord(submission_id=submission_id, payload=data)
            db.session.add(record)
            db.session.commit()
            return record


class TransparencyBundleRepo:
    @staticmethod
    def find_by_submission_id(submission_id: str) -> TransparencyBundle | None:
        return TransparencyBundle.query.filter_by(submission_id=submission_id).first()

    @staticmethod
    def find_all():
        return TransparencyBundle.query.order_by(TransparencyBundle.created_at.desc()).all()

    @staticmethod
    def upsert(data: dict) -> TransparencyBundle:
        submission_id = data.get('transparency_bundle', {}).get('submission_id')
        existing = TransparencyBundle.query.filter_by(submission_id=submission_id).first() if submission_id else None
        if existing:
            existing.payload = data
            db.session.commit()
            return existing
        else:
            bundle = TransparencyBundle(submission_id=submission_id or '', payload=data)
            db.session.add(bundle)
            db.session.commit()
            return bundle
