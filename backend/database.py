import logging
import libsql_client
from config import TURSO_DB_URL, TURSO_AUTH_TOKEN

logger = logging.getLogger(__name__)


def get_db() -> libsql_client.ClientSync:
    """Open and return a new sync Turso connection.
    Caller is responsible for calling .close() when done.
    """
    return libsql_client.create_client_sync(
        url=TURSO_DB_URL,
        auth_token=TURSO_AUTH_TOKEN,
    )


def rows_to_dicts(result_set) -> list[dict]:
    """Convert a libsql_client ResultSet into a list of plain dicts."""
    cols = result_set.columns
    return [dict(zip(cols, row)) for row in result_set.rows]


def initialize_db() -> None:
    """Create tables and seed master data at startup. Idempotent."""
    db = get_db()
    try:
        _create_tables(db)
        _migrate_schema(db)
        _seed_system_user(db)
        _seed_accounts(db)
        _seed_categories(db)
        logger.info("DB initialized successfully.")
    except Exception as e:
        logger.error(f"DB initialization error: {e}")
    finally:
        db.close()


# ── Table creation ─────────────────────────────────────────────────────────────

def _create_tables(db) -> None:
    # Auth tables
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE,
            email         TEXT UNIQUE,
            password_hash TEXT,
            google_sub    TEXT UNIQUE,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            is_deleted    INTEGER NOT NULL DEFAULT 0
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            currency   TEXT NOT NULL DEFAULT 'VND',
            language   TEXT NOT NULL DEFAULT 'vi',
            timezone   TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    # Core finance tables
    db.execute("""
        CREATE TABLE IF NOT EXISTS Account_Dim (
            account_id      TEXT PRIMARY KEY,
            account_name    TEXT NOT NULL,
            account_type    TEXT NOT NULL,
            initial_balance INTEGER NOT NULL DEFAULT 0
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Category_Dim (
            category_id   TEXT PRIMARY KEY,
            category_name TEXT NOT NULL,
            category_type TEXT NOT NULL,
            budget        INTEGER NOT NULL DEFAULT 0
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Transaction_Fact (
            transaction_id   TEXT PRIMARY KEY,
            transaction_date TEXT NOT NULL,
            account_id       TEXT NOT NULL,
            category_id      TEXT NOT NULL,
            amount           INTEGER NOT NULL,
            type             TEXT NOT NULL,
            note             TEXT,
            FOREIGN KEY (account_id)  REFERENCES Account_Dim(account_id),
            FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
        )
    """)


def _migrate_schema(db) -> None:
    """Add user_id and is_deleted columns to existing tables (idempotent via try/except)."""

    # Account_Dim: add user_id
    try:
        db.execute("ALTER TABLE Account_Dim ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
        logger.info("Migrated Account_Dim: added user_id")
    except Exception:
        pass  # Column already exists

    # Category_Dim: add user_id
    try:
        db.execute("ALTER TABLE Category_Dim ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
        logger.info("Migrated Category_Dim: added user_id")
    except Exception:
        pass

    # Transaction_Fact: add user_id
    try:
        db.execute("ALTER TABLE Transaction_Fact ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1")
        logger.info("Migrated Transaction_Fact: added user_id")
    except Exception:
        pass

    # Transaction_Fact: add is_deleted (soft delete)
    try:
        db.execute("ALTER TABLE Transaction_Fact ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
        logger.info("Migrated Transaction_Fact: added is_deleted")
    except Exception:
        pass

    # Indexes for query performance
    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_account_user ON Account_Dim(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_category_user ON Category_Dim(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_transaction_user ON Transaction_Fact(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_transaction_date ON Transaction_Fact(transaction_date)")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


# ── Seed helpers ───────────────────────────────────────────────────────────────

def _seed_system_user(db) -> None:
    """Create the default system user (user_id=1) for existing data. Idempotent."""
    result = db.execute("SELECT COUNT(*) FROM users WHERE user_id = 1")
    if result.rows[0][0] != 0:
        return
    db.execute(
        "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, datetime('now'))",
        ["system", "system@local", None],
    )
    logger.info("Seeded system user (user_id=1).")


def _seed_accounts(db) -> None:
    result = db.execute("SELECT COUNT(*) as cnt FROM Account_Dim")
    if result.rows[0][0] != 0:
        return
    accounts = [
        ("momo",  "Ví MoMo",       "E-Wallet",      5_000_000),
        ("vcb",   "Ngân hàng VCB",  "Bank",         45_000_000),
        ("vps",   "Tài khoản VPS",  "Investment",  200_000_000),
        ("cash",  "Tiền mặt",       "Cash",          2_000_000),
    ]
    for acc in accounts:
        db.execute(
            "INSERT INTO Account_Dim (account_id, account_name, account_type, initial_balance, user_id) VALUES (?, ?, ?, ?, 1)",
            list(acc),
        )
    logger.info("Seeded Account_Dim.")


def _seed_categories(db) -> None:
    result = db.execute("SELECT COUNT(*) as cnt FROM Category_Dim")
    if result.rows[0][0] != 0:
        return
    categories = [
        ("food",          "Ăn uống",             "expense",    4_000_000),
        ("salary",        "Tiền lương",           "income",             0),
        ("investment",    "Đầu tư chứng khoán",  "investment",         0),
        ("transport",     "Di chuyển",            "expense",    1_500_000),
        ("shopping",      "Mua sắm",              "expense",    3_000_000),
        ("entertainment", "Giải trí",             "expense",    2_000_000),
        ("study",         "Học tập",              "expense",    2_000_000),
        ("health",        "Sức khỏe",             "expense",    1_000_000),
        ("other",         "Khác",                 "expense",    1_500_000),
    ]
    for cat in categories:
        db.execute(
            "INSERT INTO Category_Dim (category_id, category_name, category_type, budget, user_id) VALUES (?, ?, ?, ?, 1)",
            list(cat),
        )
    logger.info("Seeded Category_Dim.")


def seed_categories_for_user(db, user_id: int) -> None:
    """Seed default categories for a newly registered user."""
    slugs = [
        ("food",          "Ăn uống",             "expense",    4_000_000),
        ("salary",        "Tiền lương",           "income",             0),
        ("investment",    "Đầu tư chứng khoán",  "investment",         0),
        ("transport",     "Di chuyển",            "expense",    1_500_000),
        ("shopping",      "Mua sắm",              "expense",    3_000_000),
        ("entertainment", "Giải trí",             "expense",    2_000_000),
        ("study",         "Học tập",              "expense",    2_000_000),
        ("health",        "Sức khỏe",             "expense",    1_000_000),
        ("other",         "Khác",                 "expense",    1_500_000),
    ]
    for slug, name, cat_type, budget in slugs:
        category_id = f"{user_id}-{slug}"
        db.execute(
            "INSERT OR IGNORE INTO Category_Dim (category_id, category_name, category_type, budget, user_id) VALUES (?, ?, ?, ?, ?)",
            [category_id, name, cat_type, budget, user_id],
        )
    logger.info(f"Seeded categories for user_id={user_id}.")
