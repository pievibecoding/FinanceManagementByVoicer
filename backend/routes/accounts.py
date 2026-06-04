"""
routes/accounts.py

Endpoints:
  GET  /api/accounts   — list user's accounts
  POST /api/accounts   — create a new account for the user
"""
import logging
import re

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.route("/api/accounts", methods=["GET"])
@require_auth
def get_accounts():
    db = get_db()
    try:
        result   = db.execute(
            "SELECT * FROM Account_Dim WHERE user_id = ? ORDER BY account_id",
            [g.user_id],
        )
        accounts = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(accounts), 200


@accounts_bp.route("/api/accounts", methods=["POST"])
@require_auth
def create_account():
    data = request.get_json(silent=True) or {}

    account_name    = (data.get("account_name") or "").strip()
    account_type    = (data.get("account_type") or "Bank").strip()
    initial_balance = int(data.get("initial_balance") or 0)

    if not account_name:
        return jsonify({"error": "account_name is required"}), 400

    # Prefix with user_id to ensure uniqueness across users
    slug       = re.sub(r"[^a-z0-9]", "_", account_name.lower())[:24]
    account_id = data.get("account_id") or f"{g.user_id}_{slug}"

    db = get_db()
    try:
        existing = db.execute(
            "SELECT account_id FROM Account_Dim WHERE account_id = ?", [account_id]
        )
        if existing.rows:
            return jsonify({"message": "Account already exists", "account_id": account_id}), 200

        db.execute(
            "INSERT INTO Account_Dim (account_id, account_name, account_type, initial_balance, user_id) VALUES (?, ?, ?, ?, ?)",
            [account_id, account_name, account_type, initial_balance, g.user_id],
        )
        logger.info(f"Created account: {account_id} for user {g.user_id}")
    finally:
        db.close()

    return jsonify({"message": "Account created", "account_id": account_id}), 201
