# Implementation Tasks — Split Transactions

## Task Overview

Four phases: DB schema → Backend API → Frontend form → Frontend display.
Each task is independently verifiable. Execute in order.

---

## Phase 1 — Database

### Task 1: Add `split_transactions` table and seed split sentinel category

- [ ] 1.1 Add `_create_split_table(db)` function to `backend/database.py`:
  - `CREATE TABLE IF NOT EXISTS split_transactions` with columns: `split_id INTEGER PRIMARY KEY AUTOINCREMENT`, `transaction_id TEXT NOT NULL`, `category_id TEXT NOT NULL`, `amount INTEGER NOT NULL`, `note TEXT`
  - Add FK to `Transaction_Fact(transaction_id)` and `Category_Dim(category_id)`
  - `CREATE INDEX IF NOT EXISTS idx_split_transaction ON split_transactions(transaction_id)`
- [ ] 1.2 Add `_seed_split_category(db)` function to `backend/database.py`:
  - `INSERT OR IGNORE INTO Category_Dim (category_id, category_name, category_type, budget, user_id) VALUES ('split', 'Nhiều danh mục', 'split', 0, 1)`
- [ ] 1.3 Call `_create_split_table(db)` and `_seed_split_category(db)` from `initialize_db()` in `backend/database.py`
- [ ] 1.4 Verify: run `python main.py` — server starts cleanly, `split_transactions` table exists, `Category_Dim` contains a `'split'` row

**Files changed:** `backend/database.py`

---

## Phase 2 — Backend API

### Task 2: Extend POST /api/transactions to accept splits

- [ ] 2.1 In `backend/routes/transactions.py` `create_transaction()`: read optional `splits = data.get("splits", [])` from request JSON
- [ ] 2.2 When `splits` is non-empty, validate that `sum(s["amount"] for s in splits) == int(amount)` — return `{"error": "Split amounts must sum to total amount"}` with HTTP 400 if not
- [ ] 2.3 When `splits` is non-empty, force `category_id = "split"` on the parent row regardless of what the client sent
- [ ] 2.4 After inserting the parent `Transaction_Fact` row, loop over `splits` and insert each into `split_transactions` with `(transaction_id, category_id, amount, note)`
- [ ] 2.5 Verify: `POST /api/transactions` without `splits` field behaves identically to before
- [ ] 2.6 Verify: `POST /api/transactions` with `splits` summing to parent amount returns 201 and creates rows in `split_transactions`
- [ ] 2.7 Verify: `POST /api/transactions` with mismatched sum returns 400

**Files changed:** `backend/routes/transactions.py`

### Task 3: Extend GET /api/transactions to attach split rows

- [ ] 3.1 In `get_transactions()`: after fetching transactions, extract `tx_ids` list
- [ ] 3.2 When `tx_ids` is non-empty, query `split_transactions WHERE transaction_id IN (...)` using a parameterized placeholder string
- [ ] 3.3 Group split rows into a dict keyed by `transaction_id`
- [ ] 3.4 Attach `tx["splits"] = splits_map.get(tx["transaction_id"], [])` to each transaction dict
- [ ] 3.5 Verify: `GET /api/transactions` returns all transactions with a `splits` field — empty array for non-split, populated array for split transactions

**Files changed:** `backend/routes/transactions.py`

### Task 4: Extend DELETE /api/transactions/:id to clean up splits

- [ ] 4.1 In `delete_transaction()`: before the soft-delete UPDATE, run `DELETE FROM split_transactions WHERE transaction_id = ?` using the same `transaction_id`
- [ ] 4.2 Verify: deleting a split transaction removes its `split_transactions` rows and sets `is_deleted = 1` on the parent

**Files changed:** `backend/routes/transactions.py`

---

## Phase 3 — Frontend Form

### Task 5: Update TypeScript types

- [ ] 5.1 Add `SplitItem` interface to `frontend/types.ts`:
  ```typescript
  interface SplitItem {
    split_id?: number;
    category_id: string;
    amount: number;
    note?: string;
  }
  ```
- [ ] 5.2 Add `splits: SplitItem[]` field to the `Transaction` interface in `frontend/types.ts`

**Files changed:** `frontend/types.ts`

### Task 6: Add split mode to the manual transaction modal in `index.tsx`

- [ ] 6.1 Add `splitMode` boolean state (default `false`) inside `App`
- [ ] 6.2 Add `splitItems` state — array of `{category_id: string; amount: string; note: string}` (default `[]`)
- [ ] 6.3 Add a checkbox/toggle "☑ Chia nhiều danh mục" in the manual transaction modal that sets `splitMode`
- [ ] 6.4 When `splitMode` is true, hide the single category selector and show the split rows section instead
- [ ] 6.5 Render each split row with: category `<select>` (populated from `categories`), amount `<input type="number">`, note `<input type="text">`
- [ ] 6.6 Add "＋ Thêm danh mục" button that appends a new empty split row to `splitItems`
- [ ] 6.7 Add a remove (×) button on each split row that removes it from `splitItems`
- [ ] 6.8 Display a running total line: `Đã phân bổ: {formatCurrency(splitTotal)} / {formatCurrency(Number(manualTx.amount))}` with green ✅ when equal or red ❌ when not
- [ ] 6.9 Disable the submit button when `splitMode && splitTotal !== Number(manualTx.amount)`
- [ ] 6.10 When closing / resetting the modal, reset both `splitMode` to `false` and `splitItems` to `[]`

**Files changed:** `frontend/index.tsx`

### Task 7: Submit split transaction from the manual form

- [ ] 7.1 In `handleInsertManual()`: when `splitMode && splitItems.length > 0`, build the `splits` payload as `splitItems.map(s => ({ category_id: s.category_id, amount: Number(s.amount), note: s.note }))`
- [ ] 7.2 Include `splits` in the POST body to `/api/transactions`; set `category_id: 'split'` in the body
- [ ] 7.3 On success, reload transactions from the backend (`loadTransactions()`) to pick up the persisted split data
- [ ] 7.4 Verify: submitting a split transaction via the modal creates one `Transaction_Fact` row with `category_id='split'` and the correct `split_transactions` rows

**Files changed:** `frontend/index.tsx`

---

## Phase 4 — Frontend Display

### Task 8: Show split transactions correctly in the transaction table

- [ ] 8.1 In the `tables` tab transaction table, replace the raw `t.category_id` cell with a helper that returns `'⑂ Nhiều danh mục'` when `t.category_id === 'split'`, otherwise the category name looked up from `categories` state
- [ ] 8.2 Add an expand toggle state: `expandedTxId: string | null` (default `null`)
- [ ] 8.3 Add a small expand button (▶ / ▼) in the row's action column for split transactions only
- [ ] 8.4 When expanded, render an inline sub-row spanning all columns showing a small table of `t.splits`: columns `danh_mục`, `số_tiền`, `ghi_chú`
- [ ] 8.5 Verify: non-split transactions show normal category name with no expand button; split transactions show `⑂ Nhiều danh mục` with an expand button that reveals split details

**Files changed:** `frontend/index.tsx`

### Task 9: Fix budget alert category sums to use split amounts

- [ ] 9.1 In `App`, locate the `categorySums` aggregation loop (currently: `transactions.forEach(t => { if (t.type === 'expense') categorySums[t.category_id] += t.amount; })`)
- [ ] 9.2 Update the loop: when `t.splits && t.splits.length > 0`, iterate `t.splits` and add each `s.amount` to `categorySums[s.category_id]` instead of the parent amount to `'split'`
- [ ] 9.3 Verify: after adding a split transaction (e.g. 300k food + 200k shopping), the budget progress bars for "Ăn uống" and "Mua sắm" increase correctly; the `'split'` category does not appear in the budget list

**Files changed:** `frontend/index.tsx`

---

## Final Verification Checklist

- [ ] `split_transactions` table exists after server start
- [ ] `Category_Dim` contains a `'split'` row with `category_type = 'split'`
- [ ] `POST /api/transactions` without `splits` → unchanged behavior
- [ ] `POST /api/transactions` with valid `splits` → parent has `category_id='split'`, child rows created
- [ ] `POST /api/transactions` with mismatched split sum → 400 error
- [ ] `GET /api/transactions` → every transaction has a `splits` field (empty array or populated)
- [ ] `DELETE /api/transactions/:id` on a split transaction → parent soft-deleted, split rows removed
- [ ] Manual form split mode: running total shows correctly, submit disabled on mismatch
- [ ] Transaction table: split rows show `⑂ Nhiều danh mục` with expandable split detail
- [ ] Budget progress bars use split amounts per category, not the parent `'split'` category
