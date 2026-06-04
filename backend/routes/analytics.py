"""
routes/analytics.py

Endpoints:
  POST /api/sql-query   — execute a SELECT query (authenticated, SELECT only)
"""
import logging

from flask import Blueprint, request, jsonify

from database import get_db
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/api/sql-query", methods=["POST"])
@require_auth
def execute_sql_query():
    data  = request.get_json(silent=True) or {}
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"error": "SQL query is required"}), 400
    if not query.upper().startswith("SELECT"):
        return jsonify({"error": "Only SELECT queries are allowed."}), 400

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
