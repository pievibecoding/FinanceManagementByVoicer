"""
routes/analytics.py

Endpoints:
  POST /api/sql-query   — execute a SELECT query (authenticated, SELECT only)
"""
import logging
import re

from flask import Blueprint, request, jsonify

from database import get_db
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)

# Tables that must never be exposed via the SQL passthrough endpoint
_BLOCKED_TABLES = {"users", "user_settings", "schema_migrations"}
_BLOCKED_PATTERN = re.compile(
    r"\b(" + "|".join(_BLOCKED_TABLES) + r")\b", re.IGNORECASE
)


@analytics_bp.route("/api/sql-query", methods=["POST"])
@require_auth
def execute_sql_query():
    data  = request.get_json(silent=True) or {}
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"error": "SQL query is required"}), 400
    if not query.upper().lstrip().startswith("SELECT"):
        return jsonify({"error": "Only SELECT queries are allowed."}), 400
    if _BLOCKED_PATTERN.search(query):
        return jsonify({"error": "Query references a restricted table."}), 403

    db = get_db()
    try:
        result  = db.execute(query)
        headers = list(result.columns)
        rows    = [list(row) for row in result.rows]
    except Exception as e:
        logger.error(f"SQL query error: {e}")
        return jsonify({"error": str(e)}), 400
    finally:
        db.close()

    return jsonify({"headers": headers, "rows": rows}), 200
