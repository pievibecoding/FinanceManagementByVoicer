"""
routes/transactions.py

Endpoints:
  GET    /api/transactions         — list user's transactions
  POST   /api/transactions         — create a transaction
  DELETE /api/transactions/<id>    — soft-delete a transaction
"""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("/api/transactions", methods=["GET"])
@require_auth
def get_transactions():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Transaction_Fact WHERE user_id = ? AND is_deleted = 0 ORDER BY transaction_date DESC",
            [g.user_id],
        )
        transactions = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(transactions), 200


@transactions_bp.route("/api/transactions", methods=["POST"])
@require_auth
def create_transaction():
    data = request.get_json(silent=True) or {}

    transaction_date = data.get("transaction_date")
    account_id       = data.get("account_id")
    category_id      = data.get("category_id")
    amount           = data.get("amount")
    tx_type          = data.get("type")
    note             = data.get("note", "")

    if not all([transaction_date, account_id, category_id, amount, tx_type]):
        return jsonify({"error": "Missing required fields"}), 400

    transaction_id = f"tx-{int(datetime.now().timestamp() * 1000)}"

    db = get_db()
    try:
        db.execute(
            "INSERT INTO Transaction_Fact (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [transaction_id, transaction_date, account_id, category_id, int(amount), tx_type, note, g.user_id],
        )
    finally:
        db.close()

    return jsonify({"message": "Transaction created!", "transaction_id": transaction_id}), 201


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["DELETE"])
@require_auth
def delete_transaction(transaction_id: str):
    db = get_db()
    try:
        db.execute(
            "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
            [transaction_id, g.user_id],
        )
    finally:
        db.close()
    return jsonify({"message": "Transaction deleted successfully!"}), 200
