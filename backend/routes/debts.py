"""
routes/debts.py

Endpoints:
  GET    /api/debts                                   — list user's debts
  POST   /api/debts                                   — create a new debt
  PUT    /api/debts/<debt_id>                         — update a debt (ownership verified)
  DELETE /api/debts/<debt_id>                         — hard delete debt + cascade payments
  GET    /api/debts/<debt_id>/payments                — list payments (ownership verified)
  POST   /api/debts/<debt_id>/payments                — record a payment, auto-settle
  DELETE /api/debts/<debt_id>/payments/<payment_id>   — delete payment, restore balance
"""
import logging
import time
from datetime import datetime
import libsql_client

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

debts_bp = Blueprint("debts", __name__)

ALLOWED_UPDATE_FIELDS = {"name", "lender", "debtor", "principal", "outstanding_balance", "start_date", "due_date", "note", "status"}


def _table_columns(db, table_name: str) -> set[str]:
    try:
        return {row["name"] for row in rows_to_dicts(db.execute(f"PRAGMA table_info({table_name})"))}
    except Exception:
        return set()


def _ensure_debt_schema(db) -> None:
    debt_columns = {
        "lender": "TEXT",
        "debtor": "TEXT",
        "start_date": "TEXT",
        "due_date": "TEXT",
        "status": "TEXT NOT NULL DEFAULT 'active'",
        "note": "TEXT",
        "created_at": "TEXT",
        "initial_transaction_id": "TEXT",
    }
    existing_debt_columns = _table_columns(db, "Debt_Dim")
    for column_name, column_def in debt_columns.items():
        if column_name in existing_debt_columns:
            continue
        try:
            db.execute(f"ALTER TABLE Debt_Dim ADD COLUMN {column_name} {column_def}")
        except Exception:
            pass

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
            updated_at TEXT,
            FOREIGN KEY (debt_id) REFERENCES Debt_Dim(debt_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id),
            FOREIGN KEY (payee_id) REFERENCES payees(payee_id)
        )
    """)


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


def _transaction_delta(tx_type: str, amount: int) -> int:
    if tx_type in ("income", "transfer_in", "in"):
        return int(amount)
    if tx_type in ("expense", "transfer_out", "out"):
        return -int(amount)
    return 0


def _payee_id_for_name(db, user_id: int, name: str | None):
    clean_name = (name or "").strip()
    if not clean_name:
        return None
    existing = db.execute(
        "SELECT payee_id FROM payees WHERE user_id = ? AND lower(payee_name) = lower(?) LIMIT 1",
        [user_id, clean_name],
    )
    if existing.rows:
        return existing.rows[0][0]
    db.execute("INSERT INTO payees (user_id, payee_name) VALUES (?, ?)", [user_id, clean_name])
    result = db.execute(
        "SELECT MAX(payee_id) FROM payees WHERE user_id = ? AND payee_name = ?",
        [user_id, clean_name],
    )
    return result.rows[0][0] if result.rows else None


@debts_bp.route("/api/debts", methods=["GET"])
@require_auth
def get_debts():
    db = get_db()
    try:
        _ensure_debt_schema(db)
        result = db.execute(
            "SELECT * FROM Debt_Dim WHERE user_id = ? ORDER BY created_at DESC",
            [g.user_id],
        )
        debts = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(debts), 200


@debts_bp.route("/api/debts", methods=["POST"])
@require_auth
def create_debt():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    debt_type = (data.get("debt_type") or "").strip()
    lender = (data.get("lender") or "").strip() or None
    debtor = (data.get("debtor") or "").strip() or None
    start_date = data.get("start_date")
    due_date = data.get("due_date")
    note = (data.get("note") or "").strip() or None
    account_id = data.get("account_id")
    transaction_date = data.get("transaction_date") or start_date or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if not name:
        return jsonify({"error": "name is required"}), 400
    if debt_type not in ("debt", "loan"):
        return jsonify({"error": "debt_type must be 'debt' or 'loan'"}), 400
    if account_id is None:
        return jsonify({"error": "account_id is required to create a linked debt cash flow"}), 400

    try:
        principal = int(data.get("principal") or 0)
        if principal <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "principal must be a positive integer"}), 400

    outstanding_balance = data.get("outstanding_balance")
    if outstanding_balance is None:
        outstanding_balance = principal
    else:
        try:
            outstanding_balance = int(outstanding_balance)
        except (ValueError, TypeError):
            return jsonify({"error": "outstanding_balance must be an integer"}), 400

    try:
        account_id = int(account_id)
    except (ValueError, TypeError):
        return jsonify({"error": "account_id must be an integer"}), 400
    account_delta = principal if debt_type == "debt" else -principal

    db = get_db()
    try:
        _ensure_debt_schema(db)
        account = db.execute(
            "SELECT account_id FROM Account_Dim WHERE account_id = ? AND user_id = ?",
            [account_id, g.user_id],
        )
        if not account.rows:
            return jsonify({"error": "Account not found"}), 404

        db.execute(
            """INSERT INTO Debt_Dim
            (user_id, name, debt_type, lender, debtor, principal, outstanding_balance, start_date, due_date, note, initial_transaction_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, debt_type, lender, debtor, principal, outstanding_balance, start_date, due_date, note, None],
        )
        # Use MAX(debt_id) for the user to get the just-inserted row
        # (avoids libsql_client HTTP mode issue with SELECT last_insert_rowid() after INSERT)
        row = db.execute(
            "SELECT MAX(debt_id) FROM Debt_Dim WHERE user_id = ?",
            [g.user_id],
        )
        debt_id = row.rows[0][0]

        cash_direction = "in" if debt_type == "debt" else "out"
        payee_id = _payee_id_for_name(db, g.user_id, lender if debt_type == "debt" else debtor)
        db.batch([
            libsql_client.Statement(
                """
                INSERT INTO Debt_Transaction_Fact
                (debt_id, user_id, account_id, payee_id, debt_transaction_type, cash_direction,
                 transaction_date, amount, note)
                VALUES (?, ?, ?, ?, 'disbursement', ?, ?, ?, ?)
                """,
                [debt_id, g.user_id, account_id, payee_id, cash_direction, transaction_date, principal, note or name],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [account_delta, account_id, g.user_id],
            ),
        ])
        logger.info(f"Created debt {debt_id}: {name} for user {g.user_id}")
    except Exception as e:
        logger.error(f"Error creating debt: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Debt created successfully", "debt_id": debt_id}), 201


@debts_bp.route("/api/debts/<int:debt_id>", methods=["PUT"])
@require_auth
def update_debt(debt_id: int):
    data = request.get_json(silent=True) or {}

    updates = {k: v for k, v in data.items() if k in ALLOWED_UPDATE_FIELDS}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    db = get_db()
    try:
        _ensure_debt_schema(db)
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [debt_id, g.user_id]
        db.execute(
            f"UPDATE Debt_Dim SET {set_clause} WHERE debt_id = ? AND user_id = ?",
            values,
        )
        logger.info(f"Updated debt {debt_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Debt updated successfully"}), 200


@debts_bp.route("/api/debts/<int:debt_id>", methods=["DELETE"])
@require_auth
def delete_debt(debt_id: int):
    db = get_db()
    try:
        _ensure_debt_schema(db)
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        movement_result = db.execute(
            """
            SELECT account_id,
                   SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END) AS delta
            FROM Debt_Transaction_Fact
            WHERE debt_id = ?
              AND user_id = ?
              AND is_deleted = 0
            GROUP BY account_id
            """,
            [debt_id, g.user_id],
        )
        statements = [
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [delta or 0, account_id, g.user_id],
            )
            for account_id, delta in movement_result.rows
        ]
        statements.extend([
            libsql_client.Statement("DELETE FROM Debt_Transaction_Fact WHERE debt_id = ? AND user_id = ?", [debt_id, g.user_id]),
            libsql_client.Statement("DELETE FROM Debt_Dim WHERE debt_id = ? AND user_id = ?", [debt_id, g.user_id]),
        ])
        db.batch(statements)
        logger.info(f"Hard-deleted debt {debt_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Debt deleted successfully"}), 200


@debts_bp.route("/api/debts/<int:debt_id>/payments", methods=["GET"])
@require_auth
def get_debt_payments(debt_id: int):
    db = get_db()
    try:
        _ensure_debt_schema(db)
        # Verify ownership
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        result = db.execute(
            """
            SELECT debt_transaction_id AS payment_id,
                   debt_transaction_id,
                   debt_id,
                   transaction_date AS payment_date,
                   amount AS amount_paid,
                   amount AS principal_portion,
                   0 AS interest_portion,
                   account_id,
                   payee_id,
                   debt_transaction_type,
                   cash_direction,
                   note
            FROM Debt_Transaction_Fact
            WHERE debt_id = ? AND user_id = ? AND is_deleted = 0
            ORDER BY transaction_date DESC
            """,
            [debt_id, g.user_id],
        )
        payments = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(payments), 200


@debts_bp.route("/api/debts/<int:debt_id>/payments", methods=["POST"])
@require_auth
def create_debt_payment(debt_id: int):
    data = request.get_json(silent=True) or {}

    payment_date = data.get("payment_date")
    account_id = data.get("account_id")
    note = (data.get("note") or "").strip()

    if not payment_date:
        return jsonify({"error": "payment_date is required"}), 400

    try:
        amount_paid = int(data.get("amount_paid") or 0)
        if amount_paid <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount_paid must be a positive integer"}), 400

    db = get_db()
    try:
        _ensure_debt_schema(db)
        # Verify ownership
        check = db.execute(
            "SELECT debt_id, debt_type, name, outstanding_balance FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        _, debt_type, debt_name, _ = check.rows[0]
        if account_id is None:
            return jsonify({"error": "account_id is required"}), 400
        try:
            account_id = int(account_id)
        except (ValueError, TypeError):
            return jsonify({"error": "account_id must be an integer"}), 400
        account = db.execute(
            "SELECT account_id FROM Account_Dim WHERE account_id = ? AND user_id = ?",
            [account_id, g.user_id],
        )
        if not account.rows:
            return jsonify({"error": "Account not found"}), 404

        cash_direction = "out" if debt_type == "debt" else "in"
        delta = amount_paid if cash_direction == "in" else -amount_paid
        debt_row = db.execute(
            "SELECT lender, debtor FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        lender, debtor = debt_row.rows[0][0], debt_row.rows[0][1]
        payee_id = _payee_id_for_name(db, g.user_id, lender if debt_type == "debt" else debtor)
        statements = [
            libsql_client.Statement(
                """
                INSERT INTO Debt_Transaction_Fact
                (debt_id, user_id, account_id, payee_id, debt_transaction_type, cash_direction,
                 transaction_date, amount, note)
                VALUES (?, ?, ?, ?, 'payment', ?, ?, ?, ?)
                """,
                [debt_id, g.user_id, account_id, payee_id, cash_direction, payment_date, amount_paid, note or debt_name],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [delta, account_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance - ? WHERE debt_id = ? AND user_id = ?",
                [amount_paid, debt_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET status = 'settled' WHERE debt_id = ? AND user_id = ? AND outstanding_balance <= 0 AND status != 'settled'",
                [debt_id, g.user_id],
            ),
        ]
        db.batch(statements)

        row = db.execute(
            "SELECT MAX(debt_transaction_id) FROM Debt_Transaction_Fact WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        payment_id = row.rows[0][0]

        logger.info(f"Recorded payment {payment_id} for debt {debt_id}: {amount_paid}")
    except Exception as e:
        logger.error(f"Error recording debt payment: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Payment recorded successfully", "payment_id": payment_id}), 201


@debts_bp.route("/api/debts/<int:debt_id>/payments/<int:payment_id>", methods=["DELETE"])
@require_auth
def delete_debt_payment(debt_id: int, payment_id: int):
    db = get_db()
    try:
        _ensure_debt_schema(db)
        # Verify ownership via debt
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        pmt = db.execute(
            "SELECT amount, account_id, cash_direction FROM Debt_Transaction_Fact WHERE debt_transaction_id = ? AND debt_id = ? AND user_id = ? AND is_deleted = 0",
            [payment_id, debt_id, g.user_id],
        )
        if not pmt.rows:
            return jsonify({"error": "Payment not found"}), 404

        amount_paid, account_id, cash_direction = pmt.rows[0]
        delta = amount_paid if cash_direction == "in" else -amount_paid
        statements = [
            libsql_client.Statement(
                "UPDATE Debt_Transaction_Fact SET is_deleted = 1, updated_at = datetime('now') WHERE debt_transaction_id = ? AND debt_id = ? AND user_id = ?",
                [payment_id, debt_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance + ?, status = CASE WHEN status = 'settled' THEN 'active' ELSE status END WHERE debt_id = ? AND user_id = ?",
                [amount_paid, debt_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [delta, account_id, g.user_id],
            ),
        ]

        db.batch(statements)
        logger.info(f"Deleted payment {payment_id} from debt {debt_id}, restored {amount_paid}")
    except Exception as e:
        logger.error(f"Error deleting debt payment: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Payment deleted successfully"}), 200
