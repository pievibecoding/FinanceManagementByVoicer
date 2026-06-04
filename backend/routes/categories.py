"""
routes/categories.py

Endpoints:
  GET /api/categories          — list user's categories (budget merged from budgets table)
  PUT /api/categories/<id>     — update monthly budget for a category
"""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/api/categories", methods=["GET"])
@require_auth
def get_categories():
    current_month = datetime.now().strftime("%Y-%m")
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Category_Dim WHERE user_id = ? ORDER BY category_id",
            [g.user_id],
        )
        categories = rows_to_dicts(result)

        # Merge budget from budgets table for current month
        budget_result = db.execute(
            "SELECT category_id, amount_limit FROM budgets WHERE user_id = ? AND month = ?",
            [g.user_id, current_month],
        )
        budget_map = {row[0]: row[1] for row in budget_result.rows}

        for cat in categories:
            cat["budget"] = budget_map.get(cat["category_id"], 0)
    finally:
        db.close()
    return jsonify(categories), 200


@categories_bp.route("/api/categories/<category_id>", methods=["PUT"])
@require_auth
def update_category_budget(category_id: str):
    data       = request.get_json(silent=True) or {}
    new_budget = data.get("budget")

    if new_budget is None:
        return jsonify({"error": "Budget is required"}), 400

    current_month = datetime.now().strftime("%Y-%m")

    db = get_db()
    try:
        # Backward compat: keep Category_Dim.budget in sync
        db.execute(
            "UPDATE Category_Dim SET budget = ? WHERE category_id = ? AND user_id = ?",
            [int(new_budget), category_id, g.user_id],
        )
        # Also upsert into budgets table for current month
        db.execute(
            """INSERT OR REPLACE INTO budgets (user_id, category_id, month, amount_limit)
               VALUES (?, ?, ?, ?)""",
            [g.user_id, category_id, current_month, int(new_budget)],
        )
    finally:
        db.close()
    return jsonify({"message": "Category budget updated successfully!"}), 200
