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

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

debts_bp = Blueprint("debts", __name__)

ALLOWED_UPDATE_FIELDS = {"name", "lender", "debtor", "principal", "outstanding_balance", "start_date", "due_date", "note", "status"}


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
        row = db.execute("SELECT last_insert_rowid() AS id")
        debt_id = row.rows[0][0]
        logger.info(f"Created debt {debt_id}: {name} for user {g.user_id}")
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
    transaction_id = data.get("transaction_id")

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
            "SELECT debt_id, outstanding_balance FROM Debt_Dim WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Debt not found"}), 404

        db.execute(
            """INSERT INTO Debt_Payment_Fact
            (debt_id, transaction_id, payment_date, amount_paid, principal_portion, interest_portion)
            VALUES (?, ?, ?, ?, ?, ?)""",
            [debt_id, transaction_id, payment_date, amount_paid, amount_paid, 0],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        payment_id = row.rows[0][0]

        # Update outstanding balance
        db.execute(
            "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance - ? WHERE debt_id = ?",
            [amount_paid, debt_id],
        )

        # Auto-settle if balance <= 0
        db.execute(
            "UPDATE Debt_Dim SET status = 'settled' WHERE debt_id = ? AND outstanding_balance <= 0",
            [debt_id],
        )

        logger.info(f"Recorded payment {payment_id} for debt {debt_id}: {amount_paid}")
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
            "SELECT amount_paid FROM Debt_Payment_Fact WHERE payment_id = ? AND debt_id = ?",
            [payment_id, debt_id],
        )
        if not pmt.rows:
            return jsonify({"error": "Payment not found"}), 404

        amount_paid = pmt.rows[0][0]

        db.execute(
            "DELETE FROM Debt_Payment_Fact WHERE payment_id = ? AND debt_id = ?",
            [payment_id, debt_id],
        )

        # Restore outstanding balance and reopen if was settled
        db.execute(
            "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance + ?, status = CASE WHEN status = 'settled' THEN 'active' ELSE status END WHERE debt_id = ?",
            [amount_paid, debt_id],
        )
        logger.info(f"Deleted payment {payment_id} from debt {debt_id}, restored {amount_paid}")
    finally:
        db.close()
    return jsonify({"message": "Payment deleted successfully"}), 200
