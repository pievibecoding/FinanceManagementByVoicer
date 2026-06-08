"""
routes/debts.py

Endpoints:
  GET    /api/debts                    — list user's debts
  POST   /api/debts                    — create a new debt
  PUT    /api/debts/<debt_id>          — update a debt
  DELETE /api/debts/<debt_id>          — delete a debt (soft delete)
  GET    /api/debts/<debt_id>/payments — list debt payments
  POST   /api/debts/<debt_id>/payments — record a payment
"""
import logging

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

debts_bp = Blueprint("debts", __name__)


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
    debt_type = (data.get("debt_type") or "loan").strip()
    lender = (data.get("lender") or "").strip()
    debtor = (data.get("debtor") or "").strip()
    principal = int(data.get("principal") or 0)
    outstanding_balance = int(data.get("outstanding_balance") or principal)
    interest_rate = data.get("interest_rate")
    interest_type = (data.get("interest_type") or "").strip()
    start_date = data.get("start_date")
    due_date = data.get("due_date")
    minimum_payment = data.get("minimum_payment")
    payment_frequency = (data.get("payment_frequency") or "monthly").strip()
    note = (data.get("note") or "").strip()

    if not name:
        return jsonify({"error": "name is required"}), 400
    if principal <= 0:
        return jsonify({"error": "principal must be greater than 0"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO Debt_Dim 
            (user_id, name, debt_type, lender, debtor, principal, outstanding_balance, interest_rate, interest_type, start_date, due_date, minimum_payment, payment_frequency, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, debt_type, lender, debtor, principal, outstanding_balance, interest_rate, interest_type, start_date, due_date, minimum_payment, payment_frequency, note],
        )
        logger.info(f"Created debt: {name} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Debt created successfully"}), 201


@debts_bp.route("/api/debts/<int:debt_id>", methods=["PUT"])
@require_auth
def update_debt(debt_id: int):
    data = request.get_json(silent=True) or {}

    ALLOWED_UPDATE_FIELDS = [
        "name", "debt_type", "lender", "debtor", "outstanding_balance", "interest_rate",
        "interest_type", "start_date", "due_date", "minimum_payment",
        "payment_frequency", "status", "note"
    ]

    update_fields = {}
    for field in ALLOWED_UPDATE_FIELDS:
        if field in data:
            update_fields[field] = data[field]

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    set_clause = ", ".join([f"{f} = ?" for f in update_fields.keys()])
    values = list(update_fields.values()) + [debt_id, g.user_id]

    db = get_db()
    try:
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
        db.execute(
            "UPDATE Debt_Dim SET status = 'deleted' WHERE debt_id = ? AND user_id = ?",
            [debt_id, g.user_id],
        )
        logger.info(f"Deleted debt {debt_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Debt deleted successfully"}), 200


@debts_bp.route("/api/debts/<int:debt_id>/payments", methods=["GET"])
@require_auth
def get_debt_payments(debt_id: int):
    db = get_db()
    try:
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
    amount_paid = int(data.get("amount_paid") or 0)
    principal_portion = int(data.get("principal_portion") or 0)
    interest_portion = int(data.get("interest_portion") or 0)
    transaction_id = data.get("transaction_id")

    if not payment_date:
        return jsonify({"error": "payment_date is required"}), 400
    if amount_paid <= 0:
        return jsonify({"error": "amount_paid must be greater than 0"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO Debt_Payment_Fact 
            (debt_id, transaction_id, payment_date, amount_paid, principal_portion, interest_portion)
            VALUES (?, ?, ?, ?, ?, ?)""",
            [debt_id, transaction_id, payment_date, amount_paid, principal_portion, interest_portion],
        )
        
        # Update outstanding balance
        db.execute(
            "UPDATE Debt_Dim SET outstanding_balance = outstanding_balance - ? WHERE debt_id = ?",
            [principal_portion, debt_id],
        )
        
        logger.info(f"Recorded payment for debt {debt_id}: {amount_paid}")
    finally:
        db.close()
    return jsonify({"message": "Payment recorded successfully"}), 201
