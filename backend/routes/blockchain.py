"""Blockchain demo routes — /api/blockchain/*"""
from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
from schemas.validation import BlockchainAnchorRequest, validate_request

blockchain_bp = Blueprint('blockchain', __name__)


@blockchain_bp.route('/anchor', methods=['POST'])
@require_auth
def anchor():
    from blockchain_demo import anchor_to_blockchain
    data = request.json or {}

    parsed, error = validate_request(BlockchainAnchorRequest, data)
    if error:
        return jsonify(error), 422

    chain_anchor = anchor_to_blockchain(
        data.get('bundle_data'),
        data.get('submission_id')
    )
    return jsonify(chain_anchor), 200


@blockchain_bp.route('/receipt/<tx_hash>', methods=['GET'])
@require_auth
def get_receipt(tx_hash):
    from blockchain_demo import get_tx_receipt
    receipt = get_tx_receipt(tx_hash)
    if receipt:
        return jsonify(receipt), 200
    return jsonify({"error": "Transaction not found"}), 404
