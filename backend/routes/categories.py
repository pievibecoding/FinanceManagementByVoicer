"""
routes/categories.py

Endpoints:
  GET /api/categories          — list user's categories (budget merged from budgets table)
  POST /api/categories         — create a category
  PUT /api/categories/<id>     — update category metadata and/or current-month budget
  DELETE /api/categories/<id>  — delete an unused category
"""
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

categories_bp = Blueprint("categories", __name__)

ALLOWED_CATEGORY_TYPES = {"income", "expense"}
ALLOWED_METADATA_FIELDS = {"category_name", "category_type", "icon", "color"}
DEFAULT_CATEGORY_ICON = "other"
LEGACY_ICON_MAP = {
    "🍜": "food",
    "🧾": "essential",
    "☕": "coffee",
    "🛒": "shopping",
    "🏠": "home",
    "🚗": "transport",
    "💡": "utilities",
    "🎬": "entertainment",
    "💊": "health",
    "📚": "education",
    "💼": "work",
    "💰": "salary",
    "📈": "investment",
    "🎁": "gift",
    "✈️": "travel",
    "📦": DEFAULT_CATEGORY_ICON,
}


def normalize_category_icon(value) -> str:
    icon = (value or DEFAULT_CATEGORY_ICON).strip() if isinstance(value, str) else DEFAULT_CATEGORY_ICON
    return LEGACY_ICON_MAP.get(icon, icon or DEFAULT_CATEGORY_ICON)


@categories_bp.route("/api/categories", methods=["GET"])
@require_auth
def get_categories():
    current_month = datetime.now().strftime("%Y-%m")
    db = get_db()
    try:
        result = db.execute(
            """SELECT * FROM Category_Dim
               WHERE user_id = ?
                 AND category_type != 'investment'
                 AND category_name != 'Đầu tư chứng khoán'
               ORDER BY category_id""",
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


@categories_bp.route("/api/categories", methods=["POST"])
@require_auth
def create_category():
    data = request.get_json(silent=True) or {}
    logger.info(
        "Create category request: user_id=%s payload=%s",
        getattr(g, "user_id", None),
        data,
    )

    category_name = (data.get("category_name") or "").strip()
    category_type = (data.get("category_type") or "expense").strip()
    icon = normalize_category_icon(data.get("icon"))
    color = (data.get("color") or "#a8f8f8").strip()

    if not category_name:
        return jsonify({"error": "category_name is required"}), 400
    if category_type not in ALLOWED_CATEGORY_TYPES:
        return jsonify({"error": "category_type is invalid"}), 400

    db = get_db()
    try:
        duplicate = db.execute(
            "SELECT category_id FROM Category_Dim WHERE user_id = ? AND category_name = ?",
            [g.user_id, category_name],
        )
        if duplicate.rows:
            return jsonify({"error": "Category already exists"}), 409

        db.execute(
            """INSERT INTO Category_Dim
               (user_id, category_name, category_type, icon, color)
               VALUES (?, ?, ?, ?, ?)""",
            [g.user_id, category_name, category_type, icon, color],
        )
        row = db.execute(
            "SELECT MAX(category_id) FROM Category_Dim WHERE user_id = ?",
            [g.user_id],
        )
        category_id = row.rows[0][0]
    except Exception:
        logger.exception(
            "Create category failed: user_id=%s payload=%s",
            getattr(g, "user_id", None),
            data,
        )
        raise
    finally:
        db.close()

    return jsonify({"message": "Category created", "category_id": str(category_id)}), 201


@categories_bp.route("/api/categories/<category_id>", methods=["PUT"])
@require_auth
def update_category(category_id: str):
    data = request.get_json(silent=True) or {}
    logger.info(
        "Update category request: user_id=%s category_id=%s payload=%s",
        getattr(g, "user_id", None),
        category_id,
        data,
    )
    new_budget = data.get("budget")

    metadata_updates = {
        key: (normalize_category_icon(value) if key == "icon" else value.strip() if isinstance(value, str) else value)
        for key, value in data.items()
        if key in ALLOWED_METADATA_FIELDS and value is not None
    }

    if "category_name" in metadata_updates and not metadata_updates["category_name"]:
        return jsonify({"error": "category_name is required"}), 400
    if (
        "category_type" in metadata_updates
        and metadata_updates["category_type"] not in ALLOWED_CATEGORY_TYPES
    ):
        return jsonify({"error": "category_type is invalid"}), 400
    if new_budget is None and not metadata_updates:
        return jsonify({"error": "No valid fields to update"}), 400

    current_month = datetime.now().strftime("%Y-%m")

    db = get_db()
    try:
        check = db.execute(
            "SELECT category_id FROM Category_Dim WHERE category_id = ? AND user_id = ?",
            [category_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Category not found"}), 404

        if metadata_updates:
            set_clause = ", ".join(f"{key} = ?" for key in metadata_updates)
            db.execute(
                f"UPDATE Category_Dim SET {set_clause} WHERE category_id = ? AND user_id = ?",
                list(metadata_updates.values()) + [category_id, g.user_id],
            )

        if new_budget is not None:
            amount_limit = int(new_budget)
            # Backward compat: keep Category_Dim.budget in sync
            db.execute(
                "UPDATE Category_Dim SET budget = ? WHERE category_id = ? AND user_id = ?",
                [amount_limit, category_id, g.user_id],
            )
            # Also upsert into budgets table for current month
            db.execute(
                """INSERT OR REPLACE INTO budgets (user_id, category_id, month, amount_limit)
                   VALUES (?, ?, ?, ?)""",
                [g.user_id, category_id, current_month, amount_limit],
            )
    except Exception:
        logger.exception(
            "Update category failed: user_id=%s category_id=%s payload=%s",
            getattr(g, "user_id", None),
            category_id,
            data,
        )
        raise
    finally:
        db.close()
    return jsonify({"message": "Category updated successfully!"}), 200


@categories_bp.route("/api/categories/<category_id>", methods=["DELETE"])
@require_auth
def delete_category(category_id: str):
    db = get_db()
    try:
        check = db.execute(
            "SELECT category_id FROM Category_Dim WHERE category_id = ? AND user_id = ?",
            [category_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Category not found"}), 404

        tx_refs = db.execute(
            """SELECT transaction_id FROM Transaction_Fact
               WHERE user_id = ? AND category_id = ? AND is_deleted = 0 LIMIT 1""",
            [g.user_id, category_id],
        )
        if tx_refs.rows:
            return jsonify({"error": "Category is used by transactions"}), 409

        budget_refs = db.execute(
            "SELECT budget_id FROM budgets WHERE user_id = ? AND category_id = ? LIMIT 1",
            [g.user_id, category_id],
        )
        if budget_refs.rows:
            return jsonify({"error": "Category is used by budgets"}), 409

        db.execute(
            "DELETE FROM Category_Dim WHERE category_id = ? AND user_id = ?",
            [category_id, g.user_id],
        )
    finally:
        db.close()

    return jsonify({"message": "Category deleted"}), 200
