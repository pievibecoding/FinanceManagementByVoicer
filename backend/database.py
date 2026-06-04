import logging
from datetime import datetime
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
        _create_budgets_table(db)
        _migrate_budgets_from_categories(db)
        _create_payees_table(db)
        _migrate_payee_column(db)
        _create_recurring_table(db)
        _create_split_table(db)
        _seed_system_user(db)
        _seed_accounts(db)
        _seed_categories(db)
        _seed_split_category(db)
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


def _create_budgets_table(db) -> None:
    """Create the budgets table and its index. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            budget_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER NOT NULL,
            category_id  TEXT    NOT NULL,
            month        TEXT    NOT NULL,
            amount_limit INTEGER NOT NULL DEFAULT 0,
            UNIQUE (user_id, category_id, month),
            FOREIGN KEY (user_id)     REFERENCES users(user_id),
            FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
        )
    """)
    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month)"
    )
    logger.info("budgets table ready.")


def _migrate_budgets_from_categories(db) -> None:
    """One-time migration: copy non-zero Category_Dim.budget rows into budgets
    for user_id=1 and the current calendar month. Idempotent via INSERT OR IGNORE."""
    current_month = datetime.now().strftime("%Y-%m")
    result = db.execute(
        "SELECT category_id, budget FROM Category_Dim WHERE budget > 0 AND user_id = 1"
    )
    rows = result.rows
    count = 0
    for row in rows:
        category_id, budget = row[0], row[1]
        db.execute(
            "INSERT OR IGNORE INTO budgets (user_id, category_id, month, amount_limit) VALUES (?, ?, ?, ?)",
            [1, category_id, current_month, budget],
        )
        count += 1
    if count:
        logger.info(f"Migrated {count} budget rows from Category_Dim → budgets (month={current_month}).")


# ── Payees ────────────────────────────────────────────────────────────────────

def _create_payees_table(db) -> None:
    """Create the payees table and its index. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS payees (
            payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL,
            payee_name          TEXT    NOT NULL,
            default_category_id TEXT,
            UNIQUE (user_id, payee_name),
            FOREIGN KEY (user_id)             REFERENCES users(user_id),
            FOREIGN KEY (default_category_id) REFERENCES Category_Dim(category_id)
        )
    """)
    db.execute("CREATE INDEX IF NOT EXISTS idx_payees_user ON payees(user_id)")
    logger.info("payees table ready.")


def _migrate_payee_column(db) -> None:
    """Add nullable payee_id column to Transaction_Fact. Idempotent."""
    try:
        db.execute(
            "ALTER TABLE Transaction_Fact ADD COLUMN payee_id INTEGER REFERENCES payees(payee_id)"
        )
        logger.info("Migrated Transaction_Fact: added payee_id")
    except Exception:
        pass  # column already exists


# ── Recurring transactions ────────────────────────────────────────────────────

def _create_recurring_table(db) -> None:
    """Create the recurring_transactions table and its indexes. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            recurring_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            account_id    TEXT    NOT NULL,
            category_id   TEXT    NOT NULL,
            payee_id      INTEGER,
            amount        INTEGER NOT NULL,
            type          TEXT    NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
            note          TEXT,
            frequency     TEXT    NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
            next_run_date TEXT    NOT NULL,
            end_date      TEXT,
            is_active     INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY (user_id)     REFERENCES users(user_id),
            FOREIGN KEY (account_id)  REFERENCES Account_Dim(account_id),
            FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
        )
    """)
    try:
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id)"
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON recurring_transactions(next_run_date, is_active)"
        )
    except Exception as e:
        logger.warning(f"Recurring index creation warning: {e}")
    logger.info("recurring_transactions table ready.")


# ── Split transactions ────────────────────────────────────────────────────────

def _create_split_table(db) -> None:
    """Create the split_transactions table and its index. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS split_transactions (
            split_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id TEXT    NOT NULL,
            category_id    TEXT    NOT NULL,
            amount         INTEGER NOT NULL,
            note           TEXT,
            FOREIGN KEY (transaction_id) REFERENCES Transaction_Fact(transaction_id),
            FOREIGN KEY (category_id)    REFERENCES Category_Dim(category_id)
        )
    """)
    try:
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_split_transaction ON split_transactions(transaction_id)"
        )
    except Exception as e:
        logger.warning(f"Split index creation warning: {e}")
    logger.info("split_transactions table ready.")


def _seed_split_category(db) -> None:
    """Seed the system-level 'split' sentinel category. Idempotent."""
    db.execute(
        "INSERT OR IGNORE INTO Category_Dim (category_id, category_name, category_type, budget, user_id) VALUES (?, ?, ?, ?, ?)",
        ["split", "Nhiều danh mục", "split", 0, 1],
    )
    logger.info("Seeded 'split' sentinel category.")


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
