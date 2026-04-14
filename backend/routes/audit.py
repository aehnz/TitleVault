"""Audit routes — /api/audit-reports/*"""
from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from schemas.validation import AuditReportRequest, validate_request
from repositories.audit_repo import AuditReportRepo

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/', methods=['GET'])
@audit_bp.route('', methods=['GET'])
@require_auth
def list_reports():
    reports = AuditReportRepo.find_all()
    return jsonify([r.to_dict() for r in reports]), 200


@audit_bp.route('/<submission_id>', methods=['GET'])
@require_auth
def get_report(submission_id):
    report = AuditReportRepo.find_by_submission_id(submission_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return jsonify(report.to_dict()), 200


@audit_bp.route('/', methods=['POST'])
@audit_bp.route('', methods=['POST'])
@require_auth
def save_report():
    data = request.json or {}

    parsed, error = validate_request(AuditReportRequest, data)
    if error:
        return jsonify(error), 422

    report = AuditReportRepo.upsert(data)
    return jsonify(report.to_dict()), 200
