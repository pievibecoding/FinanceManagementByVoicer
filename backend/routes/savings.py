"""
routes/savings.py

Endpoints:
  GET    /api/savings                        — list user's savings goals
  POST   /api/savings                        — create a new savings goal
  PUT    /api/savings/<savings_id>           — update a savings goal
  DELETE /api/savings/<savings_id>           — delete a savings goal (soft delete)
  GET    /api/savings/<savings_id>/contributions — list contributions
  POST   /api/savings/<savings_id>/contributions — record a contribution
"""
import logging

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

savings_bp = Blueprint("savings", __name__)


@savings_bp.route("/api/savings", methods=["GET"])
@require_auth
def get_savings():
    db = get_db()
    try:
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
    category = (data.get("category") or "").strip()
    target_amount = int(data.get("target_amount") or 0)
    current_balance = int(data.get("current_balance") or 0)
    interest_rate = data.get("interest_rate")
    target_date = data.get("target_date")
    linked_account_id = data.get("linked_account_id")
    note = (data.get("note") or "").strip()

    if not name:
        return jsonify({"error": "name is required"}), 400
    if target_amount <= 0:
        return jsonify({"error": "target_amount must be greater than 0"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO Savings_Dim 
            (user_id, name, category, target_amount, current_balance, interest_rate, target_date, linked_account_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, category, target_amount, current_balance, interest_rate, target_date, linked_account_id, note],
        )
        logger.info(f"Created savings goal: {name} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal created successfully"}), 201


@savings_bp.route("/api/savings/<int:savings_id>", methods=["PUT"])
@require_auth
def update_savings(savings_id: int):
    data = request.get_json(silent=True) or {}

    ALLOWED_UPDATE_FIELDS = [
        "name", "category", "target_amount", "current_balance", "interest_rate",
        "target_date", "linked_account_id", "status", "note"
    ]

    update_fields = {}
    for field in ALLOWED_UPDATE_FIELDS:
        if field in data:
            update_fields[field] = data[field]

    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400

    set_clause = ", ".join([f"{f} = ?" for f in update_fields.keys()])
    values = list(update_fields.values()) + [savings_id, g.user_id]

    db = get_db()
    try:
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
        db.execute(
            "UPDATE Savings_Dim SET status = 'deleted' WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        logger.info(f"Deleted savings goal {savings_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal deleted successfully"}), 200


@savings_bp.route("/api/savings/<int:savings_id>/contributions", methods=["GET"])
@require_auth
def get_savings_contributions(savings_id: int):
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Savings_Contribution_Fact WHERE savings_id = ? ORDER BY contribution_date DESC",
            [savings_id],
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
    amount = int(data.get("amount") or 0)
    transaction_id = data.get("transaction_id")

    if not contribution_date:
        return jsonify({"error": "contribution_date is required"}), 400
    if amount <= 0:
        return jsonify({"error": "amount must be greater than 0"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO Savings_Contribution_Fact 
            (savings_id, transaction_id, contribution_date, amount)
            VALUES (?, ?, ?, ?)""",
            [savings_id, transaction_id, contribution_date, amount],
        )
        
        # Update current balance
        db.execute(
            "UPDATE Savings_Dim SET current_balance = current_balance + ? WHERE savings_id = ?",
            [amount, savings_id],
        )
        
        logger.info(f"Recorded contribution for savings goal {savings_id}: {amount}")
    finally:
        db.close()
    return jsonify({"message": "Contribution recorded successfully"}), 201
