"""Submission routes — /api/submissions/*"""
from flask import Blueprint, request, jsonify, g
from middleware.auth import require_auth
from schemas.validation import SubmissionCreateRequest, validate_request
from repositories.submission_repo import SubmissionRepo
from services.submission_service import SubmissionService

submissions_bp = Blueprint('submissions', __name__)


@submissions_bp.route('/', methods=['GET'])
@submissions_bp.route('', methods=['GET'])
@require_auth
def list_submissions():
    email = request.args.get('email')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    status = request.args.get('status')
    q = request.args.get('q')

    # Cap per_page at 100
    per_page = min(per_page, 100)

    if email:
        result = SubmissionRepo.find_by_email(email, page=page, per_page=per_page)
    else:
        result = SubmissionRepo.find_all(page=page, per_page=per_page, status=status, q=q)

    return jsonify({
        'items': [s.to_dict() for s in result.items],
        'total': result.total,
        'page': result.page,
        'pages': result.pages,
    }), 200


@submissions_bp.route('/<submission_id>', methods=['GET'])
@require_auth
def get_submission(submission_id):
    submission = SubmissionRepo.find_by_submission_id(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404
    return jsonify(submission.to_dict()), 200


@submissions_bp.route('/', methods=['POST'])
@submissions_bp.route('', methods=['POST'])
@require_auth
def create_or_update():
    data = request.json or {}

    parsed, error = validate_request(SubmissionCreateRequest, data)
    if error:
        return jsonify(error), 422

    submission_id = data.get('meta', {}).get('submission_id')
    if not submission_id:
        return jsonify({"error": "submission_id is required"}), 400

    actor_email = g.current_user.get('email', 'unknown')
    existing = SubmissionRepo.find_by_submission_id(submission_id)

    try:
        if existing:
            submission = SubmissionService.update_submission(existing, data, actor_email)
            return jsonify(submission.to_dict()), 200
        else:
            submission = SubmissionService.create_submission(data, actor_email)
            return jsonify(submission.to_dict()), 201
    except ValueError as e:
        # State machine violation
        return jsonify({"error": str(e)}), 409


@submissions_bp.route('/<submission_id>', methods=['DELETE'])
@require_auth
def delete_submission(submission_id):
    submission = SubmissionRepo.find_by_submission_id(submission_id)
    if not submission:
        return jsonify({"error": "Not found"}), 404

    # Only DRAFT submissions can be deleted
    if submission.status != 'DRAFT':
        return jsonify({"error": "Only DRAFT submissions can be deleted"}), 409

    SubmissionRepo.delete(submission)
    return jsonify({"success": True}), 200

@submissions_bp.route('/counts', methods=['GET'])
@require_auth
def get_counts():
    """Get submission counts by status — SQL aggregation, not full scan."""
    counts = SubmissionService.get_counts()
    return jsonify(counts), 200


@submissions_bp.route('/<submission_id>/analyze', methods=['GET'])
@require_auth
def analyze_submission(submission_id):
    """Phase 6: Run all intelligence services against a submission.
    Returns conflicts, risk score, rule violations, and integrity hash.
    """
    from services.conflict_detector import ConflictDetector
    from services.risk_scorer import RiskScorer
    from services.audit_rules import RuleEngine
    from services.integrity_service import IntegrityService
    from dataclasses import asdict

    submission = SubmissionRepo.find_by_submission_id(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    payload = submission.payload

    # Gather approved submissions for boundary overlap check
    all_approved = SubmissionRepo.find_all(status='APPROVED', per_page=500)
    approved_payloads = [
        s.payload for s in all_approved.items
        if s.submission_id != submission_id
    ]

    # 6.1 — Conflict Detection
    conflicts = ConflictDetector.check_all(payload, approved_payloads)

    # 6.2 — Audit Rules
    rule_engine = RuleEngine()
    violations = rule_engine.evaluate(payload)

    # 6.3 — Risk Scoring
    submitter_count = SubmissionRepo.find_by_email(
        submission.created_by, per_page=1
    ).total
    risk = RiskScorer.score(payload, submitter_count - 1)

    # 6.5 — Integrity
    integrity = IntegrityService.generate_integrity_bundle(payload)

    return jsonify({
        'submission_id': submission_id,
        'conflicts': [asdict(c) for c in conflicts],
        'rule_violations': [asdict(v) for v in violations],
        'risk': asdict(risk),
        'integrity': integrity,
        'summary': {
            'conflict_count': len(conflicts),
            'critical_violations': sum(1 for v in violations if v.severity == 'CRITICAL'),
            'warning_violations': sum(1 for v in violations if v.severity == 'WARNING'),
            'risk_level': risk.level,
            'risk_score': risk.score,
        },
    }), 200
