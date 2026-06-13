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
import libsql_client

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

debts_bp = Blueprint("debts", __name__)

ALLOWED_UPDATE_FIELDS = {"name", "lender", "debtor", "principal", "outstanding_balance", "start_date", "due_date", "note", "status"}


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
    return int(amount) if tx_type in ("income", "transfer_in") else -int(amount)


@debts_bp.route("/api/debts", methods=["GET"])
@require_auth
def get_debts():
    db = get_db()
    try:
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

    if not name:
        return jsonify({"error": "name is required"}), 400
    if debt_type not in ("debt", "loan"):
        return jsonify({"error": "debt_type must be 'debt' or 'loan'"}), 400

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

    db = get_db()
    try:
        db.execute(
            """INSERT INTO Debt_Dim
            (user_id, name, debt_type, lender, debtor, principal, outstanding_balance, start_date, due_date, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, debt_type, lender, debtor, principal, outstanding_balance, start_date, due_date, note],
        )
        # Use MAX(debt_id) for the user to get the just-inserted row
        # (avoids libsql_client HTTP mode issue with SELECT last_insert_rowid() after INSERT)
        row = db.execute(
            "SELECT MAX(debt_id) FROM Debt_Dim WHERE user_id = ?",
            [g.user_id],
        )
        debt_id = row.rows[0][0]
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
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        # Cascade delete payments first
        db.execute("DELETE FROM Debt_Payment_Fact WHERE debt_id = ?", [debt_id])
        db.execute("DELETE FROM Debt_Dim WHERE debt_id = ? AND user_id = ?", [debt_id, g.user_id])
        logger.info(f"Hard-deleted debt {debt_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Debt deleted successfully"}), 200


@debts_bp.route("/api/debts/<int:debt_id>/payments", methods=["GET"])
@require_auth
def get_debt_payments(debt_id: int):
    db = get_db()
    try:
        # Verify ownership
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        result = db.execute(
            "SELECT * FROM Debt_Payment_Fact WHERE debt_id = ? ORDER BY payment_date DESC",
            [debt_id],
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
        # Verify ownership
        check = db.execute(
            "SELECT debt_id, debt_type, name, outstanding_balance FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        _, debt_type, debt_name, _ = check.rows[0]
        transaction_id = None
        statements = []

        if account_id is not None:
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

            category_id = _transfer_category_id(db, g.user_id)
            if not category_id:
                return jsonify({"error": "No categories found for user"}), 400

            transaction_id = f"tx-{int(time.time() * 1000)}"
            tx_type = "transfer_out" if debt_type == "debt" else "transfer_in"
            delta = _transaction_delta(tx_type, amount_paid)
            statements.extend([
                libsql_client.Statement(
                    """
                    INSERT INTO Transaction_Fact
                    (transaction_id, transaction_date, account_id, category_id, amount, type, note, user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [transaction_id, payment_date, account_id, category_id, amount_paid, tx_type, note or debt_name, g.user_id],
                ),
                libsql_client.Statement(
                    "UPDATE Account_Dim SET current_balance = current_balance + ? WHERE account_id = ? AND user_id = ?",
                    [delta, account_id, g.user_id],
                ),
            ])

        statements.extend([
            libsql_client.Statement(
                """INSERT INTO Debt_Payment_Fact
                (debt_id, transaction_id, payment_date, amount_paid, principal_portion, interest_portion)
                VALUES (?, ?, ?, ?, ?, ?)""",
                [debt_id, transaction_id, payment_date, amount_paid, amount_paid, 0],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance - ? WHERE debt_id = ? AND user_id = ?",
                [amount_paid, debt_id, g.user_id],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET status = 'settled' WHERE debt_id = ? AND user_id = ? AND outstanding_balance <= 0 AND status != 'settled'",
                [debt_id, g.user_id],
            ),
        ])
        db.batch(statements)

        row = db.execute(
            "SELECT MAX(payment_id) FROM Debt_Payment_Fact WHERE debt_id = ?",
            [debt_id],
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
        # Verify ownership via debt
        check = db.execute(
            "SELECT debt_id FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        # Get payment amount before deleting
        pmt = db.execute(
            "SELECT amount_paid, transaction_id FROM Debt_Payment_Fact WHERE payment_id = ? AND debt_id = ?",
            [payment_id, debt_id],
        )
        if not pmt.rows:
            return jsonify({"error": "Payment not found"}), 404

        amount_paid, linked_tx_id = pmt.rows[0]
        statements = [
            libsql_client.Statement(
                "DELETE FROM Debt_Payment_Fact WHERE payment_id = ? AND debt_id = ?",
                [payment_id, debt_id],
            ),
            libsql_client.Statement(
                "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance + ?, status = CASE WHEN status = 'settled' THEN 'active' ELSE status END WHERE debt_id = ? AND user_id = ?",
                [amount_paid, debt_id, g.user_id],
            ),
        ]

        if linked_tx_id:
            tx = db.execute(
                "SELECT type, amount, account_id FROM Transaction_Fact WHERE transaction_id = ? AND user_id = ? AND is_deleted = 0",
                [linked_tx_id, g.user_id],
            )
            if tx.rows:
                tx_type, tx_amount, account_id = tx.rows[0]
                delta = _transaction_delta(tx_type, int(tx_amount))
                statements.extend([
                    libsql_client.Statement(
                        "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
                        [linked_tx_id, g.user_id],
                    ),
                    libsql_client.Statement(
                        "UPDATE Account_Dim SET current_balance = current_balance - ? WHERE account_id = ? AND user_id = ?",
                        [delta, account_id, g.user_id],
                    ),
                ])

        db.batch(statements)
        logger.info(f"Deleted payment {payment_id} from debt {debt_id}, restored {amount_paid}")
    except Exception as e:
        logger.error(f"Error deleting debt payment: {e}")
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    finally:
        db.close()
    return jsonify({"message": "Payment deleted successfully"}), 200
