"""Auth routes — /api/auth/*"""
from flask import Blueprint, request, jsonify
import bcrypt
from middleware.auth import create_token
from schemas.validation import SignupRequest, LoginRequest, validate_request
from repositories.user_repo import UserRepo

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.json or {}

    parsed, error = validate_request(SignupRequest, data)
    if error:
        return jsonify(error), 422

    existing = UserRepo.find_by_email(parsed.email)
    if existing:
        return jsonify({"error": "User already exists"}), 400

    hashed_password = bcrypt.hashpw(
        parsed.password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

    user = UserRepo.create(parsed.email, hashed_password, parsed.name)

    token = create_token(user.email, user.name, user.role)
    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}

    parsed, error = validate_request(LoginRequest, data)
    if error:
        return jsonify(error), 422

    user = UserRepo.find_by_email(parsed.email)
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    stored_hash = user.password

    # Handle legacy plaintext passwords (migration path)
    if stored_hash.startswith('$2b$') or stored_hash.startswith('$2a$'):
        if not bcrypt.checkpw(parsed.password.encode('utf-8'), stored_hash.encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401
    else:
        # Legacy plaintext — verify and upgrade in-place
        if stored_hash != parsed.password:
            return jsonify({"error": "Invalid credentials"}), 401
        new_hash = bcrypt.hashpw(parsed.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        UserRepo.update_password(user, new_hash)

    token = create_token(user.email, user.name, user.role)
    return jsonify({
        "token": token,
        "user": user.to_dict()
    }), 200
