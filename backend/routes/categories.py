"""
routes/categories.py

Endpoints:
  GET /api/categories          — list user's categories
  PUT /api/categories/<id>     — update monthly budget for a category
"""
import logging

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/api/categories", methods=["GET"])
@require_auth
def get_categories():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Category_Dim WHERE user_id = ? ORDER BY category_id",
            [g.user_id],
        )
        categories = rows_to_dicts(result)
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

    db = get_db()
    try:
        db.execute(
            "UPDATE Category_Dim SET budget = ? WHERE category_id = ? AND user_id = ?",
            [int(new_budget), category_id, g.user_id],
        )
    finally:
        db.close()
    return jsonify({"message": "Category budget updated successfully!"}), 200
