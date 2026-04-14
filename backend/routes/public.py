"""Public verification routes — /api/public/* (no auth required)"""
from flask import Blueprint, jsonify
from repositories.submission_repo import SubmissionRepo
from repositories.audit_repo import RegistrarRecordRepo

public_bp = Blueprint('public', __name__)


@public_bp.route('/parcel/<parcel_id>', methods=['GET'])
def query_by_parcel(parcel_id):
    """Get the latest approved submission for a parcel."""
    submission = SubmissionRepo.find_approved_by_parcel(parcel_id)
    if not submission:
        return jsonify({"error": "No approved record found for this parcel"}), 404
    return jsonify(submission.to_dict()), 200


@public_bp.route('/tx/<tx_hash>', methods=['GET'])
def query_by_tx(tx_hash):
    """Get submission by blockchain transaction hash."""
    record = RegistrarRecordRepo.find_by_tx_hash(tx_hash)
    if not record:
        return jsonify({"error": "No record found for this transaction"}), 404

    submission = SubmissionRepo.find_by_submission_id(record.submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    return jsonify(submission.to_dict()), 200
