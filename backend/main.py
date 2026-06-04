"""
main.py — Application entry point.

Responsibilities:
  1. Create the Flask app and register all Blueprints.
  2. Run DB initialization (create tables + seed data) at startup.
  3. Start the development server when executed directly.
"""
import logging

from flask import Flask
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

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register route blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(accounts_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(payees_bp)
    app.register_blueprint(recurring_bp)

    return app


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    initialize_db()

    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
