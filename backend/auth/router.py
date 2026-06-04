"""Flask Blueprint for /api/auth/* endpoints."""
import logging

from flask import Blueprint, request, jsonify, g

from auth.auth_service import register, login, google_auth
from auth.db import find_user_by_id
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register_endpoint():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not email or not username or not password:
        return jsonify({"error": "email, username, and password are required"}), 400

    try:
        result = register(email, username, password)
        return jsonify(result), 201
    except ValueError as e:
        msg = str(e)
        status = 409 if "already" in msg else 400
        return jsonify({"error": msg}), status


@auth_bp.route("/api/auth/login", methods=["POST"])
def login_endpoint():
    data     = request.get_json(silent=True) or {}
    email    = (data.get("email") or "").strip()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    try:
        result = login(email, password)
        return jsonify(result), 200
    except ValueError:
        return jsonify({"error": "Invalid credentials"}), 401


@auth_bp.route("/api/auth/google", methods=["POST"])
def google_endpoint():
    data     = request.get_json(silent=True) or {}
    id_token = data.get("id_token") or ""

    if not id_token:
        return jsonify({"error": "id_token is required"}), 400

    try:
        result = google_auth(id_token)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 401


@auth_bp.route("/api/auth/me", methods=["GET"])
@require_auth
def me_endpoint():
    user = find_user_by_id(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "user_id":  user["user_id"],
        "email":    user.get("email"),
        "username": user.get("username"),
    }), 200


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout_endpoint():
    # JWT is stateless — client clears the token. Server-side is a no-op.
    return jsonify({"message": "Logged out successfully"}), 200
