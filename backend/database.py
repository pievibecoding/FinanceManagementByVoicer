import logging
import time
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


def _table_columns(db, table_name: str) -> dict[str, dict]:
    try:
        return {row["name"]: row for row in rows_to_dicts(db.execute(f"PRAGMA table_info({table_name})"))}
    except Exception:
        return {}


def initialize_db() -> None:
    """Create tables and seed master data at startup. Idempotent."""
    last_error = None
    last_traceback = ""
    for attempt in range(1, 4):
        db = get_db()
        try:
            _create_tables(db)
            _create_migrations_table(db)
            _migrate_schema(db)
            _seed_system_user(db)
            _create_budgets_table(db)
            _migrate_budgets_from_categories(db)
            _create_payees_table(db)
            _migrate_payee_column(db)
            _add_location_column(db)
            _create_debt_tables(db)
            _create_savings_tables(db)
            _create_domain_fact_tables(db)
            _migrate_debt_schema(db)
            _migrate_savings_schema(db)
            _seed_accounts(db)
            _seed_categories(db)
            _migrate_category_id_to_integer(db)
            _add_category_display_columns(db)
            _migrate_account_id_to_integer(db)
            _add_account_display_columns(db)
            _dedup_categories(db)
            _add_transfer_pair_id_column(db)
            _add_transaction_operation_columns(db)
            _add_debt_initial_transaction_id(db)
            _add_account_current_balance(db)
            _add_transaction_domain_columns(db)
            _migrate_domain_facts(db)
            _recompute_domain_balances(db)
            _drop_legacy_domain_fact_tables(db)
            logger.info("DB initialized successfully.")
            return
        except Exception as e:
            import traceback
            last_error = e
            last_traceback = traceback.format_exc()
            logger.warning(f"DB initialization attempt {attempt}/3 failed: {e}")
            if attempt < 3:
                time.sleep(attempt)
        finally:
            db.close()

    logger.error(f"DB initialization failed after retries: {last_error}")
    logger.error(last_traceback)


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
            account_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL DEFAULT 1,
            account_name    TEXT NOT NULL,
            account_type    TEXT NOT NULL,
            initial_balance INTEGER NOT NULL DEFAULT 0,
            current_balance INTEGER NOT NULL DEFAULT 0,
            color           TEXT,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Category_Dim (
            category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL DEFAULT 1,
            category_name TEXT NOT NULL,
            category_type TEXT NOT NULL,
            budget        INTEGER NOT NULL DEFAULT 0,
            icon          TEXT,
            color         TEXT,
            created_at    TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS payees (
            payee_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    INTEGER NOT NULL,
            payee_name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (user_id, payee_name),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Transaction_Fact (
            transaction_id        TEXT PRIMARY KEY,
            user_id               INTEGER NOT NULL DEFAULT 1,
            transaction_date      TEXT NOT NULL,
            transaction_type      TEXT CHECK (transaction_type IN ('income', 'expense', 'inner_transfer')),
            amount                INTEGER NOT NULL,
            account_id            INTEGER,
            source_account_id     INTEGER,
            destination_account_id INTEGER,
            payee_id              INTEGER,
            category_id           INTEGER,
            type                  TEXT,
            operation_type        TEXT,
            note                  TEXT,
            location              TEXT,
            transfer_pair_id      TEXT,
            is_deleted            INTEGER NOT NULL DEFAULT 0,
            created_at            TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at            TEXT,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id),
            FOREIGN KEY (source_account_id) REFERENCES Account_Dim(account_id),
            FOREIGN KEY (destination_account_id) REFERENCES Account_Dim(account_id),
            FOREIGN KEY (payee_id) REFERENCES payees(payee_id),
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


def _add_category_display_columns(db) -> None:
    """Add user-editable display fields for categories. Idempotent."""
    try:
        db.execute("ALTER TABLE Category_Dim ADD COLUMN icon TEXT")
        logger.info("Migrated Category_Dim: added icon")
    except Exception:
        pass

    try:
        db.execute("ALTER TABLE Category_Dim ADD COLUMN color TEXT")
        logger.info("Migrated Category_Dim: added color")
    except Exception:
        pass

    db.execute("UPDATE Category_Dim SET icon = 'other' WHERE icon IS NULL OR icon = ''")
    db.execute("UPDATE Category_Dim SET color = '#a8f8f8' WHERE color IS NULL OR color = ''")


def _add_account_display_columns(db) -> None:
    """Add user-editable display fields for accounts. Idempotent."""
    try:
        db.execute("ALTER TABLE Account_Dim ADD COLUMN color TEXT")
        logger.info("Migrated Account_Dim: added color")
    except Exception:
        pass

    db.execute("UPDATE Account_Dim SET color = '#a0c4ff' WHERE color IS NULL OR color = ''")


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


def _add_transfer_pair_id_column(db) -> None:
    """Add transfer_pair_id to Transaction_Fact for linked transfer rows."""
    migration_name = "add_transfer_pair_id_column"
    if _migration_applied(db, migration_name):
        logger.info("transfer_pair_id migration already applied — skipping.")
        return

    try:
        db.execute("ALTER TABLE Transaction_Fact ADD COLUMN transfer_pair_id TEXT")
        logger.info("Migrated Transaction_Fact: added transfer_pair_id")
    except Exception:
        pass
    _mark_migration_done(db, migration_name)


def _add_account_current_balance(db) -> None:
    """Add and recompute Account_Dim.current_balance from initial balance and live transactions."""
    migration_name = "add_account_current_balance"
    if _migration_applied(db, migration_name):
        logger.info("current_balance migration already applied — skipping.")
        return

    try:
        db.execute("ALTER TABLE Account_Dim ADD COLUMN current_balance INTEGER NOT NULL DEFAULT 0")
        logger.info("Migrated Account_Dim: added current_balance")
    except Exception:
        pass

    db.execute("""
        UPDATE Account_Dim
        SET current_balance = initial_balance + COALESCE((
            SELECT SUM(CASE
                WHEN type IN ('income', 'transfer_in', 'in') THEN amount
                WHEN type IN ('expense', 'transfer_out', 'out') THEN -amount
                ELSE 0
            END)
            FROM Transaction_Fact
            WHERE Transaction_Fact.account_id = Account_Dim.account_id
              AND Transaction_Fact.user_id = Account_Dim.user_id
              AND Transaction_Fact.is_deleted = 0
        ), 0)
    """)
    _mark_migration_done(db, migration_name)


def _add_transaction_operation_columns(db) -> None:
    """Add operation metadata to Transaction_Fact and backfill legacy rows."""
    migration_name = "add_transaction_operation_columns"
    columns_to_ensure = [
        ("operation_type", "TEXT"),
        ("source_account_id", "INTEGER"),
        ("destination_account_id", "INTEGER"),
        ("savings_id", "INTEGER"),
        ("debt_id", "INTEGER"),
    ]
    for col_name, col_def in columns_to_ensure:
        try:
            db.execute(f"ALTER TABLE Transaction_Fact ADD COLUMN {col_name} {col_def}")
            logger.info(f"Transaction_Fact: added {col_name}")
        except Exception:
            pass

    if _migration_applied(db, migration_name):
        logger.info("operation metadata migration already applied — skipping backfill.")
        return

    db.execute("""
        UPDATE Transaction_Fact
        SET operation_type = 'income',
            type = 'in',
            destination_account_id = account_id
        WHERE type = 'income'
    """)
    db.execute("""
        UPDATE Transaction_Fact
        SET operation_type = 'expense',
            type = 'out',
            source_account_id = account_id
        WHERE type = 'expense'
    """)
    db.execute("""
        UPDATE Transaction_Fact
        SET operation_type = 'account_transfer',
            type = CASE
                WHEN type = 'transfer_in' THEN 'in'
                WHEN type = 'transfer_out' THEN 'out'
                ELSE type
            END
        WHERE operation_type IS NULL
          AND transfer_pair_id IS NOT NULL
          AND type IN ('transfer_in', 'transfer_out')
    """)
    db.execute("""
        UPDATE Transaction_Fact
        SET operation_type = CASE
                WHEN type = 'transfer_in' THEN 'income'
                WHEN type = 'transfer_out' THEN 'expense'
                ELSE operation_type
            END,
            type = CASE
                WHEN type = 'transfer_in' THEN 'in'
                WHEN type = 'transfer_out' THEN 'out'
                ELSE type
            END
        WHERE operation_type IS NULL
          AND type IN ('transfer_in', 'transfer_out')
    """)
    db.execute("""
        UPDATE Transaction_Fact
        SET source_account_id = account_id
        WHERE type = 'out' AND source_account_id IS NULL
    """)
    db.execute("""
        UPDATE Transaction_Fact
        SET destination_account_id = account_id
        WHERE type = 'in' AND destination_account_id IS NULL
    """)

    pair_result = db.execute("""
        SELECT transfer_pair_id,
               MAX(CASE WHEN type = 'out' THEN account_id END) AS source_id,
               MAX(CASE WHEN type = 'in' THEN account_id END) AS destination_id
        FROM Transaction_Fact
        WHERE operation_type = 'account_transfer'
          AND transfer_pair_id IS NOT NULL
        GROUP BY transfer_pair_id
    """)
    for pair_id, source_id, destination_id in pair_result.rows:
        db.execute(
            """
            UPDATE Transaction_Fact
            SET source_account_id = ?, destination_account_id = ?
            WHERE transfer_pair_id = ?
            """,
            [source_id, destination_id, pair_id],
        )

    db.execute("""
        UPDATE Account_Dim
        SET current_balance = initial_balance + COALESCE((
            SELECT SUM(CASE
                WHEN type IN ('income', 'transfer_in', 'in') THEN amount
                WHEN type IN ('expense', 'transfer_out', 'out') THEN -amount
                ELSE 0
            END)
            FROM Transaction_Fact
            WHERE Transaction_Fact.account_id = Account_Dim.account_id
              AND Transaction_Fact.user_id = Account_Dim.user_id
              AND Transaction_Fact.is_deleted = 0
        ), 0)
    """)

    _mark_migration_done(db, migration_name)

def _add_debt_initial_transaction_id(db) -> None:
    """Add initial_transaction_id link for debt disbursement transactions."""
    try:
        db.execute("ALTER TABLE Debt_Dim ADD COLUMN initial_transaction_id TEXT")
        logger.info("Debt_Dim: added initial_transaction_id")
    except Exception:
        pass


def _create_domain_fact_tables(db) -> None:
    """Create domain fact tables for debt and savings movements."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS Debt_Transaction_Fact (
            debt_transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            payee_id INTEGER,
            debt_transaction_type TEXT NOT NULL CHECK (debt_transaction_type IN ('disbursement', 'payment')),
            cash_direction TEXT NOT NULL CHECK (cash_direction IN ('in', 'out')),
            transaction_date TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            note TEXT,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            FOREIGN KEY (debt_id) REFERENCES Debt_Dim(debt_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id),
            FOREIGN KEY (payee_id) REFERENCES payees(payee_id)
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS Savings_Transaction_Fact (
            savings_transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            savings_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            account_id INTEGER NOT NULL,
            savings_transaction_type TEXT NOT NULL CHECK (savings_transaction_type IN ('contribution', 'withdrawal')),
            cash_direction TEXT NOT NULL CHECK (cash_direction IN ('in', 'out')),
            transaction_date TEXT NOT NULL,
            amount INTEGER NOT NULL CHECK (amount > 0),
            note TEXT,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT,
            FOREIGN KEY (savings_id) REFERENCES Savings_Dim(savings_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id)
        )
    """)
    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_debt_tx_debt ON Debt_Transaction_Fact(debt_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_debt_tx_user_date ON Debt_Transaction_Fact(user_id, transaction_date)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_savings_tx_savings ON Savings_Transaction_Fact(savings_id)")
        db.execute("CREATE INDEX IF NOT EXISTS idx_savings_tx_user_date ON Savings_Transaction_Fact(user_id, transaction_date)")
    except Exception as e:
        logger.warning(f"Domain fact index creation warning: {e}")


def _add_transaction_domain_columns(db) -> None:
    """Add new Transaction_Fact columns for the domain-fact model."""
    columns_to_ensure = [
        ("transaction_type", "TEXT"),
        ("updated_at", "TEXT"),
        ("created_at", "TEXT NOT NULL DEFAULT (datetime('now'))"),
    ]
    for col_name, col_def in columns_to_ensure:
        try:
            db.execute(f"ALTER TABLE Transaction_Fact ADD COLUMN {col_name} {col_def}")
            logger.info(f"Transaction_Fact: added {col_name}")
        except Exception:
            pass

    db.execute("""
        UPDATE Transaction_Fact
        SET transaction_type = CASE
            WHEN operation_type = 'account_transfer' THEN 'inner_transfer'
            WHEN operation_type IN ('income', 'expense') THEN operation_type
            WHEN type IN ('income', 'in', 'transfer_in') THEN 'income'
            WHEN type IN ('expense', 'out', 'transfer_out') THEN 'expense'
            ELSE transaction_type
        END
        WHERE transaction_type IS NULL
          AND (operation_type IN ('income', 'expense', 'account_transfer')
               OR operation_type IS NULL)
    """)


def _payee_id_for_name(db, user_id: int, name: str | None):
    clean_name = (name or "").strip()
    if not clean_name:
        return None
    existing = db.execute(
        "SELECT payee_id FROM payees WHERE user_id = ? AND lower(payee_name) = lower(?) LIMIT 1",
        [user_id, clean_name],
    )
    if existing.rows:
        return existing.rows[0][0]
    db.execute(
        "INSERT INTO payees (user_id, payee_name) VALUES (?, ?)",
        [user_id, clean_name],
    )
    result = db.execute(
        "SELECT MAX(payee_id) FROM payees WHERE user_id = ? AND payee_name = ?",
        [user_id, clean_name],
    )
    return result.rows[0][0] if result.rows else None


def _migrate_domain_facts(db) -> None:
    """Backfill new domain fact tables from old transaction links."""
    migration_name = "migrate_domain_fact_tables_v1"
    if _migration_applied(db, migration_name):
        return

    debt_rows = rows_to_dicts(db.execute("""
        SELECT tf.transaction_id, tf.user_id, tf.account_id, tf.transaction_date,
               tf.amount, tf.type, tf.note, tf.operation_type, tf.debt_id,
               d.debt_type, d.lender, d.debtor
        FROM Transaction_Fact tf
        JOIN Debt_Dim d ON d.debt_id = tf.debt_id
        WHERE tf.operation_type IN ('debt_disbursement', 'debt_payment')
          AND tf.is_deleted = 0
    """))
    for row in debt_rows:
        exists = db.execute(
            "SELECT 1 FROM Debt_Transaction_Fact WHERE user_id = ? AND debt_id = ? AND transaction_date = ? AND amount = ? AND note = ? LIMIT 1",
            [row["user_id"], row["debt_id"], row["transaction_date"], row["amount"], row.get("note")],
        )
        if exists.rows:
            continue
        if row["debt_type"] == "debt":
            counterparty_name = row.get("lender")
        else:
            counterparty_name = row.get("debtor")
        payee_id = _payee_id_for_name(db, row["user_id"], counterparty_name)
        tx_type = "disbursement" if row["operation_type"] == "debt_disbursement" else "payment"
        cash_direction = "in" if row["type"] in ("in", "income", "transfer_in") else "out"
        db.execute(
            """
            INSERT INTO Debt_Transaction_Fact
            (debt_id, user_id, account_id, payee_id, debt_transaction_type, cash_direction,
             transaction_date, amount, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [row["debt_id"], row["user_id"], row["account_id"], payee_id, tx_type,
             cash_direction, row["transaction_date"], row["amount"], row.get("note")],
        )

    savings_rows = rows_to_dicts(db.execute("""
        SELECT tf.user_id, tf.account_id, tf.transaction_date, tf.amount, tf.type, tf.note,
               tf.operation_type, tf.savings_id
        FROM Transaction_Fact tf
        JOIN Savings_Dim s ON s.savings_id = tf.savings_id
        WHERE tf.operation_type IN ('savings_contribution', 'savings_withdrawal')
          AND tf.is_deleted = 0
    """))
    for row in savings_rows:
        exists = db.execute(
            "SELECT 1 FROM Savings_Transaction_Fact WHERE user_id = ? AND savings_id = ? AND transaction_date = ? AND amount = ? LIMIT 1",
            [row["user_id"], row["savings_id"], row["transaction_date"], row["amount"]],
        )
        if exists.rows:
            continue
        movement_type = "withdrawal" if row["operation_type"] == "savings_withdrawal" else "contribution"
        cash_direction = "in" if movement_type == "withdrawal" else "out"
        db.execute(
            """
            INSERT INTO Savings_Transaction_Fact
            (savings_id, user_id, account_id, savings_transaction_type, cash_direction,
             transaction_date, amount, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [row["savings_id"], row["user_id"], row["account_id"], movement_type,
             cash_direction, row["transaction_date"], row["amount"], row.get("note")],
        )

    _mark_migration_done(db, migration_name)


def _drop_legacy_domain_fact_tables(db) -> None:
    """Remove legacy domain tables after the app has moved to domain fact tables."""
    for table_name in (
        "Debt_Payment_Fact",
        "Savings_Contribution_Fact",
        "Savings_Withdrawal_Fact",
    ):
        try:
            db.execute(f"DROP TABLE IF EXISTS {table_name}")
            logger.info(f"Dropped legacy table {table_name}.")
        except Exception as e:
            logger.warning(f"Could not drop legacy table {table_name}: {e}")


def _recompute_domain_balances(db) -> None:
    """Recompute cached balances from the new domain fact model."""
    db.execute("""
        UPDATE Account_Dim
        SET current_balance = initial_balance
            + COALESCE((
                SELECT SUM(CASE
                    WHEN transaction_type = 'income' THEN amount
                    WHEN transaction_type = 'expense' THEN -amount
                    WHEN transaction_type = 'inner_transfer' AND destination_account_id = Account_Dim.account_id THEN amount
                    WHEN transaction_type = 'inner_transfer' AND source_account_id = Account_Dim.account_id THEN -amount
                    ELSE 0
                END)
                FROM Transaction_Fact
                WHERE user_id = Account_Dim.user_id
                  AND is_deleted = 0
                  AND (
                    account_id = Account_Dim.account_id
                    OR source_account_id = Account_Dim.account_id
                    OR destination_account_id = Account_Dim.account_id
                  )
            ), 0)
            + COALESCE((
                SELECT SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END)
                FROM Debt_Transaction_Fact
                WHERE user_id = Account_Dim.user_id
                  AND account_id = Account_Dim.account_id
                  AND is_deleted = 0
            ), 0)
            + COALESCE((
                SELECT SUM(CASE WHEN cash_direction = 'in' THEN amount ELSE -amount END)
                FROM Savings_Transaction_Fact
                WHERE user_id = Account_Dim.user_id
                  AND account_id = Account_Dim.account_id
                  AND is_deleted = 0
            ), 0)
    """)
    db.execute("""
        UPDATE Savings_Dim
        SET current_balance = COALESCE((
            SELECT SUM(CASE WHEN savings_transaction_type = 'contribution' THEN amount ELSE -amount END)
            FROM Savings_Transaction_Fact
            WHERE savings_id = Savings_Dim.savings_id
              AND user_id = Savings_Dim.user_id
              AND is_deleted = 0
        ), 0)
    """)
    db.execute("""
        UPDATE Debt_Dim
        SET outstanding_balance = CASE
            WHEN EXISTS (
                SELECT 1
                FROM Debt_Transaction_Fact
                WHERE debt_id = Debt_Dim.debt_id
                  AND user_id = Debt_Dim.user_id
                  AND is_deleted = 0
            )
            THEN MAX(0, COALESCE((
                SELECT SUM(CASE
                    WHEN debt_transaction_type = 'disbursement' THEN amount
                    WHEN debt_transaction_type = 'payment' THEN -amount
                    ELSE 0
                END)
                FROM Debt_Transaction_Fact
                WHERE debt_id = Debt_Dim.debt_id
                  AND user_id = Debt_Dim.user_id
                  AND is_deleted = 0
            ), 0))
            ELSE outstanding_balance
        END
    """)


# ── Payees ────────────────────────────────────────────────────────────────────

def _create_payees_table(db) -> None:
    """Create the payees table and its index. Idempotent."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS payees (
            payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL,
            payee_name          TEXT    NOT NULL,
            UNIQUE (user_id, payee_name),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
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

    category_id_type = (_table_columns(db, "Category_Dim").get("category_id", {}).get("type") or "").upper()
    if "INT" in category_id_type:
        _mark_migration_done(db, migration_name)
        logger.info("Category_Dim.category_id is already INTEGER — marking migration done.")
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
        if "default_category_id" in _table_columns(db, "payees"):
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

    account_id_type = (_table_columns(db, "Account_Dim").get("account_id", {}).get("type") or "").upper()
    if "INT" in account_id_type:
        _mark_migration_done(db, migration_name)
        logger.info("Account_Dim.account_id is already INTEGER — marking migration done.")
        return

    logger.info("Starting account_id TEXT→INTEGER migration…")

    db.execute("""
        CREATE TABLE IF NOT EXISTS Account_Dim_new (
            account_id      INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL DEFAULT 1,
            account_name    TEXT NOT NULL,
            account_type    TEXT NOT NULL,
            initial_balance INTEGER NOT NULL DEFAULT 0,
            current_balance INTEGER NOT NULL DEFAULT 0
        )
    """)

    result = db.execute(
        "SELECT account_id, user_id, account_name, account_type, initial_balance FROM Account_Dim ORDER BY user_id, account_id"
    )
    old_rows = result.rows

    id_map: dict[str, int] = {}
    for old_id, user_id, name, acc_type, balance in old_rows:
        db.execute(
            "INSERT INTO Account_Dim_new (user_id, account_name, account_type, initial_balance, current_balance) VALUES (?, ?, ?, ?, ?)",
            [user_id, name, acc_type, balance, balance],
        )
        row = db.execute("SELECT last_insert_rowid() AS id")
        new_id = row.rows[0][0]
        id_map[str(old_id)] = new_id

    logger.info(f"Inserted {len(id_map)} accounts. Mapping: {id_map}")

    for old_id, new_id in id_map.items():
        db.execute("UPDATE Transaction_Fact SET account_id = ? WHERE account_id = ?", [str(new_id), old_id])

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
    payees_has_default_category = "default_category_id" in _table_columns(db, "payees")
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
            if payees_has_default_category:
                db.execute("UPDATE payees SET default_category_id = ? WHERE default_category_id = ?", [str(keep_id), str(dup_id)])
            # Delete the duplicate
            db.execute("DELETE FROM Category_Dim WHERE category_id = ?", [dup_id])
            removed += 1

    _mark_migration_done(db, migration_name)
    logger.info(f"Dedup complete: removed {removed} duplicate category rows.")


# ── Debt tables ────────────────────────────────────────────────────────────────

def _create_debt_tables(db) -> None:
    """Create the debt-related tables and their indexes. Idempotent.
    NOTE: We do NOT skip based on migration flag — always run CREATE TABLE IF NOT EXISTS.
    If the old migration flag exists but table is missing (schema mismatch), this fixes it.
    """
    # Remove stale migration flag so we always re-check
    try:
        db.execute(
            "DELETE FROM schema_migrations WHERE migration_name = 'create_debt_tables'"
        )
    except Exception:
        pass

    db.execute("""
        CREATE TABLE IF NOT EXISTS Debt_Dim (
            debt_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            debt_type TEXT NOT NULL CHECK (debt_type IN ('debt', 'loan')),
            lender TEXT,
            debtor TEXT,
            principal INTEGER NOT NULL,
            outstanding_balance INTEGER NOT NULL,
            start_date TEXT,
            due_date TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_debt_user ON Debt_Dim(user_id)")
    except Exception as e:
        logger.warning(f"Debt index creation warning: {e}")

    logger.info("debt tables ready.")


# ── Savings tables ─────────────────────────────────────────────────────────────

def _create_savings_tables(db) -> None:
    """Create the savings-related tables and their indexes. Idempotent.
    NOTE: Always run CREATE TABLE IF NOT EXISTS — remove stale migration flag first.
    """
    try:
        db.execute(
            "DELETE FROM schema_migrations WHERE migration_name = 'create_savings_tables'"
        )
    except Exception:
        pass

    db.execute("""
        CREATE TABLE IF NOT EXISTS Savings_Dim (
            savings_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            target_amount INTEGER NOT NULL,
            current_balance INTEGER NOT NULL DEFAULT 0,
            target_date TEXT,
            linked_account_id INTEGER,
            status TEXT NOT NULL DEFAULT 'active',
            note TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)

    try:
        db.execute("CREATE INDEX IF NOT EXISTS idx_savings_user ON Savings_Dim(user_id)")
    except Exception as e:
        logger.warning(f"Savings index creation warning: {e}")

    logger.info("savings tables ready.")


def _migrate_debt_schema(db) -> None:
    """Add missing columns to Debt_Dim if the table was created with the old schema.
    Old schema had interest_rate, interest_type, minimum_payment, payment_frequency
    but may be missing nothing — we just ensure required columns exist.
    This is idempotent via try/except.
    """
    # These columns should exist in the new schema — add if missing
    columns_to_ensure = [
        ("status", "TEXT NOT NULL DEFAULT 'active'"),
        ("note", "TEXT"),
        ("lender", "TEXT"),
        ("debtor", "TEXT"),
        ("start_date", "TEXT"),
        ("due_date", "TEXT"),
    ]
    for col_name, col_def in columns_to_ensure:
        try:
            db.execute(f"ALTER TABLE Debt_Dim ADD COLUMN {col_name} {col_def}")
            logger.info(f"Debt_Dim: added missing column {col_name}")
        except Exception:
            pass  # Column already exists


def _migrate_savings_schema(db) -> None:
    """Add missing columns to Savings_Dim if the table was created with the old schema."""
    columns_to_ensure = [
        ("status", "TEXT NOT NULL DEFAULT 'active'"),
        ("note", "TEXT"),
        ("target_date", "TEXT"),
        ("linked_account_id", "INTEGER"),
        ("current_balance", "INTEGER NOT NULL DEFAULT 0"),
    ]
    for col_name, col_def in columns_to_ensure:
        try:
            db.execute(f"ALTER TABLE Savings_Dim ADD COLUMN {col_name} {col_def}")
            logger.info(f"Savings_Dim: added missing column {col_name}")
        except Exception:
            pass  # Column already exists


# ── Seed helpers ───────────────────────────────────────────────────────────────

def _seed_system_user(db) -> None:
    """Create the default system user (user_id=1) for existing data. Idempotent."""
    result = db.execute("SELECT COUNT(*) FROM users WHERE user_id = 1")
    if result.rows[0][0] != 0:
        return
    db.execute(
        """
        INSERT OR IGNORE INTO users (user_id, username, email, password_hash, created_at)
        VALUES (1, ?, ?, ?, datetime('now'))
        """,
        ["system_default", "system-default@local", None],
    )
    logger.info("Seeded system user (user_id=1).")


def _seed_accounts(db) -> None:
    result = db.execute("SELECT COUNT(*) as cnt FROM Account_Dim")
    if result.rows[0][0] != 0:
        return
    accounts = [
        ("Ví MoMo",       "E-Wallet",      5_000_000),
        ("Ngân hàng VCB",  "Bank",         45_000_000),
        ("Tiền mặt",       "Cash",          2_000_000),
    ]
    for name, acc_type, balance in accounts:
        db.execute(
            "INSERT INTO Account_Dim (account_name, account_type, initial_balance, current_balance, user_id) VALUES (?, ?, ?, ?, 1)",
            [name, acc_type, balance, balance],
        )
    logger.info("Seeded Account_Dim.")


def _seed_categories(db) -> None:
    result = db.execute("SELECT COUNT(*) as cnt FROM Category_Dim")
    if result.rows[0][0] != 0:
        return
    categories = [
        ("Thiết yếu",            "expense",    5_000_000),
        ("Ăn uống",             "expense",    4_000_000),
        ("Tiền lương",           "income",             0),
        ("Di chuyển",            "expense",    1_500_000),
        ("Mua sắm",              "expense",    3_000_000),
        ("Giải trí",             "expense",    2_000_000),
        ("Học tập",              "expense",    2_000_000),
        ("Sức khỏe",             "expense",    1_000_000),
        ("Khác",                 "expense",    1_500_000),
    ]
    for name, cat_type, budget in categories:
        db.execute(
            "INSERT INTO Category_Dim (category_name, category_type, budget, user_id) VALUES (?, ?, ?, 1)",
            [name, cat_type, budget],
        )
    logger.info("Seeded Category_Dim.")


def seed_categories_for_user(db, user_id: int) -> None:
    """Seed default categories for a newly registered user."""
    db.execute("""
        CREATE TABLE IF NOT EXISTS Category_Dim (
            category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL DEFAULT 1,
            category_name TEXT NOT NULL,
            category_type TEXT NOT NULL,
            budget        INTEGER NOT NULL DEFAULT 0,
            icon          TEXT,
            color         TEXT,
            created_at    TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    slugs = [
        ("Thiết yếu",            "expense",    5_000_000),
        ("Ăn uống",             "expense",    4_000_000),
        ("Tiền lương",           "income",             0),
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
