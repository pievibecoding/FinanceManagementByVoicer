"""
routes/savings.py

Endpoints:
  GET    /api/savings                                            — list user's savings goals
  POST   /api/savings                                           — create a new savings goal
  PUT    /api/savings/<savings_id>                              — update (ownership verified)
  DELETE /api/savings/<savings_id>                              — hard delete + cascade contributions
  GET    /api/savings/<savings_id>/contributions                — list contributions (ownership verified)
  POST   /api/savings/<savings_id>/contributions                — add contribution, auto-complete
  DELETE /api/savings/<savings_id>/contributions/<contribution_id> — delete contribution, restore balance
"""
import logging
import libsql_client

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

savings_bp = Blueprint("savings", __name__)

ALLOWED_UPDATE_FIELDS = {"name", "target_amount", "current_balance", "target_date", "linked_account_id", "status", "note"}


def _table_columns(db, table_name: str) -> set[str]:
    try:
        return {row["name"] for row in rows_to_dicts(db.execute(f"PRAGMA table_info({table_name})"))}
    except Exception:
        return set()


def _ensure_savings_schema(db) -> None:
    savings_columns = {
        "current_balance": "INTEGER NOT NULL DEFAULT 0",
        "target_date": "TEXT",
        "linked_account_id": "INTEGER",
        "status": "TEXT NOT NULL DEFAULT 'active'",
        "note": "TEXT",
        "created_at": "TEXT",
    }
    existing_savings_columns = _table_columns(db, "Savings_Dim")
    for column_name, column_def in savings_columns.items():
        if column_name in existing_savings_columns:
            continue
        try:
            db.execute(f"ALTER TABLE Savings_Dim ADD COLUMN {column_name} {column_def}")
        except Exception:
            pass

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
            updated_at TEXT,
            FOREIGN KEY (savings_id) REFERENCES Savings_Dim(savings_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id)
        )
    """)


@savings_bp.route("/api/savings", methods=["GET"])
@require_auth
def get_savings():
    db = get_db()
    try:
        _ensure_savings_schema(db)
        result = db.execute(
            "SELECT * FROM Savings_Dim WHERE user_id = ? ORDER BY created_at DESC",
            [g.user_id],
        )
        savings = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(savings), 200


@savings_bp.route("/api/savings", methods=["POST"])
@require_auth
def create_savings():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    target_date = data.get("target_date")
    linked_account_id = data.get("linked_account_id")
    note = (data.get("note") or "").strip() or None

    if not name:
        return jsonify({"error": "name is required"}), 400

    try:
        target_amount = int(data.get("target_amount") or 0)
        if target_amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "target_amount must be a positive integer"}), 400

    current_balance = data.get("current_balance")
    if current_balance is None:
        current_balance = 0
    else:
        try:
            current_balance = int(current_balance)
        except (ValueError, TypeError):
            return jsonify({"error": "current_balance must be an integer"}), 400

    db = get_db()
    try:
        _ensure_savings_schema(db)
        db.execute(
            """INSERT INTO Savings_Dim
            (user_id, name, target_amount, current_balance, target_date, linked_account_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, target_amount, current_balance, target_date, linked_account_id, note],
        )
        row = db.execute(
            "SELECT MAX(savings_id) FROM Savings_Dim WHERE user_id = ?",
            [g.user_id],
        )
        savings_id = row.rows[0][0]
        logger.info(f"Created savings goal {savings_id}: {name} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal created successfully", "savings_id": savings_id}), 201


@savings_bp.route("/api/savings/<int:savings_id>", methods=["PUT"])
@require_auth
def update_savings(savings_id: int):
    data = request.get_json(silent=True) or {}

    updates = {k: v for k, v in data.items() if k in ALLOWED_UPDATE_FIELDS}
    if not updates:
        return jsonify({"error": "No valid fields to update"}), 400

    db = get_db()
    try:
        _ensure_savings_schema(db)
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [savings_id, g.user_id]
        db.execute(
            f"UPDATE Savings_Dim SET {set_clause} WHERE savings_id = ? AND user_id = ?",
            values,
        )
        logger.info(f"Updated savings goal {savings_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal updated successfully"}), 200


@savings_bp.route("/api/savings/<int:savings_id>", methods=["DELETE"])
@require_auth
def delete_savings(savings_id: int):
    db = get_db()
    try:
        _ensure_savings_schema(db)
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        movement_result = db.execute(
            """
            SELECT account_id,
                   SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END) AS delta
            FROM Savings_Transaction_Fact
            WHERE savings_id = ?
              AND user_id = ?
              AND is_deleted = 0
            GROUP BY account_id
            """,
            [savings_id, g.user_id],
        )
        statements = [
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [delta or 0, account_id, g.user_id],
            )
            for account_id, delta in movement_result.rows
        ]
        statements.extend([
            libsql_client.Statement("DELETE FROM Savings_Transaction_Fact WHERE savings_id = ? AND user_id = ?", [savings_id, g.user_id]),
            libsql_client.Statement("DELETE FROM Savings_Dim WHERE savings_id = ? AND user_id = ?", [savings_id, g.user_id]),
        ])
        db.batch(statements)
        logger.info(f"Hard-deleted savings goal {savings_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal deleted successfully"}), 200


@savings_bp.route("/api/savings/<int:savings_id>/contributions", methods=["GET"])
@require_auth
def get_savings_contributions(savings_id: int):
    db = get_db()
    try:
        _ensure_savings_schema(db)
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        result = db.execute(
            """
            SELECT savings_transaction_id AS contribution_id,
                   savings_transaction_id,
                   savings_id,
                   account_id,
                   transaction_date AS contribution_date,
                   amount,
                   note,
                   savings_transaction_type,
                   cash_direction,
                   created_at,
                   updated_at
            FROM Savings_Transaction_Fact
            WHERE savings_id = ?
              AND user_id = ?
              AND savings_transaction_type = 'contribution'
              AND is_deleted = 0
            ORDER BY transaction_date DESC
            """,
            [savings_id, g.user_id],
        )
        contributions = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(contributions), 200


@savings_bp.route("/api/savings/<int:savings_id>/contributions", methods=["POST"])
@require_auth
def create_savings_contribution(savings_id: int):
    data = request.get_json(silent=True) or {}

    contribution_date = data.get("contribution_date")
    account_id = data.get("account_id")
    note = (data.get("note") or "").strip()

    if not contribution_date:
        return jsonify({"error": "contribution_date is required"}), 400

    try:
        amount = int(data.get("amount") or 0)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be a positive integer"}), 400

    db = get_db()
    try:
        _ensure_savings_schema(db)
        check = db.execute(
            "SELECT savings_id, name, target_amount FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        _, savings_name, _ = check.rows[0]
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

        statements = [
            libsql_client.Statement(
                """
                INSERT INTO Savings_Transaction_Fact
                (savings_id, user_id, account_id, savings_transaction_type, cash_direction,
                 transaction_date, amount, note)
                VALUES (?, ?, ?, 'contribution', 'out', ?, ?, ?)
                """,
                [savings_id, g.user_id, account_id, contribution_date, amount, note or savings_name],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                [amount, account_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Savings_Dim SET current_balance = current_balance + ? WHERE savings_id = ? AND user_id = ?",
                [amount, savings_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Savings_Dim SET status = 'completed' WHERE savings_id = ? AND user_id = ? AND current_balance >= target_amount AND status = 'active'",
                [savings_id, g.user_id],
            ),
        ]
        db.batch(statements)

        row = db.execute(
            "SELECT MAX(savings_transaction_id) FROM Savings_Transaction_Fact WHERE savings_id = ? AND user_id = ? AND savings_transaction_type = 'contribution'",
            [savings_id, g.user_id],
        )
        contribution_id = row.rows[0][0]

        logger.info(f"Recorded contribution {contribution_id} for savings {savings_id}: {amount}")
    except Exception as e:
        logger.error(f"Error recording savings contribution: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Contribution recorded successfully", "contribution_id": contribution_id}), 201


@savings_bp.route("/api/savings/<int:savings_id>/contributions/<int:contribution_id>", methods=["DELETE"])
@require_auth
def delete_savings_contribution(savings_id: int, contribution_id: int):
    db = get_db()
    try:
        _ensure_savings_schema(db)
        # Verify ownership via savings goal
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        movement = db.execute(
            """
            SELECT amount, account_id
            FROM Savings_Transaction_Fact
            WHERE savings_transaction_id = ?
              AND savings_id = ?
              AND user_id = ?
              AND savings_transaction_type = 'contribution'
              AND is_deleted = 0
            """,
            [contribution_id, savings_id, g.user_id],
        )
        if not movement.rows:
            return jsonify({"error": "Contribution not found"}), 404

        amount, account_id = movement.rows[0]
        statements = [
            libsql_client.Statement(
                "UPDATE Savings_Transaction_Fact SET is_deleted = 1, updated_at = datetime('now') WHERE savings_transaction_id = ? AND savings_id = ? AND user_id = ?",
                [contribution_id, savings_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Savings_Dim SET current_balance = MAX(0, current_balance - ?), status = CASE WHEN status = 'completed' THEN 'active' ELSE status END WHERE savings_id = ? AND user_id = ?",
                [amount, savings_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [amount, account_id, g.user_id],
            ),
        ]

        db.batch(statements)
        logger.info(f"Deleted contribution {contribution_id} from savings {savings_id}, restored {amount}")
    except Exception as e:
        logger.error(f"Error deleting savings contribution: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Contribution deleted successfully"}), 200


@savings_bp.route("/api/savings/<int:savings_id>/withdrawals", methods=["POST"])
@require_auth
def create_savings_withdrawal(savings_id: int):
    data = request.get_json(silent=True) or {}

    withdrawal_date = data.get("withdrawal_date")
    account_id = data.get("account_id")
    note = (data.get("note") or "").strip()

    if not withdrawal_date:
        return jsonify({"error": "withdrawal_date is required"}), 400
    if account_id is None:
        return jsonify({"error": "account_id is required"}), 400

    try:
        account_id = int(account_id)
        amount = int(data.get("amount") or 0)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount and account_id must be valid positive integers"}), 400

    db = get_db()
    try:
        _ensure_savings_schema(db)
        savings = db.execute(
            "SELECT savings_id, name, current_balance FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not savings.rows:
            return jsonify({"error": "Savings goal not found"}), 404
        _, savings_name, current_balance = savings.rows[0]
        if int(current_balance) < amount:
            return jsonify({"error": "Withdrawal exceeds savings balance"}), 400

        account = db.execute(
            "SELECT account_id FROM Account_Dim WHERE account_id = ? AND user_id = ?",
            [account_id, g.user_id],
        )
        if not account.rows:
            return jsonify({"error": "Account not found"}), 404

        db.batch([
            libsql_client.Statement(
                """
                INSERT INTO Savings_Transaction_Fact
                (savings_id, user_id, account_id, savings_transaction_type, cash_direction,
                 transaction_date, amount, note)
                VALUES (?, ?, ?, 'withdrawal', 'in', ?, ?, ?)
                """,
                [savings_id, g.user_id, account_id, withdrawal_date, amount, note or savings_name],
            ),
            libsql_client.Statement(
                "UPDATE Savings_Dim SET current_balance = current_balance - ?, status = CASE WHEN status = 'completed' THEN 'active' ELSE status END WHERE savings_id = ? AND user_id = ?",
                [amount, savings_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                [amount, account_id, g.user_id],
            ),
        ])
        row = db.execute(
            "SELECT MAX(savings_transaction_id) FROM Savings_Transaction_Fact WHERE savings_id = ? AND user_id = ? AND savings_transaction_type = 'withdrawal'",
            [savings_id, g.user_id],
        )
        withdrawal_id = row.rows[0][0]
    except Exception as e:
        logger.error(f"Error recording savings withdrawal: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Withdrawal recorded successfully", "withdrawal_id": withdrawal_id}), 201
