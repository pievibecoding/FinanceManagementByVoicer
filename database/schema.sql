CREATE TABLE IF NOT EXISTS Account_Dim (
    account_id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL,
    initial_balance INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Category_Dim (
    category_id TEXT PRIMARY KEY,
    category_name TEXT NOT NULL,
    category_type TEXT NOT NULL,
    budget INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Transaction_Fact (
    transaction_id TEXT PRIMARY KEY,
    transaction_date TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id),
    FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)
);
