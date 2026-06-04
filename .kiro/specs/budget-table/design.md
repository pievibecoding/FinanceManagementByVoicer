# Design Document — Budget Table

## Overview

Replace the static `Category_Dim.budget` column with a dedicated `budgets` table that stores one budget limit per `(user_id, category_id, month)` tuple. This enables per-month budget tracking while keeping backward compatibility with the existing `GET /api/categories` response shape.

---

## Architecture

### New database table

```sql
CREATE TABLE IF NOT EXISTS budgets (
    budget_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(user_id),
    category_id  TEXT    NOT NULL REFERENCES Category_Dim(category_id),
    month        TEXT    NOT NULL,          -- 'YYYY-MM'
    amount_limit INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, category_id, month)
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month);
```

The `Category_Dim.budget` column is **kept** (not dropped) during this transition so existing code that reads it does not break.

### Migration strategy

On startup (`initialize_db`), after the table is created, a one-time migration reads all rows from `Category_Dim` where `budget > 0` and `user_id = 1`, then upserts them into `budgets` for the current calendar month. The migration is idempotent via `INSERT OR IGNORE`.

---

## Backend

### New route file: `backend/routes/budgets.py`

Blueprint prefix: none (routes declared with full `/api/budgets` paths).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/budgets` | ✅ | Return user's budgets for `?month=YYYY-MM` (default: current month) |
| PUT | `/api/budgets/<category_id>` | ✅ | Upsert budget for a category + month |
| DELETE | `/api/budgets/<category_id>` | ✅ | Delete budget row for a category + month |

**GET `/api/budgets`**
- Reads `month` from query string; defaults to `datetime.now().strftime('%Y-%m')`.
- Filters by `user_id = g.user_id` and `month = ?`.
- Returns `[{budget_id, category_id, month, amount_limit}, ...]`.

**PUT `/api/budgets/<category_id>`**
- Body: `{amount_limit: int, month?: string}`.
- Validates `amount_limit >= 0`.
- Uses `INSERT OR REPLACE INTO budgets` (upsert via UNIQUE constraint).
- Returns `{message, budget_id}`.

**DELETE `/api/budgets/<category_id>`**
- Reads `month` from query string; defaults to current month.
- Deletes row matching `(user_id, category_id, month)`.
- Returns 404 if no row found.

### Modified: `backend/routes/categories.py`

**GET `/api/categories`** — after fetching categories, run a second query to get budgets for the current month and merge `amount_limit` as the `budget` field. Categories with no budget row get `budget: 0`.

**PUT `/api/categories/<id>`** — still updates `Category_Dim.budget` (backward compat) AND upserts a row into `budgets` for the current month.

### Modified: `backend/database.py`

Add `_create_budgets_table()` and `_migrate_budgets_from_categories()` called from `initialize_db()`.

### Register blueprint: `backend/main.py`

Import and register `budgets_bp` from `routes/budgets.py`.

---

## Frontend

### New type: `Budget`

```typescript
// frontend/types.ts
export interface Budget {
  budget_id: number;
  category_id: string;
  month: string;        // 'YYYY-MM'
  amount_limit: number;
}
```

### State additions in `index.tsx`

```typescript
const [selectedMonth, setSelectedMonth] = useState<string>(() =>
  new Date().toISOString().slice(0, 7)  // 'YYYY-MM'
);
const [budgets, setBudgets] = useState<Budget[]>([]);
```

### Data flow

1. On mount (and on `selectedMonth` change) → `GET /api/budgets?month=selectedMonth` → `setBudgets`.
2. Budget editing (inline input in the analytics/categories panel) → `PUT /api/budgets/:category_id` `{amount_limit, month: selectedMonth}` → update local `budgets` state.
3. Budget alert display reads from `budgets` state (not `category.budget`) for the selected month.

### Month selector UI

A `<select>` or `<input type="month">` rendered above the budget/analytics table, defaulting to current month. Changing it triggers a re-fetch.

### `evaluateSQLQuery` in `utils.ts`

The budget-alert branch currently reads `category.budget`. It will accept an optional `budgets` parameter so the live budget data from the new table can be used:

```typescript
export const evaluateSQLQuery = (
  queryText: string,
  state: { accounts, categories, transactions, budgets?: Budget[] }
): AnalyticsResult
```

When `budgets` is provided, the budget-alert branch looks up `amount_limit` from the `budgets` array by `category_id` instead of `category.budget`. Falls back to `category.budget` if no budget row found (offline/seed mode).

---

## Data flow diagram

```
Browser
  │
  ├─ mount / month change ──→ GET /api/budgets?month=YYYY-MM
  │                                │
  │                           Flask budgets route
  │                                │ SELECT from budgets WHERE user_id=? AND month=?
  │                                ↓
  │                           [{budget_id, category_id, month, amount_limit}]
  │
  ├─ user edits budget ──────→ PUT /api/budgets/:category_id  {amount_limit, month}
  │                                │
  │                           INSERT OR REPLACE INTO budgets
  │                                ↓
  │                           {message, budget_id}  →  update budgets state
  │
  └─ GET /api/categories ────→ categories + merged budget for current month
```

---

## Backward compatibility

- `GET /api/categories` still returns `budget` field — sourced from `budgets` table for current month (0 if no row).
- `PUT /api/categories/:id` still works — writes to both `Category_Dim.budget` and `budgets` table for current month.
- `evaluateSQLQuery` falls back to `category.budget` when no `budgets` array is passed (seed/offline mode unaffected).
- `computeBalances()` is not touched — budgets have no effect on balance calculation.
