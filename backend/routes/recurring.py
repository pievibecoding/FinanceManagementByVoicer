"""
routes/recurring.py

Endpoints:
  GET    /api/recurring                   — list user's recurring rules
  POST   /api/recurring                   — create a rule
  PUT    /api/recurring/<id>              — update a rule
  DELETE /api/recurring/<id>              — delete a rule
  PATCH  /api/recurring/<id>/toggle       — flip is_active
  POST   /api/recurring/process           — generate due transactions
"""
import calendar
import logging
import time
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request

from auth.jwt_utils import require_auth
from database import get_db, rows_to_dicts

logger = logging.getLogger(__name__)

recurring_bp = Blueprint("recurring", __name__)

VALID_FREQUENCIES = {"daily", "weekly", "monthly", "yearly"}
VALID_TYPES = {"income", "expense", "investment"}


# ── Date advancement helper ───────────────────────────────────────────────────

def advance_date(date_str: str, frequency: str) -> str:
    """Return a new YYYY-MM-DD string advanced by one frequency unit."""
    d = date.fromisoformat(date_str)

    if frequency == "daily":
        return (d + timedelta(days=1)).isoformat()

    if frequency == "weekly":
        return (d + timedelta(weeks=1)).isoformat()

    if frequency == "monthly":
        month = d.month + 1 if d.month < 12 else 1
        year = d.year + 1 if d.month == 12 else d.year
        day = min(d.day, calendar.monthrange(year, month)[1])
        return date(year, month, day).isoformat()

    if frequency == "yearly":
        try:
            return d.replace(year=d.year + 1).isoformat()
        except ValueError:
            # Feb 29 on non-leap year → Feb 28
            return d.replace(year=d.year + 1, day=28).isoformat()

    raise ValueError(f"Unknown frequency: {frequency}")


# ── Routes ────────────────────────────────────────────────────────────────────

@recurring_bp.route("/api/recurring", methods=["GET"])
@require_auth
def get_recurring():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM recurring_transactions WHERE user_id = ? ORDER BY recurring_id",
            [g.user_id],
        )
        rules = rows_to_dicts(result)
    finally:
        db.close()
    return jsonify(rules), 200


@recurring_bp.route("/api/recurring", methods=["POST"])
@require_auth
def create_recurring():
    data = request.get_json(silent=True) or {}

    account_id    = data.get("account_id")
    category_id   = data.get("category_id")
    amount        = data.get("amount")
    tx_type       = data.get("type")
    frequency     = data.get("frequency")
    next_run_date = data.get("next_run_date")
    note          = data.get("note", "")
    end_date      = data.get("end_date")
    payee_id      = data.get("payee_id")

    if not all([account_id, category_id, amount, tx_type, frequency, next_run_date]):
        return jsonify({"error": "Missing required fields"}), 400
    if int(amount) <= 0:
        return jsonify({"error": "amount must be a positive integer"}), 400
    if frequency not in VALID_FREQUENCIES:
        return jsonify({"error": f"frequency must be one of {VALID_FREQUENCIES}"}), 400
    if tx_type not in VALID_TYPES:
        return jsonify({"error": f"type must be one of {VALID_TYPES}"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO recurring_transactions
               (user_id, account_id, category_id, payee_id, amount, type, note,
                frequency, next_run_date, end_date, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            [g.user_id, account_id, category_id, payee_id,
             int(amount), tx_type, note, frequency, next_run_date, end_date],
        )
        row = db.execute(
            "SELECT last_insert_rowid() AS id"
        )
        recurring_id = row.rows[0][0]
    finally:
        db.close()

    return jsonify({"recurring_id": recurring_id, "message": "Recurring transaction created"}), 201


@recurring_bp.route("/api/recurring/<int:recurring_id>", methods=["PUT"])
@require_auth
def update_recurring(recurring_id: int):
    db = get_db()
    try:
        existing = db.execute(
            "SELECT * FROM recurring_transactions WHERE recurring_id = ? AND user_id = ?",
            [recurring_id, g.user_id],
        )
        if not existing.rows:
            return jsonify({"error": "Not found"}), 404

        data = request.get_json(silent=True) or {}
        allowed = ["account_id", "category_id", "payee_id", "amount", "type", "note",
                   "frequency", "next_run_date", "end_date", "is_active"]
        updates = {k: v for k, v in data.items() if k in allowed}

        if not updates:
            return jsonify({"message": "No changes"}), 200

        # Validate if provided
        if "frequency" in updates and updates["frequency"] not in VALID_FREQUENCIES:
            return jsonify({"error": f"frequency must be one of {VALID_FREQUENCIES}"}), 400
        if "type" in updates and updates["type"] not in VALID_TYPES:
            return jsonify({"error": f"type must be one of {VALID_TYPES}"}), 400
        if "amount" in updates and int(updates["amount"]) <= 0:
            return jsonify({"error": "amount must be a positive integer"}), 400

        set_clause = ", ".join(f"{k} = ?" for k in updates)
        values = list(updates.values()) + [recurring_id, g.user_id]
        db.execute(
            f"UPDATE recurring_transactions SET {set_clause} WHERE recurring_id = ? AND user_id = ?",
            values,
        )
    finally:
        db.close()

    return jsonify({"message": "Recurring transaction updated"}), 200


@recurring_bp.route("/api/recurring/<int:recurring_id>", methods=["DELETE"])
@require_auth
def delete_recurring(recurring_id: int):
    db = get_db()
    try:
        existing = db.execute(
            "SELECT recurring_id FROM recurring_transactions WHERE recurring_id = ? AND user_id = ?",
            [recurring_id, g.user_id],
        )
        if not existing.rows:
            return jsonify({"error": "Not found"}), 404

        db.execute(
            "DELETE FROM recurring_transactions WHERE recurring_id = ? AND user_id = ?",
            [recurring_id, g.user_id],
        )
    finally:
        db.close()

    return jsonify({"message": "Recurring transaction deleted"}), 200


@recurring_bp.route("/api/recurring/<int:recurring_id>/toggle", methods=["PATCH"])
@require_auth
def toggle_recurring(recurring_id: int):
    db = get_db()
    try:
        result = db.execute(
            "SELECT is_active FROM recurring_transactions WHERE recurring_id = ? AND user_id = ?",
            [recurring_id, g.user_id],
        )
        if not result.rows:
            return jsonify({"error": "Not found"}), 404

        current = result.rows[0][0]
        new_value = 0 if current == 1 else 1
        db.execute(
            "UPDATE recurring_transactions SET is_active = ? WHERE recurring_id = ? AND user_id = ?",
            [new_value, recurring_id, g.user_id],
        )
    finally:
        db.close()

    return jsonify({"message": "Recurring transaction updated", "is_active": new_value}), 200


@recurring_bp.route("/api/recurring/process", methods=["POST"])
@require_auth
def process_recurring():
    today = date.today().isoformat()
    db = get_db()
    generated = 0
    try:
        result = db.execute(
            """SELECT * FROM recurring_transactions
               WHERE user_id = ? AND is_active = 1 AND next_run_date <= ?""",
            [g.user_id, today],
        )
        due_rules = rows_to_dicts(result)

        for rule in due_rules:
            tx_id = f"tx-{int(time.time() * 1000)}-r{rule['recurring_id']}"
            tx_date = f"{rule['next_run_date']} 00:00:00"

            db.execute(
                """INSERT INTO Transaction_Fact
                   (transaction_id, transaction_date, account_id, category_id,
                    amount, type, note, user_id, payee_id, is_deleted)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)""",
                [
                    tx_id,
                    tx_date,
                    rule["account_id"],
                    rule["category_id"],
                    rule["amount"],
                    rule["type"],
                    rule["note"] or "",
                    g.user_id,
                    rule.get("payee_id"),
                ],
            )
            generated += 1

            new_next = advance_date(rule["next_run_date"], rule["frequency"])
            end_date = rule.get("end_date")

            if end_date and new_next > end_date:
                db.execute(
                    """UPDATE recurring_transactions
                       SET next_run_date = ?, is_active = 0
                       WHERE recurring_id = ?""",
                    [new_next, rule["recurring_id"]],
                )
            else:
                db.execute(
                    "UPDATE recurring_transactions SET next_run_date = ? WHERE recurring_id = ?",
                    [new_next, rule["recurring_id"]],
                )
    finally:
        db.close()

    logger.info(f"process_recurring: generated {generated} transactions for user_id={g.user_id}")
    return jsonify({"generated": generated}), 200
