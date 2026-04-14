"""Registrar + Transparency routes — /api/registrar/*"""
from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from schemas.validation import RegistrarRecordRequest, TransparencyBundleRequest, validate_request
from repositories.audit_repo import RegistrarRecordRepo, TransparencyBundleRepo

registrar_bp = Blueprint('registrar', __name__)


# ---- Registrar Records ----

@registrar_bp.route('/records', methods=['GET'])
@require_auth
def list_records():
    records = RegistrarRecordRepo.find_all()
    return jsonify([r.to_dict() for r in records]), 200


@registrar_bp.route('/records/<submission_id>', methods=['GET'])
@require_auth
def get_record(submission_id):
    record = RegistrarRecordRepo.find_by_submission_id(submission_id)
    if not record:
        return jsonify({"error": "Record not found"}), 404
    return jsonify(record.to_dict()), 200


@registrar_bp.route('/records', methods=['POST'])
@require_auth
def save_record():
    data = request.json or {}

    parsed, error = validate_request(RegistrarRecordRequest, data)
    if error:
        return jsonify(error), 422

    record = RegistrarRecordRepo.upsert(data)
    return jsonify(record.to_dict()), 200


# ---- Transparency Bundles ----

@registrar_bp.route('/transparency-bundles', methods=['GET'])
def list_bundles():
    """Public — no auth required."""
    bundles = TransparencyBundleRepo.find_all()
    return jsonify([b.to_dict() for b in bundles]), 200


@registrar_bp.route('/transparency-bundles/<submission_id>', methods=['GET'])
@require_auth
def get_bundle(submission_id):
    bundle = TransparencyBundleRepo.find_by_submission_id(submission_id)
    if not bundle:
        return jsonify({"error": "Bundle not found"}), 404
    return jsonify(bundle.to_dict()), 200


@registrar_bp.route('/transparency-bundles', methods=['POST'])
@require_auth
def save_bundle():
    data = request.json or {}

    parsed, error = validate_request(TransparencyBundleRequest, data)
    if error:
        return jsonify(error), 422

    bundle = TransparencyBundleRepo.upsert(data)
    return jsonify(bundle.to_dict()), 200
