"""
routes/accounts.py

Endpoints:
  GET    /api/accounts       — list user's accounts
  POST   /api/accounts       — create a new account for the user
  PUT    /api/accounts/<id>  — update account metadata
"""
import logging
import re
import time
import libsql_client

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

accounts_bp = Blueprint("accounts", __name__)

VALID_ACCOUNT_TYPES = {"cash", "bank", "credit_card", "savings", "wallet", "Cash", "Bank", "E-Wallet"}
ALLOWED_UPDATE_FIELDS = {"account_name", "account_type", "initial_balance", "color"}
HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
DEFAULT_ACCOUNT_COLOR = "#a0c4ff"


def _clean_color(value) -> str:
    color = (value or DEFAULT_ACCOUNT_COLOR).strip()
    return color if HEX_COLOR_RE.match(color) else DEFAULT_ACCOUNT_COLOR


def _transfer_category_id(db, user_id: int):
    result = db.execute(
        "SELECT category_id FROM Category_Dim WHERE user_id = ? AND category_name = 'Khác' LIMIT 1",
        [user_id],
    )
    if result.rows:
        return result.rows[0][0]
    fallback = db.execute(
        "SELECT category_id FROM Category_Dim WHERE user_id = ? ORDER BY category_id LIMIT 1",
        [user_id],
    )
    return fallback.rows[0][0] if fallback.rows else None


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
    color           = _clean_color(data.get("color"))

    if not account_name:
        return jsonify({"error": "account_name is required"}), 400
    if account_type not in VALID_ACCOUNT_TYPES:
        return jsonify({"error": "account_type is invalid"}), 400

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
            "INSERT INTO Account_Dim (user_id, account_name, account_type, initial_balance, current_balance, color) VALUES (?, ?, ?, ?, ?, ?)",
            [g.user_id, account_name, account_type, initial_balance, initial_balance, color],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        account_id = row.rows[0][0]
        logger.info(f"Created account: {account_id} ({account_name}) for user {g.user_id}")
    finally:
        db.close()

    return jsonify({"message": "Account created", "account_id": account_id}), 201


@accounts_bp.route("/api/accounts/<int:account_id>", methods=["PUT"])
@require_auth
def update_account(account_id: int):
    data = request.get_json(silent=True) or {}
    updates = {}

    for field in ALLOWED_UPDATE_FIELDS:
        if field not in data:
            continue
        value = data[field]
        if field == "account_name":
            value = (value or "").strip()
            if not value:
                return jsonify({"error": "account_name is required"}), 400
        elif field == "account_type":
            value = (value or "").strip()
            if value not in VALID_ACCOUNT_TYPES:
                return jsonify({"error": "account_type is invalid"}), 400
        elif field == "initial_balance":
            value = int(value or 0)
        elif field == "color":
            value = _clean_color(value)
        updates[field] = value

    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    db = get_db()
    try:
        existing = db.execute(
            "SELECT account_id FROM Account_Dim WHERE account_id = ? AND user_id = ?",
            [account_id, g.user_id],
        )
        if not existing.rows:
            return jsonify({"error": "Account not found"}), 404

        if "account_name" in updates:
            duplicate = db.execute(
                "SELECT account_id FROM Account_Dim WHERE user_id = ? AND account_name = ? AND account_id != ?",
                [g.user_id, updates["account_name"], account_id],
            )
            if duplicate.rows:
                return jsonify({"error": "Account name already exists"}), 409

        set_clause = ", ".join([f"{field} = ?" for field in updates])
        update_stmt = libsql_client.Statement(
            f"UPDATE Account_Dim SET {set_clause} WHERE account_id = ? AND user_id = ?",
            list(updates.values()) + [account_id, g.user_id],
        )
        if "initial_balance" in updates:
            recompute_stmt = libsql_client.Statement(
                """
                UPDATE Account_Dim
                SET current_balance = ? + COALESCE((
                    SELECT SUM(CASE
                        WHEN type IN ('income', 'transfer_in') THEN amount
                        WHEN type IN ('expense', 'transfer_out') THEN -amount
                        ELSE 0
                    END)
                    FROM Transaction_Fact
                    WHERE account_id = ? AND user_id = ? AND is_deleted = 0
                ), 0)
                WHERE account_id = ? AND user_id = ?
                """,
                [updates["initial_balance"], account_id, g.user_id, account_id, g.user_id],
            )
            db.batch([update_stmt, recompute_stmt])
        else:
            db.execute(
                f"UPDATE Account_Dim SET {set_clause} WHERE account_id = ? AND user_id = ?",
                list(updates.values()) + [account_id, g.user_id],
            )
    finally:
        db.close()

    return jsonify({"message": "Account updated"}), 200


@accounts_bp.route("/api/accounts/transfer", methods=["POST"])
@require_auth
def transfer_between_accounts():
    data = request.get_json(silent=True) or {}
    from_account_id = data.get("from_account_id")
    to_account_id = data.get("to_account_id")
    transfer_date = data.get("date")
    note = data.get("note") or ""

    if not from_account_id or not to_account_id or not transfer_date or data.get("amount") is None:
        return jsonify({"error": "from_account_id, to_account_id, amount, and date are required"}), 400

    try:
        from_account_id = int(from_account_id)
        to_account_id = int(to_account_id)
        amount = int(data.get("amount"))
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be a positive integer"}), 400

    if from_account_id == to_account_id:
        return jsonify({"error": "Cannot transfer to the same account"}), 400

    db = get_db()
    try:
        accounts = db.execute(
            """
            SELECT account_id FROM Account_Dim
            WHERE user_id = ? AND account_id IN (?, ?)
            """,
            [g.user_id, from_account_id, to_account_id],
        )
        if len(accounts.rows) != 2:
            return jsonify({"error": "Account not found"}), 404

        category_id = _transfer_category_id(db, g.user_id)
        if not category_id:
            return jsonify({"error": "No categories found for user"}), 400

        ts = int(time.time() * 1000)
        transfer_pair_id = f"pair-{ts}"
        out_transaction_id = f"tx-{ts}"
        in_transaction_id = f"tx-{ts + 1}"

        db.batch([
            libsql_client.Statement(
                """
                INSERT INTO Transaction_Fact
                (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id, transfer_pair_id)
                VALUES (?, ?, ?, ?, ?, 'transfer_out', ?, ?, ?)
                """,
                [out_transaction_id, transfer_date, from_account_id, category_id, amount, note, g.user_id, transfer_pair_id],
            ),
            libsql_client.Statement(
                """
                INSERT INTO Transaction_Fact
                (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id, transfer_pair_id)
                VALUES (?, ?, ?, ?, ?, 'transfer_in', ?, ?, ?)
                """,
                [in_transaction_id, transfer_date, to_account_id, category_id, amount, note, g.user_id, transfer_pair_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [amount, from_account_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [amount, to_account_id, g.user_id],
            ),
        ])
    except Exception as e:
        logger.error(f"Error transferring between accounts: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()

    return jsonify({
        "message": "Transfer created",
        "transfer_pair_id": transfer_pair_id,
        "out_transaction_id": out_transaction_id,
        "in_transaction_id": in_transaction_id,
    }), 201
