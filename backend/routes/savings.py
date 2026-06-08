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

from flask import Blueprint, jsonify, request, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

savings_bp = Blueprint("savings", __name__)

ALLOWED_UPDATE_FIELDS = {"name", "target_amount", "current_balance", "target_date", "linked_account_id", "status", "note"}


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
        db.execute(
            """INSERT INTO Savings_Dim
            (user_id, name, target_amount, current_balance, target_date, linked_account_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)""",
            [g.user_id, name, target_amount, current_balance, target_date, linked_account_id, note],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
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
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        # Cascade delete contributions first
        db.execute("DELETE FROM Savings_Contribution_Fact WHERE savings_id = ?", [savings_id])
        db.execute("DELETE FROM Savings_Dim WHERE savings_id = ? AND user_id = ?", [savings_id, g.user_id])
        logger.info(f"Hard-deleted savings goal {savings_id} for user {g.user_id}")
    finally:
        db.close()
    return jsonify({"message": "Savings goal deleted successfully"}), 200


@savings_bp.route("/api/savings/<int:savings_id>/contributions", methods=["GET"])
@require_auth
def get_savings_contributions(savings_id: int):
    db = get_db()
    try:
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

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
    transaction_id = data.get("transaction_id")

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
        check = db.execute(
            "SELECT savings_id, target_amount FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        db.execute(
            """INSERT INTO Savings_Contribution_Fact
            (savings_id, transaction_id, contribution_date, amount)
            VALUES (?, ?, ?, ?)""",
            [savings_id, transaction_id, contribution_date, amount],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        contribution_id = row.rows[0][0]

        # Update current balance
        db.execute(
            "UPDATE Savings_Dim SET current_balance = current_balance + ? WHERE savings_id = ?",
            [amount, savings_id],
        )

        # Auto-complete if balance >= target
        db.execute(
            "UPDATE Savings_Dim SET status = 'completed' WHERE savings_id = ? AND current_balance >= target_amount AND status = 'active'",
            [savings_id],
        )

        logger.info(f"Recorded contribution {contribution_id} for savings {savings_id}: {amount}")
    finally:
        db.close()
    return jsonify({"message": "Contribution recorded successfully", "contribution_id": contribution_id}), 201


@savings_bp.route("/api/savings/<int:savings_id>/contributions/<int:contribution_id>", methods=["DELETE"])
@require_auth
def delete_savings_contribution(savings_id: int, contribution_id: int):
    db = get_db()
    try:
        # Verify ownership via savings goal
        check = db.execute(
            "SELECT savings_id FROM Savings_Dim WHERE savings_id = ? AND user_id = ?",
            [savings_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Savings goal not found"}), 404

        contrib = db.execute(
            "SELECT amount FROM Savings_Contribution_Fact WHERE contribution_id = ? AND savings_id = ?",
            [contribution_id, savings_id],
        )
        if not contrib.rows:
            return jsonify({"error": "Contribution not found"}), 404

        amount = contrib.rows[0][0]

        db.execute(
            "DELETE FROM Savings_Contribution_Fact WHERE contribution_id = ? AND savings_id = ?",
            [contribution_id, savings_id],
        )

        # Restore balance (don't go below 0)
        db.execute(
            "UPDATE Savings_Dim SET current_balance = MAX(0, current_balance - ?) WHERE savings_id = ?",
            [amount, savings_id],
        )
        logger.info(f"Deleted contribution {contribution_id} from savings {savings_id}, restored {amount}")
    finally:
        db.close()
    return jsonify({"message": "Contribution deleted successfully"}), 200
