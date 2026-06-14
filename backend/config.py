import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env", override=True)

# ── Turso database ─────────────────────────────────────────────────────────────
TURSO_DB_URL     = os.getenv("TURSO_DB_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

# ── Auth ───────────────────────────────────────────────────────────────────────
AUTH_SECRET_KEY        = os.getenv("AUTH_SECRET_KEY", "change-me-in-production")
AUTH_TOKEN_EXPIRE_DAYS = int(os.getenv("AUTH_TOKEN_EXPIRE_DAYS", "1"))
GOOGLE_CLIENT_ID       = os.getenv("GOOGLE_CLIENT_ID", "")
