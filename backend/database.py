import logging
from datetime import datetime
import libsql_client
from config import TURSO_DB_URL, TURSO_AUTH_TOKEN

logger = logging.getLogger(__name__)


def get_db() -> libsql_client.ClientSync:
    """Open and return a new sync Turso connection.
    Caller is responsible for calling .close() when done.
    """
    # Convert libsql:// to https:// to avoid WebSocket issues
    url = TURSO_DB_URL.replace("libsql://", "https://")
    return libsql_client.create_client_sync(
        url=url,
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
        _create_migrations_table(db)
        _migrate_schema(db)
        _create_budgets_table(db)
        _migrate_budgets_from_categories(db)
        _create_payees_table(db)
        _migrate_payee_column(db)
        _add_location_column(db)
        _create_recurring_table(db)
        _create_split_table(db)
        _create_debt_tables(db)
        _create_savings_tables(db)
        _seed_system_user(db)
        _seed_accounts(db)
        _seed_categories(db)
        # Skip split category seeding due to libsql-client HTTP bug
        # _seed_split_category(db)
        _migrate_category_id_to_integer(db)
        _migrate_account_id_to_integer(db)
        _dedup_categories(db)
        logger.info("DB initialized successfully.")
    except Exception as e:
        logger.error(f"DB initialization error: {e}")
        import traceback
        logger.error(traceback.format_exc())
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
            category_id  INTEGER NOT NULL,
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


# ── Schema migrations tracker ─────────────────────────────────────────────────

def _create_migrations_table(db) -> None:
    """Create a simple migrations log table. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            migration_name TEXT PRIMARY KEY,
            applied_at     TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)


def _migration_applied(db, name: str) -> bool:
    result = db.execute(
        "SELECT 1 FROM schema_migrations WHERE migration_name = ?", [name]
    )
    return len(result.rows) > 0


def _mark_migration_done(db, name: str) -> None:
    db.execute(
        "INSERT OR IGNORE INTO schema_migrations (migration_name) VALUES (?)", [name]
    )


# ── Payees ────────────────────────────────────────────────────────────────────

def _create_payees_table(db) -> None:
    """Create the payees table and its index. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS payees (
            payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL,
            payee_name          TEXT    NOT NULL,
            default_category_id INTEGER,
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


def _add_location_column(db) -> None:
    """Add nullable location column to Transaction_Fact. Idempotent."""
    migration_name = "add_location_column"
    if _migration_applied(db, migration_name):
        logger.info("location column migration already applied — skipping.")
        return

    try:
        db.execute("ALTER TABLE Transaction_Fact ADD COLUMN location TEXT")
        logger.info("Migrated Transaction_Fact: added location")
        _mark_migration_done(db, migration_name)
    except Exception:
        pass  # column already exists


# ── Category ID integer migration ─────────────────────────────────────────────

def _migrate_category_id_to_integer(db) -> None:
    """One-time migration: replace TEXT category_id with INTEGER PRIMARY KEY AUTOINCREMENT."""
    migration_name = "category_id_to_integer"
    if _migration_applied(db, migration_name):
        logger.info("category_id migration already applied — skipping.")
        return

    logger.info("Starting category_id TEXT→INTEGER migration…")

    db.execute("""
        CREATE TABLE IF NOT EXISTS Category_Dim_new (
            category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL DEFAULT 1,
            category_name TEXT NOT NULL,
            category_type TEXT NOT NULL,
            budget        INTEGER NOT NULL DEFAULT 0
        )
    """)

    result = db.execute(
        "SELECT category_id, user_id, category_name, category_type, budget FROM Category_Dim ORDER BY user_id, category_id"
    )
    old_rows = result.rows

    id_map: dict[str, int] = {}
    for old_id, user_id, name, cat_type, budget in old_rows:
        db.execute(
            "INSERT INTO Category_Dim_new (user_id, category_name, category_type, budget) VALUES (?, ?, ?, ?)",
            [user_id, name, cat_type, budget],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        new_id = row.rows[0][0]
        id_map[str(old_id)] = new_id

    logger.info(f"Inserted {len(id_map)} categories. Mapping: {id_map}")

    for old_id, new_id in id_map.items():
        db.execute("UPDATE Transaction_Fact SET category_id = ? WHERE category_id = ?", [str(new_id), old_id])
        db.execute("UPDATE budgets SET category_id = ? WHERE category_id = ?", [str(new_id), old_id])
        db.execute("UPDATE split_transactions SET category_id = ? WHERE category_id = ?", [str(new_id), old_id])
        db.execute("UPDATE recurring_transactions SET category_id = ? WHERE category_id = ?", [str(new_id), old_id])
        db.execute("UPDATE payees SET default_category_id = ? WHERE default_category_id = ?", [str(new_id), old_id])

    db.execute("DROP TABLE Category_Dim")
    db.execute("ALTER TABLE Category_Dim_new RENAME TO Category_Dim")

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_category_user ON Category_Dim(user_id)")
    except Exception as e:
        logger.warning(f"Index recreation warning: {e}")

    _mark_migration_done(db, migration_name)
    logger.info("category_id TEXT→INTEGER migration complete.")


# ── Account ID integer migration ──────────────────────────────────────────────

def _migrate_account_id_to_integer(db) -> None:
    """One-time migration: replace TEXT account_id with INTEGER PRIMARY KEY AUTOINCREMENT."""
    migration_name = "account_id_to_integer"
    if _migration_applied(db, migration_name):
        logger.info("account_id migration already applied — skipping.")
        return

    logger.info("Starting account_id TEXT→INTEGER migration…")

    db.execute("""
        CREATE TABLE IF NOT EXISTS Account_Dim_new (
            account_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL DEFAULT 1,
            account_name    TEXT NOT NULL,
            account_type    TEXT NOT NULL,
            initial_balance INTEGER NOT NULL DEFAULT 0
        )
    """)

    result = db.execute(
        "SELECT account_id, user_id, account_name, account_type, initial_balance FROM Account_Dim ORDER BY user_id, account_id"
    )
    old_rows = result.rows

    id_map: dict[str, int] = {}
    for old_id, user_id, name, acc_type, balance in old_rows:
        db.execute(
            "INSERT INTO Account_Dim_new (user_id, account_name, account_type, initial_balance) VALUES (?, ?, ?, ?)",
            [user_id, name, acc_type, balance],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        new_id = row.rows[0][0]
        id_map[str(old_id)] = new_id

    logger.info(f"Inserted {len(id_map)} accounts. Mapping: {id_map}")

    for old_id, new_id in id_map.items():
        db.execute("UPDATE Transaction_Fact SET account_id = ? WHERE account_id = ?", [str(new_id), old_id])
        db.execute("UPDATE recurring_transactions SET account_id = ? WHERE account_id = ?", [str(new_id), old_id])

    db.execute("DROP TABLE Account_Dim")
    db.execute("ALTER TABLE Account_Dim_new RENAME TO Account_Dim")

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_account_user ON Account_Dim(user_id)")
    except Exception as e:
        logger.warning(f"Index recreation warning: {e}")

    _mark_migration_done(db, migration_name)
    logger.info("account_id TEXT→INTEGER migration complete.")


def _dedup_categories(db) -> None:
    """
    One-time cleanup: remove duplicate category rows caused by the migration
    running multiple times. Keeps the lowest category_id per (user_id, category_name).
    Also re-points any FK references to the surviving row before deleting duplicates.
    """
    migration_name = "dedup_categories"
    if _migration_applied(db, migration_name):
        return

    logger.info("Deduplicating Category_Dim…")

    # Find all (user_id, category_name) groups that have more than one row
    dupes = db.execute("""
        SELECT user_id, category_name, MIN(category_id) AS keep_id
        FROM Category_Dim
        GROUP BY user_id, category_name
        HAVING COUNT(*) > 1
    """)

    removed = 0
    for user_id, category_name, keep_id in dupes.rows:
        # Get all duplicate IDs for this group (everything except the one to keep)
        all_ids = db.execute(
            "SELECT category_id FROM Category_Dim WHERE user_id = ? AND category_name = ? AND category_id != ?",
            [user_id, category_name, keep_id],
        )
        for (dup_id,) in all_ids.rows:
            # Re-point FK references to the surviving row
            db.execute("UPDATE Transaction_Fact SET category_id = ? WHERE category_id = ?", [str(keep_id), str(dup_id)])
            db.execute("UPDATE budgets SET category_id = ? WHERE category_id = ?", [str(keep_id), str(dup_id)])
            db.execute("UPDATE split_transactions SET category_id = ? WHERE category_id = ?", [str(keep_id), str(dup_id)])
            db.execute("UPDATE recurring_transactions SET category_id = ? WHERE category_id = ?", [str(keep_id), str(dup_id)])
            db.execute("UPDATE payees SET default_category_id = ? WHERE default_category_id = ?", [str(keep_id), str(dup_id)])
            # Delete the duplicate
            db.execute("DELETE FROM Category_Dim WHERE category_id = ?", [dup_id])
            removed += 1

    _mark_migration_done(db, migration_name)
    logger.info(f"Dedup complete: removed {removed} duplicate category rows.")


# ── Recurring transactions ────────────────────────────────────────────────────

def _create_recurring_table(db) -> None:
    """Create the recurring_transactions table and its indexes. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            recurring_id  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL,
            account_id    INTEGER NOT NULL,
            category_id   INTEGER NOT NULL,
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
            category_id    INTEGER NOT NULL,
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


# ── Debt tables ────────────────────────────────────────────────────────────────

def _create_debt_tables(db) -> None:
    """Create the debt-related tables and their indexes. Idempotent."""
    migration_name = "create_debt_tables"
    if _migration_applied(db, migration_name):
        logger.info("debt tables migration already applied — skipping.")
        return

    db.execute("""
        CREATE TABLE IF NOT EXISTS Debt_Dim (
            debt_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            debt_type TEXT NOT NULL,
            lender TEXT,
            principal INTEGER NOT NULL,
            outstanding_balance INTEGER NOT NULL,
            interest_rate REAL,
            interest_type TEXT,
            start_date TEXT,
            due_date TEXT,
            minimum_payment INTEGER,
            payment_frequency TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS Debt_Payment_Fact (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER NOT NULL,
            transaction_id TEXT,
            payment_date TEXT NOT NULL,
            amount_paid INTEGER NOT NULL,
            principal_portion INTEGER NOT NULL,
            interest_portion INTEGER NOT NULL,
            FOREIGN KEY (debt_id) REFERENCES Debt_Dim(debt_id),
            FOREIGN KEY (transaction_id) REFERENCES Transaction_Fact(transaction_id)
        )
    """)

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_debt_user ON Debt_Dim(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_debt_payment_debt ON Debt_Payment_Fact(debt_id)")
    except Exception as e:
        logger.warning(f"Debt index creation warning: {e}")

    _mark_migration_done(db, migration_name)
    logger.info("debt tables ready.")


# ── Savings tables ─────────────────────────────────────────────────────────────

def _create_savings_tables(db) -> None:
    """Create the savings-related tables and their indexes. Idempotent."""
    migration_name = "create_savings_tables"
    if _migration_applied(db, migration_name):
        logger.info("savings tables migration already applied — skipping.")
        return

    db.execute("""
        CREATE TABLE IF NOT EXISTS Savings_Dim (
            savings_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            category TEXT,
            target_amount INTEGER NOT NULL,
            current_balance INTEGER NOT NULL,
            interest_rate REAL,
            target_date TEXT,
            linked_account_id TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (linked_account_id) REFERENCES Account_Dim(account_id)
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS Savings_Contribution_Fact (
            contribution_id INTEGER PRIMARY KEY AUTOINCREMENT,
            savings_id INTEGER NOT NULL,
            transaction_id TEXT,
            contribution_date TEXT NOT NULL,
            amount INTEGER NOT NULL,
            FOREIGN KEY (savings_id) REFERENCES Savings_Dim(savings_id),
            FOREIGN KEY (transaction_id) REFERENCES Transaction_Fact(transaction_id)
        )
    """)

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_savings_user ON Savings_Dim(user_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_savings_contribution_savings ON Savings_Contribution_Fact(savings_id)")
    except Exception as e:
        logger.warning(f"Savings index creation warning: {e}")

    _mark_migration_done(db, migration_name)
    logger.info("savings tables ready.")


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
        ("Ăn uống",             "expense",    4_000_000),
        ("Tiền lương",           "income",             0),
        ("Đầu tư chứng khoán",  "investment",         0),
        ("Di chuyển",            "expense",    1_500_000),
        ("Mua sắm",              "expense",    3_000_000),
        ("Giải trí",             "expense",    2_000_000),
        ("Học tập",              "expense",    2_000_000),
        ("Sức khỏe",             "expense",    1_000_000),
        ("Khác",                 "expense",    1_500_000),
    ]
    for name, cat_type, budget in slugs:
        db.execute(
            "INSERT OR IGNORE INTO Category_Dim (user_id, category_name, category_type, budget) VALUES (?, ?, ?, ?)",
            [user_id, name, cat_type, budget],
        )
    logger.info(f"Seeded categories for user_id={user_id}.")
