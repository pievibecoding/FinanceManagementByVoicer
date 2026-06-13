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
import libsql_client

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

transactions_bp = Blueprint("transactions", __name__)

ALLOWED_UPDATE_FIELDS = {"transaction_date", "account_id", "category_id", "amount", "type", "note", "payee_id", "location"}
VALID_TRANSACTION_TYPES = {"income", "expense", "transfer_in", "transfer_out"}


def _transaction_delta(tx_type: str, amount: int) -> int:
    return int(amount) if tx_type in ("income", "transfer_in") else -int(amount)


def _delete_single_transaction(db, transaction_id: str, account_id: int, delta: int, user_id: int) -> None:
    db.batch([
        libsql_client.Statement(
            "DELETE FROM split_transactions WHERE transaction_id = ?",
            [transaction_id],
        ),
        libsql_client.Statement(
            "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
            [transaction_id, user_id],
        ),
        libsql_client.Statement(
            "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
            [delta, account_id, user_id],
        ),
    ])


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
    transfer_pair_id = data.get("transfer_pair_id")
    splits           = data.get("splits", [])

    if not all([transaction_date, account_id, category_id, amount, tx_type]):
        return jsonify({"error": "Missing required fields"}), 400
    if tx_type not in VALID_TRANSACTION_TYPES:
        return jsonify({"error": f"type must be one of {VALID_TRANSACTION_TYPES}"}), 400

    # Split validation
    if splits:
        split_total = sum(int(s.get("amount", 0)) for s in splits)
        if split_total != int(amount):
            return jsonify({"error": "Split amounts must sum to total amount"}), 400
        category_id = "split"  # enforce sentinel regardless of what client sent

    transaction_id = f"tx-{int(datetime.now().timestamp() * 1000)}"

    db = get_db()
    try:
        delta = _transaction_delta(tx_type, int(amount))
        db.batch([
            libsql_client.Statement(
                "INSERT INTO Transaction_Fact (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id, payee_id, location, transfer_pair_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [transaction_id, transaction_date, account_id, category_id, int(amount), tx_type, note, g.user_id, payee_id, location, transfer_pair_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [delta, account_id, g.user_id],
            ),
        ])

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
    if "type" in updates and updates["type"] not in VALID_TRANSACTION_TYPES:
        return jsonify({"error": f"type must be one of {VALID_TRANSACTION_TYPES}"}), 400

    db = get_db()
    try:
        check = db.execute(
            "SELECT transaction_id, type, amount, account_id FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Transaction not found"}), 404
        _, old_type, old_amount, old_account_id = check.rows[0]

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [transaction_id, g.user_id]
        balance_fields = {"amount", "type", "account_id"}
        if balance_fields.intersection(updates):
            new_type = updates.get("type", old_type)
            new_amount = int(updates.get("amount", old_amount))
            new_account_id = updates.get("account_id", old_account_id)
            old_delta = _transaction_delta(old_type, int(old_amount))
            new_delta = _transaction_delta(new_type, new_amount)
            db.batch([
                libsql_client.Statement(
                    f"UPDATE Transaction_Fact SET {set_clause} WHERE transaction_id = ? AND user_id = ?",
                    values,
                ),
                libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                    [old_delta, old_account_id, g.user_id],
                ),
                libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                    [new_delta, new_account_id, g.user_id],
                ),
            ])
        else:
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
        tx_result = db.execute(
            "SELECT transaction_id, type, amount, account_id, transfer_pair_id FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not tx_result.rows:
            return jsonify({"error": "Transaction not found"}), 404

        _, tx_type, amount, account_id, transfer_pair_id = tx_result.rows[0]
        delta = _transaction_delta(tx_type, int(amount))

        if transfer_pair_id:
            pair_result = db.execute(
                """
                SELECT transaction_id, type, amount, account_id
                FROM Transaction_Fact
                WHERE transfer_pair_id = ? AND user_id = ? AND is_deleted = 0
                """,
                [transfer_pair_id, g.user_id],
            )
            if len(pair_result.rows) > 1:
                statements = []
                for pair_tx_id, pair_type, pair_amount, pair_account_id in pair_result.rows:
                    pair_delta = _transaction_delta(pair_type, int(pair_amount))
                    statements.extend([
                        libsql_client.Statement(
                            "DELETE FROM split_transactions WHERE transaction_id = ?",
                            [pair_tx_id],
                        ),
                        libsql_client.Statement(
                            "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
                            [pair_tx_id, g.user_id],
                        ),
                        libsql_client.Statement(
                            "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                            [pair_delta, pair_account_id, g.user_id],
                        ),
                    ])
                db.batch(statements)
            else:
                _delete_single_transaction(db, transaction_id, account_id, delta, g.user_id)
        else:
            _delete_single_transaction(db, transaction_id, account_id, delta, g.user_id)
    finally:
        db.close()
    return jsonify({"message": "Transaction deleted successfully!"}), 200
