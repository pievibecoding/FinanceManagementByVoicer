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


def _table_columns(db, table_name: str) -> set[str]:
    try:
        return {row["name"] for row in rows_to_dicts(db.execute(f"PRAGMA table_info({table_name})"))}
    except Exception:
        return set()


def _ensure_account_related_schema(db) -> None:
    account_columns = {
        "current_balance": "INTEGER NOT NULL DEFAULT 0",
        "color": "TEXT",
    }
    existing_account_columns = _table_columns(db, "Account_Dim")
    for column_name, column_def in account_columns.items():
        if column_name in existing_account_columns:
            continue
        try:
            db.execute(f"ALTER TABLE Account_Dim ADD COLUMN {column_name} {column_def}")
        except Exception:
            pass

    transaction_columns = {
        "transaction_type": "TEXT",
        "source_account_id": "INTEGER",
        "destination_account_id": "INTEGER",
        "updated_at": "TEXT",
        "created_at": "TEXT",
    }
    existing_transaction_columns = _table_columns(db, "Transaction_Fact")
    for column_name, column_def in transaction_columns.items():
        if column_name in existing_transaction_columns:
            continue
        try:
            db.execute(f"ALTER TABLE Transaction_Fact ADD COLUMN {column_name} {column_def}")
        except Exception:
            pass

    # Migration: relax NOT NULL on account_id and category_id so that
    # inner_transfer rows (which use source/destination_account_id instead)
    # can be stored without violating the legacy schema constraint.
    # SQLite cannot DROP NOT NULL via ALTER COLUMN, so we recreate the table.
    try:
        col_info = db.execute("PRAGMA table_info(Transaction_Fact)")
        cols = {row[1]: row[3] for row in col_info.rows}  # name -> notnull
        needs_migration = cols.get("account_id", 0) == 1 or cols.get("category_id", 0) == 1
        if needs_migration:
            db.batch([
                libsql_client.Statement("""
                    CREATE TABLE IF NOT EXISTS Transaction_Fact_new (
                        transaction_id      TEXT PRIMARY KEY,
                        transaction_date    TEXT NOT NULL,
                        account_id          TEXT,
                        category_id         TEXT,
                        amount              INTEGER NOT NULL,
                        type                TEXT NOT NULL,
                        note                TEXT,
                        transfer_pair_id    TEXT,
                        user_id             INTEGER NOT NULL DEFAULT 1,
                        is_deleted          INTEGER NOT NULL DEFAULT 0,
                        payee_id            INTEGER,
                        location            TEXT,
                        operation_type      TEXT,
                        source_account_id   INTEGER,
                        destination_account_id INTEGER,
                        savings_id          INTEGER,
                        debt_id             INTEGER,
                        debt_payment_id     INTEGER,
                        savings_movement_id INTEGER,
                        transaction_type    TEXT,
                        created_at          TEXT,
                        updated_at          TEXT
                    )
                """),
                libsql_client.Statement("""
                    INSERT INTO Transaction_Fact_new
                    SELECT * FROM Transaction_Fact
                """),
                libsql_client.Statement("DROP TABLE Transaction_Fact"),
                libsql_client.Statement("ALTER TABLE Transaction_Fact_new RENAME TO Transaction_Fact"),
            ])
    except Exception as e:
        logger.warning(f"Transaction_Fact NOT NULL migration skipped: {e}")

    db.execute("""
        CREATE TABLE IF NOT EXISTS Debt_Transaction_Fact (
            debt_transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            payee_id INTEGER,
            debt_transaction_type TEXT NOT NULL CHECK (debt_transaction_type IN ('disbursement', 'payment')),
            cash_direction TEXT NOT NULL CHECK (cash_direction IN ('in', 'out')),
            transaction_date TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            note TEXT,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Savings_Transaction_Fact (
            savings_transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            savings_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            savings_transaction_type TEXT NOT NULL CHECK (savings_transaction_type IN ('contribution', 'withdrawal')),
            cash_direction TEXT NOT NULL CHECK (cash_direction IN ('in', 'out')),
            transaction_date TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            note TEXT,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT
        )
    """)


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
        _ensure_account_related_schema(db)
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
        _ensure_account_related_schema(db)
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
        _ensure_account_related_schema(db)
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
                        WHEN transaction_type = 'income' THEN amount
                        WHEN transaction_type = 'expense' THEN -amount
                        WHEN transaction_type = 'inner_transfer' AND destination_account_id = Account_Dim.account_id THEN amount
                        WHEN transaction_type = 'inner_transfer' AND source_account_id = Account_Dim.account_id THEN -amount
                        ELSE 0
                    END)
                    FROM Transaction_Fact
                    WHERE user_id = Account_Dim.user_id
                      AND is_deleted = 0
                      AND (
                        account_id = Account_Dim.account_id
                        OR source_account_id = Account_Dim.account_id
                        OR destination_account_id = Account_Dim.account_id
                      )
                ), 0) + COALESCE((
                    SELECT SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END)
                    FROM Debt_Transaction_Fact
                    WHERE user_id = Account_Dim.user_id
                      AND account_id = Account_Dim.account_id
                      AND is_deleted = 0
                ), 0) + COALESCE((
                    SELECT SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END)
                    FROM Savings_Transaction_Fact
                    WHERE user_id = Account_Dim.user_id
                      AND account_id = Account_Dim.account_id
                      AND is_deleted = 0
                ), 0)
                WHERE account_id = ? AND user_id = ?
                """,
                [updates["initial_balance"], account_id, g.user_id],
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
        _ensure_account_related_schema(db)
        accounts = db.execute(
            """
            SELECT account_id FROM Account_Dim
            WHERE user_id = ? AND account_id IN (?, ?)
            """,
            [g.user_id, from_account_id, to_account_id],
        )
        if len(accounts.rows) != 2:
            return jsonify({"error": "Account not found"}), 404

        ts = int(time.time() * 1000)
        transaction_id = f"tx-{ts}"

        db.batch([
            libsql_client.Statement(
                """
                INSERT INTO Transaction_Fact
                (transaction_id, transaction_date, transaction_type, amount, type, operation_type,
                 account_id, source_account_id, destination_account_id, note, user_id, is_deleted)
                VALUES (?, ?, 'inner_transfer', ?, 'neutral', 'inner_transfer', ?, ?, ?, ?, ?, 0)
                """,
                [transaction_id, transfer_date, amount, from_account_id, from_account_id, to_account_id, note, g.user_id],
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
        "transaction_id": transaction_id,
    }), 201
