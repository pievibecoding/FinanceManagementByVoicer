# Technical Design Document — Split Transactions

## 1. System Architecture

### 1.1 Overview

Split transactions extend the existing `Transaction_Fact` + `Category_Dim` model with a new `split_transactions` child table. The parent transaction holds the total amount and account; child split rows distribute the amount across multiple categories.

```
Transaction_Fact (parent)
  transaction_id: 'tx-1234567890'
  account_id:     'cash'
  category_id:    'split'          ← sentinel value
  amount:         500_000
  type:           'expense'

split_transactions (children)
  split_id:       1   category_id: '{uid}-food'      amount: 300_000  note: 'rau củ'
  split_id:       2   category_id: '{uid}-shopping'  amount: 200_000  note: 'xà phòng'
```

### 1.2 Data Flow

```
Frontend manual form
  │  POST /api/transactions  { ..., splits: [{category_id, amount, note}] }
  ▼
Flask route (transactions.py)
  │  Validate: sum(splits.amount) == amount
  │  INSERT Transaction_Fact  WHERE category_id = 'split'
  │  INSERT split_transactions (one row per split)
  ▼
Turso DB

Frontend GET /api/transactions
  ▼
Flask route
  │  SELECT Transaction_Fact + LEFT JOIN split_transactions
  ▼
[ { ...tx, splits: [{split_id, category_id, amount, note}] }, ... ]
```

---

## 2. Database Schema

### 2.1 New Table: `split_transactions`

```sql
CREATE TABLE IF NOT EXISTS split_transactions (
    split_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT    NOT NULL,
    category_id    TEXT    NOT NULL,
    amount         INTEGER NOT NULL,
    note           TEXT,
    FOREIGN KEY (transaction_id) REFERENCES Transaction_Fact(transaction_id),
    FOREIGN KEY (category_id)    REFERENCES Category_Dim(category_id)
);

CREATE INDEX IF NOT EXISTS idx_split_transaction ON split_transactions(transaction_id);
```

### 2.2 Sentinel Category: `'split'`

A system-level category row (user_id = 1, shared) is seeded once:

```sql
INSERT OR IGNORE INTO Category_Dim
  (category_id, category_name, category_type, budget, user_id)
VALUES
  ('split', 'Nhiều danh mục', 'split', 0, 1);
```

`category_type = 'split'` is a new value; all existing route logic filters on `category_type IN ('expense','income','investment')` so the sentinel is invisible to budget/analytics queries unless explicitly requested.

### 2.3 Migration Strategy

- `_create_split_table(db)` added to `database.py` — called from `initialize_db()`.
- `_seed_split_category(db)` seeds the sentinel row — called from `initialize_db()`.
- Both functions are idempotent (`CREATE IF NOT EXISTS`, `INSERT OR IGNORE`).
- No ALTER TABLE required — existing `Transaction_Fact` rows are unaffected.

---

## 3. Backend API Design

### 3.1 POST /api/transactions — Extended

**New optional field:**

```json
{
  "transaction_date": "2026-06-04 10:30:00",
  "account_id": "cash",
  "category_id": "split",
  "amount": 500000,
  "type": "expense",
  "note": "Siêu thị BigC",
  "splits": [
    { "category_id": "2-food",     "amount": 300000, "note": "rau củ" },
    { "category_id": "2-shopping", "amount": 200000, "note": "xà phòng" }
  ]
}
```

**Validation logic:**

1. If `splits` is absent or empty → existing path, no change.
2. If `splits` is present:
   - Each split must have `category_id` and `amount` (positive integer).
   - `sum(split.amount)` must equal parent `amount` → 400 if not.
   - Force `category_id = 'split'` on the parent row (client may send it, server enforces it).
3. Insert parent row into `Transaction_Fact`.
4. Insert each split into `split_transactions`.
5. Both inserts done in a single db connection (sequential, no explicit transaction API needed for Turso sync client — failure on split insert leaves an orphaned parent, which is acceptable for MVP; a future task can add cleanup).

**Response (unchanged):**

```json
{ "message": "Transaction created!", "transaction_id": "tx-1234567890" }
```

### 3.2 GET /api/transactions — Extended

Attach split rows to each transaction. Two-query approach (simpler than a multi-row JOIN that requires grouping in Python):

```python
# 1. Fetch all transactions for user
transactions = db.execute(
    "SELECT * FROM Transaction_Fact WHERE user_id = ? AND is_deleted = 0 ORDER BY transaction_date DESC",
    [g.user_id]
)

# 2. Fetch all splits for those transaction IDs
tx_ids = [tx["transaction_id"] for tx in transactions]
# Build parameterized IN clause
placeholders = ",".join("?" * len(tx_ids))
splits = db.execute(
    f"SELECT * FROM split_transactions WHERE transaction_id IN ({placeholders})",
    tx_ids
) if tx_ids else []

# 3. Group splits by transaction_id and attach
splits_map = {}
for s in splits:
    splits_map.setdefault(s["transaction_id"], []).append(s)

for tx in transactions:
    tx["splits"] = splits_map.get(tx["transaction_id"], [])
```

**Response shape per transaction (new field):**

```json
{
  "transaction_id": "tx-123",
  "splits": [
    { "split_id": 1, "category_id": "2-food", "amount": 300000, "note": "rau củ" }
  ]
}
```

Non-split transactions get `"splits": []`.

### 3.3 DELETE /api/transactions/:id — Extended

Physically delete split rows before soft-deleting the parent (order matters for FK integrity):

```python
db.execute(
    "DELETE FROM split_transactions WHERE transaction_id = ?",
    [transaction_id]
)
db.execute(
    "UPDATE Transaction_Fact SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?",
    [transaction_id, g.user_id]
)
```

---

## 4. Frontend Design

### 4.1 Type Updates (`types.ts`)

```typescript
interface SplitItem {
  split_id?: number;       // present when reading from API
  category_id: string;
  amount: number;
  note?: string;
}

interface Transaction {
  // ... existing fields ...
  splits: SplitItem[];     // always present (empty array for non-split)
}
```

### 4.2 Manual Transaction Form — Split Mode

The existing `isManualModalOpen` modal in `App` gains split support:

**State additions:**

```typescript
const [splitMode, setSplitMode] = useState(false);
const [splitItems, setSplitItems] = useState<Array<{category_id: string; amount: string; note: string}>>([]);
```

**UI layout (split mode):**

```
┌─────────────────────────────────────────────────┐
│  Tổng số tiền:  [500,000]   Loại: [Chi tiêu ▼]  │
│  Tài khoản:     [Tiền mặt ▼]                    │
│  Ghi chú:       [Siêu thị BigC]                 │
│                                                   │
│  ☑ Chia nhiều danh mục                           │
│  ─────────────────────────────────────────────   │
│  Danh mục 1: [Ăn uống ▼]  Số tiền: [300,000]   │
│              Ghi chú: [rau củ]                  │
│  Danh mục 2: [Mua sắm ▼]  Số tiền: [200,000]   │
│              Ghi chú: [xà phòng]                │
│  [+ Thêm danh mục]                              │
│                                                   │
│  Đã phân bổ: 500,000 / 500,000  ✅ Khớp         │
│                      (or ❌ Chênh lệch 50,000)   │
│                                                   │
│  [     Lưu giao dịch     ]  ← disabled if mismatch│
└─────────────────────────────────────────────────┘
```

**Validation:** Submit button disabled when `sum(splitItems.amount) !== Number(manualTx.amount)`.

### 4.3 Transaction List — Split Display

In the `tables` tab transaction table, split transactions show:

- `category_id` column: displays `"Nhiều danh mục"` with a split icon instead of raw `'split'`.
- An expand button (▶) on the row that reveals a sub-table of split rows inline.

**Category label helper:**

```typescript
function getCategoryLabel(tx: Transaction, categories: Category[]): string {
  if (tx.category_id === 'split') return '⑂ Nhiều danh mục';
  return categories.find(c => c.category_id === tx.category_id)?.category_name ?? tx.category_id;
}
```

### 4.4 Balance Computation (`utils.ts`)

`computeBalances()` already uses `tx.amount` and `tx.type` for balance delta — split transactions are no different (the parent `amount` = total cash moved). **No change needed.**

### 4.5 Budget Alert Logic

The existing `categorySums` aggregation in `App` reads `t.category_id`:

```typescript
transactions.forEach(t => {
  if (t.type === 'expense') {
    categorySums[t.category_id] = (categorySums[t.category_id] || 0) + t.amount;
  }
});
```

For split transactions this assigns the full amount to `'split'` (which has no budget limit), missing per-category breakdown. Fix:

```typescript
transactions.forEach(t => {
  if (t.type !== 'expense') return;
  if (t.splits && t.splits.length > 0) {
    // Use split amounts per category
    t.splits.forEach(s => {
      categorySums[s.category_id] = (categorySums[s.category_id] || 0) + s.amount;
    });
  } else {
    categorySums[t.category_id] = (categorySums[t.category_id] || 0) + t.amount;
  }
});
```

---

## 5. Requirements Traceability

| Requirement | Design Element |
|---|---|
| Req 1: `split_transactions` table | §2.1 schema, `_create_split_table()` |
| Req 1: `'split'` sentinel category | §2.2 seed row, `_seed_split_category()` |
| Req 2: POST with optional `splits` | §3.1 validation + insert logic |
| Req 2: sum validation → 400 | §3.1 validation block |
| Req 3: GET returns `splits` array | §3.2 two-query attach pattern |
| Req 4: DELETE removes split rows | §3.3 physical delete before soft-delete |
| Req 5: "Add Split" button in form | §4.2 modal split mode |
| Req 5: running total + submit guard | §4.2 validation UI |
| Req 5: visual distinction in list | §4.3 category label helper + expand row |
| Req 6: `computeBalances()` unchanged | §4.4 — no change needed |
| Req 6: budget alert uses split amounts | §4.5 updated `categorySums` loop |
