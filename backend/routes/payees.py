"""
routes/payees.py

Endpoints:
  GET    /api/payees          — list user's payees
  POST   /api/payees          — create a payee
  PUT    /api/payees/<id>     — update a payee
  DELETE /api/payees/<id>     — delete a payee
"""
import logging

from flask import Blueprint, request, jsonify, g

from database import get_db, rows_to_dicts
from auth.jwt_utils import require_auth

logger = logging.getLogger(__name__)

payees_bp = Blueprint("payees", __name__)


@payees_bp.route("/api/payees", methods=["GET"])
@require_auth
def get_payees():
    db = get_db()
    try:
        result = db.execute(
            "SELECT payee_id, payee_name, default_category_id FROM payees WHERE user_id = ? ORDER BY payee_name",
            [g.user_id],
        )
        payees = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(payees), 200


@payees_bp.route("/api/payees", methods=["POST"])
@require_auth
def create_payee():
    data                = request.get_json(silent=True) or {}
    payee_name          = data.get("payee_name", "").strip()
    default_category_id = data.get("default_category_id") or None

    if not payee_name:
        return jsonify({"error": "payee_name is required"}), 400

    db = get_db()
    try:
        try:
            db.execute(
                "INSERT INTO payees (user_id, payee_name, default_category_id) VALUES (?, ?, ?)",
                [g.user_id, payee_name, default_category_id],
            )
        except Exception as e:
            if "UNIQUE" in str(e).upper():
                return jsonify({"error": "Payee already exists"}), 409
            raise

        result = db.execute(
            "SELECT payee_id FROM payees WHERE user_id = ? AND payee_name = ?",
            [g.user_id, payee_name],
        )
        payee_id = result.rows[0][0] if result.rows else None
    finally:
        db.close()

    return jsonify({"payee_id": payee_id, "payee_name": payee_name}), 201


@payees_bp.route("/api/payees/<int:payee_id>", methods=["PUT"])
@require_auth
def update_payee(payee_id: int):
    data = request.get_json(silent=True) or {}

    db = get_db()
    try:
        # Verify ownership
        check = db.execute(
            "SELECT payee_id FROM payees WHERE payee_id = ? AND user_id = ?",
            [payee_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Payee not found"}), 404

        # Build partial update for fields that were provided
        updates = []
        params  = []
        if "payee_name" in data and data["payee_name"].strip():
            updates.append("payee_name = ?")
            params.append(data["payee_name"].strip())
        if "default_category_id" in data:
            updates.append("default_category_id = ?")
            params.append(data["default_category_id"] or None)

        if updates:
            params += [payee_id, g.user_id]
            db.execute(
                f"UPDATE payees SET {', '.join(updates)} WHERE payee_id = ? AND user_id = ?",
                params,
            )
    finally:
        db.close()

    return jsonify({"message": "Payee updated"}), 200


@payees_bp.route("/api/payees/<int:payee_id>", methods=["DELETE"])
@require_auth
def delete_payee(payee_id: int):
    db = get_db()
    try:
        check = db.execute(
            "SELECT payee_id FROM payees WHERE payee_id = ? AND user_id = ?",
            [payee_id, g.user_id],
        )
        if not check.rows:
            return jsonify({"error": "Payee not found"}), 404

        db.execute(
            "DELETE FROM payees WHERE payee_id = ? AND user_id = ?",
            [payee_id, g.user_id],
        )
    finally:
        db.close()

    return jsonify({"message": "Payee deleted"}), 200
