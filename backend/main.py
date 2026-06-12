"""
main.py — Application entry point.

Responsibilities:
  1. Create the Flask app and register all Blueprints.
  2. Expose lightweight health checks that do not touch the database.
  3. Start the server when executed directly.
"""
import logging
import os
import threading

from flask import Flask, jsonify
from flask_cors import CORS

from database import initialize_db
from auth.router         import auth_bp
from routes.transactions import transactions_bp
from routes.accounts     import accounts_bp
from routes.categories   import categories_bp
from routes.analytics    import analytics_bp
from routes.budgets      import budgets_bp
from routes.payees       import payees_bp
from routes.recurring    import recurring_bp
from routes.debts        import debts_bp
from routes.savings      import savings_bp

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @app.route("/ping", methods=["GET", "HEAD"])
    @app.route("/api/ping", methods=["GET", "HEAD"])
    def ping():
        return "pong", 200

    @app.route("/health", methods=["GET", "HEAD"])
    @app.route("/api/health", methods=["GET", "HEAD"])
    def health():
        return jsonify({"status": "ok"}), 200

    # Global error handler — returns JSON instead of HTML for all unhandled exceptions
    @app.errorhandler(Exception)
    def handle_exception(e):
        import traceback
        logger.error(f"Unhandled exception: {e}\n{traceback.format_exc()}")
        from flask import jsonify
        return jsonify({"error": str(e)}), 500

    # Debug endpoint — check table schemas
    @app.route("/api/debug/tables", methods=["GET"])
    def debug_tables():
        from database import get_db
        from flask import jsonify
        db = get_db()
        try:
            result = db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            tables = [row[0] for row in result.rows]
            schemas = {}
            for t in tables:
                try:
                    info = db.execute(f"PRAGMA table_info({t})")
                    schemas[t] = [{"cid": r[0], "name": r[1], "type": r[2], "notnull": r[3], "dflt_value": r[4], "pk": r[5]} for r in info.rows]
                except Exception as e:
                    schemas[t] = str(e)
        finally:
            db.close()
        return jsonify({"tables": tables, "schemas": schemas})

    # Register route blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(payees_bp)
    app.register_blueprint(recurring_bp)
    app.register_blueprint(debts_bp)
    app.register_blueprint(savings_bp)

    return app


def initialize_db_async() -> None:
    """Run database initialization without blocking Render's port bind."""
    thread = threading.Thread(target=initialize_db, name="db-initializer", daemon=True)
    thread.start()


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()
    initialize_db_async()
    port = int(os.environ.get("PORT", "5000"))
    app.run(debug=False, host="0.0.0.0", port=port)
