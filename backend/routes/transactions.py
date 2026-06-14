"""
routes/transactions.py

Transaction_Fact now stores only income, expense, and internal account transfers.
Debt and savings movements live in their own domain fact tables.
"""
import logging
from datetime import datetime

import libsql_client
from flask import Blueprint, g, jsonify, request

from auth.jwt_utils import require_auth
from database import get_db, rows_to_dicts

logger = logging.getLogger(__name__)

transactions_bp = Blueprint("transactions", __name__)

VALID_TRANSACTION_TYPES = {"income", "expense", "inner_transfer"}
ALLOWED_UPDATE_FIELDS = {
    "transaction_date", "transaction_type", "account_id", "source_account_id",
    "destination_account_id", "payee_id", "category_id", "amount", "note", "location"
}

TRANSACTION_FACT_COLUMNS = {
    "transaction_type": "TEXT",
    "source_account_id": "INTEGER",
    "destination_account_id": "INTEGER",
    "payee_id": "INTEGER",
    "location": "TEXT",
    "created_at": "TEXT",
    "updated_at": "TEXT",
}


def _ensure_transaction_fact_columns(db) -> None:
    info = rows_to_dicts(db.execute("PRAGMA table_info(Transaction_Fact)"))
    existing = {row["name"] for row in info}
    for column_name, column_def in TRANSACTION_FACT_COLUMNS.items():
        if column_name in existing:
            continue
        try:
            db.execute(f"ALTER TABLE Transaction_Fact ADD COLUMN {column_name} {column_def}")
        except Exception:
            pass


def _normalize_transaction_type(data: dict) -> str:
    value = data.get("transaction_type") or data.get("operation_type")
    legacy_type = data.get("type")
    if value == "account_transfer":
        return "inner_transfer"
    if value in VALID_TRANSACTION_TYPES:
        return value
    if legacy_type in ("income", "in"):
        return "income"
    if legacy_type in ("expense", "out"):
        return "expense"
    if legacy_type == "neutral":
        return "inner_transfer"
    return "expense"


def _amount(value):
    try:
        parsed = int(value or 0)
    except (TypeError, ValueError):
        parsed = 0
    return parsed


def _account_delta(tx: dict, account_id: int) -> int:
    tx_type = tx.get("transaction_type") or _normalize_transaction_type(tx)
    amount = int(tx.get("amount") or 0)
    if tx_type == "income" and str(tx.get("account_id")) == str(account_id):
        return amount
    if tx_type == "expense" and str(tx.get("account_id")) == str(account_id):
        return -amount
    if tx_type == "inner_transfer":
        if str(tx.get("source_account_id")) == str(account_id):
            return -amount
        if str(tx.get("destination_account_id")) == str(account_id):
            return amount
    return 0


def _validate_account(db, user_id: int, account_id, field: str):
    if account_id in (None, ""):
        return f"{field} is required"
    result = db.execute(
        "SELECT account_id FROM Account_Dim WHERE account_id = ? AND user_id = ?",
        [int(account_id), user_id],
    )
    return None if result.rows else f"{field} not found"


def _validate_category(db, user_id: int, category_id, tx_type: str):
    if category_id in (None, ""):
        return "category_id is required"
    result = db.execute(
        "SELECT category_id FROM Category_Dim WHERE category_id = ? AND user_id = ? AND category_type = ?",
        [int(category_id), user_id, tx_type],
    )
    return None if result.rows else "category_id not found or does not match transaction_type"


def _validate_payee(db, user_id: int, payee_id):
    if payee_id in (None, ""):
        return None
    result = db.execute(
        "SELECT payee_id FROM payees WHERE payee_id = ? AND user_id = ?",
        [int(payee_id), user_id],
    )
    return None if result.rows else "payee_id not found"


def _validate_payload(db, data: dict, user_id: int, partial: bool = False):
    tx_type = _normalize_transaction_type(data)
    if tx_type not in VALID_TRANSACTION_TYPES:
        return "transaction_type must be one of income, expense, inner_transfer"

    if not partial or "amount" in data:
        amount = _amount(data.get("amount"))
        if amount <= 0:
            return "amount must be a positive integer"

    if not partial or "transaction_date" in data:
        if not data.get("transaction_date"):
            return "transaction_date is required"

    if tx_type in ("income", "expense"):
        if not partial or "account_id" in data:
            error = _validate_account(db, user_id, data.get("account_id"), "account_id")
            if error:
                return error
        if not partial or "category_id" in data:
            error = _validate_category(db, user_id, data.get("category_id"), tx_type)
            if error:
                return error
        if "payee_id" in data:
            error = _validate_payee(db, user_id, data.get("payee_id"))
            if error:
                return error
    else:
        source = data.get("source_account_id")
        destination = data.get("destination_account_id")
        if not partial or "source_account_id" in data:
            error = _validate_account(db, user_id, source, "source_account_id")
            if error:
                return error
        if not partial or "destination_account_id" in data:
            error = _validate_account(db, user_id, destination, "destination_account_id")
            if error:
                return error
        if source and destination and int(source) == int(destination):
            return "source_account_id and destination_account_id must be different"
    return None


def _row_to_api(row: dict, accounts: dict, categories: dict, payees: dict) -> dict:
    tx_type = row.get("transaction_type") or _normalize_transaction_type(row)
    source_account_id = row.get("source_account_id")
    destination_account_id = row.get("destination_account_id")
    account_id = row.get("account_id")
    payee_id = row.get("payee_id")
    category_id = row.get("category_id")

    if tx_type == "income":
        source_label = payees.get(str(payee_id), row.get("note") or "Nguồn ngoài")
        destination_label = accounts.get(str(account_id), f"#{account_id}")
        direction = "in"
        legacy_type = "in"
    elif tx_type == "expense":
        source_label = accounts.get(str(account_id), f"#{account_id}")
        destination_label = payees.get(str(payee_id), categories.get(str(category_id), row.get("note") or "Chi tiêu"))
        direction = "out"
        legacy_type = "out"
    else:
        source_label = accounts.get(str(source_account_id), f"#{source_account_id}")
        destination_label = accounts.get(str(destination_account_id), f"#{destination_account_id}")
        direction = "neutral"
        legacy_type = "neutral"

    return {
        **row,
        "transaction_type": tx_type,
        "operation_type": tx_type,
        "type": legacy_type,
        "account_id": account_id or source_account_id or destination_account_id,
        "source_account_id": source_account_id,
        "destination_account_id": destination_account_id,
        "cash_flow": {
            "source_label": source_label,
            "destination_label": destination_label,
            "source_account_id": source_account_id or (account_id if tx_type == "expense" else None),
            "destination_account_id": destination_account_id or (account_id if tx_type == "income" else None),
            "operation_type": tx_type,
        },
        "transfer_context": {
            "direction": direction,
            "source_label": source_label,
            "destination_label": destination_label,
            "related_kind": "account" if tx_type == "inner_transfer" else None,
            "source_account_id": source_account_id,
            "destination_account_id": destination_account_id,
        } if tx_type == "inner_transfer" else None,
    }


def _lookup_maps(db, user_id: int):
    accounts = {
        str(row["account_id"]): row["account_name"]
        for row in rows_to_dicts(db.execute("SELECT account_id, account_name FROM Account_Dim WHERE user_id = ?", [user_id]))
    }
    categories = {
        str(row["category_id"]): row["category_name"]
        for row in rows_to_dicts(db.execute("SELECT category_id, category_name FROM Category_Dim WHERE user_id = ?", [user_id]))
    }
    payees = {
        str(row["payee_id"]): row["payee_name"]
        for row in rows_to_dicts(db.execute("SELECT payee_id, payee_name FROM payees WHERE user_id = ?", [user_id]))
    }
    return accounts, categories, payees


@transactions_bp.route("/api/transactions", methods=["GET"])
@require_auth
def get_transactions():
    db = get_db()
    try:
        _ensure_transaction_fact_columns(db)
        result = db.execute(
            """
            SELECT * FROM Transaction_Fact
            WHERE user_id = ?
              AND is_deleted = 0
              AND COALESCE(transaction_type, operation_type) IN ('income', 'expense', 'inner_transfer', 'account_transfer')
            ORDER BY transaction_date DESC
            """,
            [g.user_id],
        )
        accounts, categories, payees = _lookup_maps(db, g.user_id)
        transactions = [
            _row_to_api(row, accounts, categories, payees)
            for row in rows_to_dicts(result)
            if _normalize_transaction_type(row) in VALID_TRANSACTION_TYPES
        ]
    finally:
        db.close()
    return jsonify(transactions), 200


@transactions_bp.route("/api/transactions", methods=["POST"])
@require_auth
def create_transaction():
    data = request.get_json(silent=True) or {}
    tx_type = _normalize_transaction_type(data)
    amount = _amount(data.get("amount"))
    transaction_id = f"tx-{int(datetime.now().timestamp() * 1000)}"

    db = get_db()
    try:
        _ensure_transaction_fact_columns(db)
        data = {**data, "transaction_type": tx_type, "amount": amount}
        error = _validate_payload(db, data, g.user_id)
        if error:
            return jsonify({"error": error}), 400

        account_id = data.get("account_id") if tx_type in ("income", "expense") else None
        source_account_id = data.get("source_account_id") if tx_type == "inner_transfer" else None
        destination_account_id = data.get("destination_account_id") if tx_type == "inner_transfer" else None
        category_id = data.get("category_id") if tx_type in ("income", "expense") else None
        payee_id = data.get("payee_id") if tx_type in ("income", "expense") else None

        statements = [
            libsql_client.Statement(
                """
                INSERT INTO Transaction_Fact
                (transaction_id, user_id, transaction_date, transaction_type, amount,
                 account_id, source_account_id, destination_account_id, payee_id,
                 category_id, note, location, is_deleted, type, operation_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """,
                [
                    transaction_id, g.user_id, data.get("transaction_date"), tx_type, amount,
                    account_id, source_account_id, destination_account_id, payee_id,
                    category_id, data.get("note", ""), data.get("location", ""),
                    "in" if tx_type == "income" else "out" if tx_type == "expense" else "neutral",
                    tx_type,
                ],
            )
        ]
        if tx_type == "income":
            statements.append(libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [amount, account_id, g.user_id],
            ))
        elif tx_type == "expense":
            statements.append(libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [amount, account_id, g.user_id],
            ))
        else:
            statements.extend([
                libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                    [amount, source_account_id, g.user_id],
                ),
                libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                    [amount, destination_account_id, g.user_id],
                ),
            ])
        db.batch(statements)
    finally:
        db.close()
    return jsonify({"message": "Transaction created!", "transaction_id": transaction_id}), 201


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["PUT"])
@require_auth
def update_transaction(transaction_id: str):
    data = request.get_json(silent=True) or {}
    updates = {k: v for k, v in data.items() if k in ALLOWED_UPDATE_FIELDS}
    if "operation_type" in data and "transaction_type" not in updates:
        updates["transaction_type"] = data["operation_type"]
    if "type" in data and "transaction_type" not in updates:
        updates["transaction_type"] = _normalize_transaction_type(data)
    if not updates:
        return jsonify({"message": "No changes"}), 200

    db = get_db()
    try:
        _ensure_transaction_fact_columns(db)
        old_result = db.execute(
            "SELECT * FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not old_result.rows:
            return jsonify({"error": "Transaction not found"}), 404
        old = rows_to_dicts(old_result)[0]

        next_data = {**old, **updates}
        next_data["transaction_type"] = _normalize_transaction_type(next_data)
        next_data["amount"] = _amount(next_data.get("amount"))
        error = _validate_payload(db, next_data, g.user_id)
        if error:
            return jsonify({"error": error}), 400

        touched_accounts = {
            int(value) for value in [
                old.get("account_id"), old.get("source_account_id"), old.get("destination_account_id"),
                next_data.get("account_id"), next_data.get("source_account_id"), next_data.get("destination_account_id"),
            ] if value not in (None, "")
        }

        statements = []
        for account_id in touched_accounts:
            old_delta = _account_delta(old, account_id)
            new_delta = _account_delta(next_data, account_id)
            diff = new_delta - old_delta
            if diff:
                statements.append(libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                    [diff, account_id, g.user_id],
                ))

        tx_type = next_data["transaction_type"]
        statements.append(libsql_client.Statement(
            """
            UPDATE Transaction_Fact
            SET transaction_date = ?, transaction_type = ?, amount = ?,
                account_id = ?, source_account_id = ?, destination_account_id = ?,
                payee_id = ?, category_id = ?, note = ?, location = ?,
                type = ?, operation_type = ?, updated_at = datetime('now')
            WHERE transaction_id = ? AND user_id = ?
            """,
            [
                next_data.get("transaction_date"), tx_type, next_data.get("amount"),
                next_data.get("account_id") if tx_type in ("income", "expense") else None,
                next_data.get("source_account_id") if tx_type == "inner_transfer" else None,
                next_data.get("destination_account_id") if tx_type == "inner_transfer" else None,
                next_data.get("payee_id") if tx_type in ("income", "expense") else None,
                next_data.get("category_id") if tx_type in ("income", "expense") else None,
                next_data.get("note", ""), next_data.get("location", ""),
                "in" if tx_type == "income" else "out" if tx_type == "expense" else "neutral",
                tx_type, transaction_id, g.user_id,
            ],
        ))
        db.batch(statements)
    finally:
        db.close()
    return jsonify({"message": "Transaction updated successfully"}), 200


@transactions_bp.route("/api/transactions/<transaction_id>/transfer", methods=["PUT"])
@require_auth
def update_transfer_transaction(transaction_id: str):
    data = request.get_json(silent=True) or {}
    source_account_id = data.get("from_account_id") or data.get("source_account_id")
    destination_account_id = data.get("to_account_id") or data.get("destination_account_id")
    next_data = {
        "transaction_type": "inner_transfer",
        "transaction_date": data.get("transaction_date"),
        "source_account_id": source_account_id,
        "destination_account_id": destination_account_id,
        "amount": data.get("amount"),
        "note": data.get("note", ""),
        "location": data.get("location", ""),
    }

    db = get_db()
    try:
        _ensure_transaction_fact_columns(db)
        old_result = db.execute(
            "SELECT * FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not old_result.rows:
            return jsonify({"error": "Transaction not found"}), 404
        old = rows_to_dicts(old_result)[0]
        error = _validate_payload(db, next_data, g.user_id)
        if error:
            return jsonify({"error": error}), 400

        touched_accounts = {
            int(value) for value in [
                old.get("account_id"), old.get("source_account_id"), old.get("destination_account_id"),
                next_data.get("source_account_id"), next_data.get("destination_account_id"),
            ] if value not in (None, "")
        }
        statements = []
        for account_id in touched_accounts:
            diff = _account_delta(next_data, account_id) - _account_delta(old, account_id)
            if diff:
                statements.append(libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                    [diff, account_id, g.user_id],
                ))
        statements.append(libsql_client.Statement(
            """
            UPDATE Transaction_Fact
            SET transaction_date = ?, transaction_type = 'inner_transfer', amount = ?,
                account_id = NULL, source_account_id = ?, destination_account_id = ?,
                payee_id = NULL, category_id = NULL, note = ?, location = ?,
                type = 'neutral', operation_type = 'inner_transfer', updated_at = datetime('now')
            WHERE transaction_id = ? AND user_id = ?
            """,
            [
                next_data["transaction_date"], int(next_data["amount"]),
                int(next_data["source_account_id"]), int(next_data["destination_account_id"]),
                next_data["note"], next_data["location"], transaction_id, g.user_id,
            ],
        ))
        db.batch(statements)
    finally:
        db.close()
    return jsonify({"message": "Transfer updated successfully"}), 200


@transactions_bp.route("/api/transactions/<transaction_id>", methods=["DELETE"])
@require_auth
def delete_transaction(transaction_id: str):
    db = get_db()
    try:
        _ensure_transaction_fact_columns(db)
        result = db.execute(
            "SELECT * FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
            [transaction_id, g.user_id],
        )
        if not result.rows:
            return jsonify({"error": "Transaction not found"}), 404
        tx = rows_to_dicts(result)[0]
        touched_accounts = {
            int(value) for value in [tx.get("account_id"), tx.get("source_account_id"), tx.get("destination_account_id")]
            if value not in (None, "")
        }
        statements = [
            libsql_client.Statement(
                "UPDATE Transaction_Fact SET is_deleted = 1, updated_at = datetime('now') WHERE transaction_id = ? AND user_id = ?",
                [transaction_id, g.user_id],
            )
        ]
        for account_id in touched_accounts:
            delta = _account_delta(tx, account_id)
            if delta:
                statements.append(libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                    [delta, account_id, g.user_id],
                ))
        db.batch(statements)
    finally:
        db.close()
    return jsonify({"message": "Transaction deleted successfully!"}), 200
