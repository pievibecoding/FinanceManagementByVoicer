"""
routes/transactions.py

Endpoints:
  GET    /api/transactions         — list user's transactions (with splits)
  POST   /api/transactions         — create a transaction (optionally with splits)
  PUT    /api/transactions/<id>    — update transaction fields
  DELETE /api/transactions/<id>    — soft-delete a transaction + remove split rows
"""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

transactions_bp = Blueprint("transactions", __name__)

ALLOWED_UPDATE_FIELDS = {"transaction_date", "account_id", "category_id", "amount", "type", "note", "payee_id", "location"}


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

        # Attach split rows to each transaction
        tx_ids = [tx["transaction_id"] for tx in transactions]
        splits_map: dict[str, list] = {}
        if tx_ids:
            placeholders = ",".join("?" * len(tx_ids))
            split_result = db.execute(
                f"SELECT * FROM split_transactions WHERE transaction_id IN ({placeholders})",
                tx_ids,
            )
            for s in rows_to_dicts(split_result):
                splits_map.setdefault(s["transaction_id"], []).append(s)

        for tx in transactions:
            tx["splits"] = splits_map.get(tx["transaction_id"], [])

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
    payee_id         = data.get("payee_id")  # optional, may be None
    location         = data.get("location")  # optional, may be None
    splits           = data.get("splits", [])

    if not all([transaction_date, account_id, category_id, amount, tx_type]):
        return jsonify({"error": "Missing required fields"}), 400

    # Split validation
    if splits:
        split_total = sum(int(s.get("amount", 0)) for s in splits)
        if split_total != int(amount):
            return jsonify({"error": "Split amounts must sum to total amount"}), 400
        category_id = "split"  # enforce sentinel regardless of what client sent

    transaction_id = f"tx-{int(datetime.now().timestamp() * 1000)}"

    db = get_db()
    try:
        db.execute(
            "INSERT INTO Transaction_Fact (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id, payee_id, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [transaction_id, transaction_date, account_id, category_id, int(amount), tx_type, note, g.user_id, payee_id, location],
        )

        if splits:
            for s in splits:
                db.execute(
                    "INSERT INTO split_transactions (transaction_id, category_id, amount, note) VALUES (?, ?, ?, ?)",
                    [transaction_id, s["category_id"], int(s["amount"]), s.get("note", "")],
                )
    finally:
        db.close()

    return jsonify({"message": "Transaction created!", "transaction_id": transaction_id}), 201


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["PUT"])
@require_auth
def update_transaction(transaction_id: str):
    data = request.get_json(silent=True) or {}

    # Only allow updating specific fields
    updates = {k: v for k, v in data.items() if k in ALLOWED_UPDATE_FIELDS}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    if "amount" in updates:
        try:
            updates["amount"] = int(updates["amount"])
            if updates["amount"] <= 0:
                return jsonify({"error": "amount must be a positive integer"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "amount must be a positive integer"}), 400

    db = get_db()
    try:
        # Verify ownership
        check = db.execute(
            "SELECT transaction_id FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Transaction not found"}), 404

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [transaction_id, g.user_id]
        db.execute(
            f"UPDATE Transaction_Fact SET {set_clause} WHERE transaction_id = ? AND user_id = ?",
            values,
        )
    finally:
        db.close()

    return jsonify({"message": "Transaction updated successfully"}), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["DELETE"])
@require_auth
def delete_transaction(transaction_id: str):
    db = get_db()
    try:
        # Verify ownership BEFORE touching any rows
        check = db.execute(
            "SELECT transaction_id FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Transaction not found"}), 404

        # Remove split rows (physical delete) then soft-delete the parent
        db.execute(
            "DELETE FROM split_transactions WHERE transaction_id = ?",
            [transaction_id],
        )
        db.execute(
            "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
            [transaction_id, g.user_id],
        )
    finally:
        db.close()
    return jsonify({"message": "Transaction deleted successfully!"}), 200
