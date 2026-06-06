"""
routes/accounts.py

Endpoints:
  GET  /api/accounts   — list user's accounts
  POST /api/accounts   — create a new account for the user
"""
import logging

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

    db = get_db()
    try:
        # Check for duplicate name for this user
        existing = db.execute(
            "SELECT account_id FROM Account_Dim WHERE user_id = ? AND account_name = ?",
            [g.user_id, account_name],
        )
        if existing.rows:
            account_id = existing.rows[0][0]
            return jsonify({"message": "Account already exists", "account_id": account_id}), 200

        db.execute(
            "INSERT INTO Account_Dim (user_id, account_name, account_type, initial_balance) VALUES (?, ?, ?, ?)",
            [g.user_id, account_name, account_type, initial_balance],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        account_id = row.rows[0][0]
        logger.info(f"Created account: {account_id} ({account_name}) for user {g.user_id}")
    finally:
        db.close()

    return jsonify({"message": "Account created", "account_id": account_id}), 201
