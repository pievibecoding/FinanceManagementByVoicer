"""
routes/budgets.py

Endpoints:
  GET    /api/budgets                  — list user's budgets for a given month
  PUT    /api/budgets/<category_id>    — upsert a budget for a category + month
  DELETE /api/budgets/<category_id>    — delete a budget for a category + month
"""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

budgets_bp = Blueprint("budgets", __name__)


def _ensure_budgets_schema(db) -> None:
    db.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            amount_limit INTEGER NOT NULL DEFAULT 0,
            UNIQUE (user_id, category_id, month)
        )
    """)


def _current_month() -> str:
    return datetime.now().strftime("%Y-%m")


@budgets_bp.route("/api/budgets", methods=["GET"])
@require_auth
def get_budgets():
    month = request.args.get("month") or _current_month()
    db = get_db()
    try:
        _ensure_budgets_schema(db)
        result = db.execute(
            "SELECT budget_id, category_id, month, amount_limit FROM budgets WHERE user_id = ? AND month = ?",
            [g.user_id, month],
        )
        budgets = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(budgets), 200


@budgets_bp.route("/api/budgets/<int:category_id>", methods=["PUT"])
@require_auth
def upsert_budget(category_id: int):
    data         = request.get_json(silent=True) or {}
    amount_limit = data.get("amount_limit")
    month        = data.get("month") or _current_month()

    if amount_limit is None:
        return jsonify({"error": "amount_limit is required"}), 400
    try:
        amount_limit = int(amount_limit)
        if amount_limit < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount_limit must be a non-negative integer"}), 400

    db = get_db()
    try:
        _ensure_budgets_schema(db)
        db.execute(
            """INSERT OR REPLACE INTO budgets (user_id, category_id, month, amount_limit)
               VALUES (?, ?, ?, ?)""",
            [g.user_id, category_id, month, amount_limit],
        )
        result = db.execute(
            "SELECT budget_id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?",
            [g.user_id, category_id, month],
        )
        budget_id = result.rows[0][0] if result.rows else None
    finally:
        db.close()

    return jsonify({"message": "Budget updated", "budget_id": budget_id}), 200


@budgets_bp.route("/api/budgets/<int:category_id>", methods=["DELETE"])
@require_auth
def delete_budget(category_id: int):
    month = request.args.get("month") or _current_month()
    db = get_db()
    try:
        _ensure_budgets_schema(db)
        # Check the row exists and belongs to this user
        check = db.execute(
            "SELECT budget_id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?",
            [g.user_id, category_id, month],
        )
        if not check.rows:
            return jsonify({"error": "Budget not found"}), 404

        db.execute(
            "DELETE FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?",
            [g.user_id, category_id, month],
        )
    finally:
        db.close()

    return jsonify({"message": "Budget deleted"}), 200
