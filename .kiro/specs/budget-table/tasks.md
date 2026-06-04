# Tasks — Budget Table

## Task 1: Create budgets table + migration in database.py

**File:** `backend/database.py`

- [ ] Add `_create_budgets_table(db)` function:
  ```python
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
  db.execute("CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month)")
  ```
- [ ] Add `_migrate_budgets_from_categories(db)` function:
  - Read all rows from `Category_Dim` where `budget > 0` and `user_id = 1`
  - Get current month as `datetime.now().strftime('%Y-%m')`
  - `INSERT OR IGNORE INTO budgets (user_id, category_id, month, amount_limit)` for each row
  - Log how many rows were migrated
- [ ] Call both functions from `initialize_db()` after `_migrate_schema()`

**Verify:** `python main.py` starts without errors; `budgets` table exists in Turso.

---

## Task 2: Create backend/routes/budgets.py

**File:** `backend/routes/budgets.py` (new file)

- [ ] Create Flask Blueprint `budgets_bp`
- [ ] Implement `GET /api/budgets`:
  - Decorated with `@require_auth`
  - Read `month` from `request.args.get('month')`, default to `datetime.now().strftime('%Y-%m')`
  - Query: `SELECT budget_id, category_id, month, amount_limit FROM budgets WHERE user_id=? AND month=?`
  - Return `jsonify(rows_to_dicts(result)), 200`
- [ ] Implement `PUT /api/budgets/<category_id>`:
  - Decorated with `@require_auth`
  - Parse body: `{amount_limit: int, month?: str}`
  - Validate `amount_limit` is non-negative integer (return 400 if not)
  - Default `month` to current month if omitted
  - `INSERT OR REPLACE INTO budgets (user_id, category_id, month, amount_limit) VALUES (?,?,?,?)`
  - Return `{message: "Budget updated", budget_id: last_insert_rowid}, 200`
- [ ] Implement `DELETE /api/budgets/<category_id>`:
  - Decorated with `@require_auth`
  - Read `month` from `request.args.get('month')`, default to current month
  - Check if row exists for `(user_id, category_id, month)` → 404 if not
  - Delete the row
  - Return `{message: "Budget deleted"}, 200`

**Verify:**
```bash
# Get budgets (should return migrated data)
curl http://localhost:5000/api/budgets?month=2026-06 -H "Authorization: Bearer TOKEN"

# Set a budget
curl -X PUT http://localhost:5000/api/budgets/food \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount_limit": 5000000, "month": "2026-06"}'

# Delete a budget
curl -X DELETE "http://localhost:5000/api/budgets/food?month=2026-06" \
  -H "Authorization: Bearer TOKEN"
```

---

## Task 3: Register budgets blueprint in main.py

**File:** `backend/main.py`

- [ ] Import: `from routes.budgets import budgets_bp`
- [ ] Register: `app.register_blueprint(budgets_bp)`

**Verify:** `GET /api/budgets` returns 401 without token, 200 with token.

---

## Task 4: Update GET /api/categories to merge budget from budgets table

**File:** `backend/routes/categories.py`

- [ ] In `get_categories()`, after fetching categories:
  - Get current month: `current_month = datetime.now().strftime('%Y-%m')`
  - Query: `SELECT category_id, amount_limit FROM budgets WHERE user_id=? AND month=?`
  - Build a dict `{category_id: amount_limit}`
  - For each category dict, set `category['budget'] = budget_map.get(category['category_id'], 0)`
- [ ] Add `from datetime import datetime` import at top

**Verify:** `GET /api/categories` returns `budget` field reflecting `budgets` table values for current month.

---

## Task 5: Update PUT /api/categories/:id to also write to budgets table

**File:** `backend/routes/categories.py`

- [ ] In `update_category_budget()`, after updating `Category_Dim`:
  - Get current month
  - `INSERT OR REPLACE INTO budgets (user_id, category_id, month, amount_limit) VALUES (?,?,?,?)`
- [ ] Keep existing `Category_Dim.budget` update for backward compat

**Verify:** `PUT /api/categories/food` with `{budget: 6000000}` updates both `Category_Dim` and `budgets` table.

---

## Task 6: Add Budget type to frontend/types.ts

**File:** `frontend/types.ts`

- [ ] Add interface:
  ```typescript
  export interface Budget {
    budget_id: number;
    category_id: string;
    month: string;        // 'YYYY-MM'
    amount_limit: number;
  }
  ```

---

## Task 7: Add budgets state and month selector to index.tsx

**File:** `frontend/index.tsx`

- [ ] Add state:
  ```typescript
  const [selectedMonth, setSelectedMonth] = useState<string>(
    () => new Date().toISOString().slice(0, 7)
  );
  const [budgets, setBudgets] = useState<Budget[]>([]);
  ```
- [ ] Add `fetchBudgets(month: string)` function:
  - `GET /api/budgets?month=${month}` with `Authorization` header
  - On success: `setBudgets(data)`
  - On 401: trigger logout
- [ ] Call `fetchBudgets(selectedMonth)` inside the existing `useEffect` that fetches initial data
- [ ] Call `fetchBudgets(selectedMonth)` when `selectedMonth` changes (separate `useEffect` or dependency)
- [ ] Add month selector `<input type="month">` in the analytics/budget panel header:
  ```tsx
  <input
    type="month"
    value={selectedMonth}
    onChange={e => setSelectedMonth(e.target.value)}
    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white"
  />
  ```

---

## Task 8: Wire budget editing to PUT /api/budgets in index.tsx

**File:** `frontend/index.tsx`

- [ ] Add `updateBudget(categoryId: string, amountLimit: number)` function:
  - `PUT /api/budgets/${categoryId}` with body `{amount_limit: amountLimit, month: selectedMonth}`
  - On success: update local `budgets` state (replace matching entry or append new one)
- [ ] In the category budget editing UI (inline input), call `updateBudget` instead of the old `PUT /api/categories/:id`
- [ ] Keep old `PUT /api/categories/:id` call as a fallback or remove it — the backend now handles both via the new budgets endpoint

---

## Task 9: Update budget alert display to use budgets state

**File:** `frontend/index.tsx` and `frontend/utils.ts`

- [ ] In `utils.ts`, update `evaluateSQLQuery` signature:
  ```typescript
  state: { accounts: Account[]; categories: Category[]; transactions: Transaction[]; budgets?: Budget[] }
  ```
- [ ] In the budget-alert branch of `evaluateSQLQuery`, when `state.budgets` is provided:
  - Look up `amount_limit` from `state.budgets` by `category_id` instead of `category.budget`
  - Fall back to `category.budget` if no matching budget row found
- [ ] In `index.tsx`, pass `budgets` into `evaluateSQLQuery` calls:
  ```typescript
  evaluateSQLQuery(query, { accounts, categories, transactions, budgets })
  ```
- [ ] In any budget alert UI that renders directly (not via `evaluateSQLQuery`), replace `category.budget` reads with a lookup from `budgets` state by `category_id`

**Verify:**
- Change `selectedMonth` → budget alert values update
- Edit a budget inline → alert updates immediately (optimistic update via local state)
- Offline/seed mode (no `budgets` passed) → falls back to `category.budget`, no crash
