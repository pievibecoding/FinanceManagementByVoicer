# Implementation Tasks — Recurring Transactions

## Task Overview

Three phases: database → backend API → frontend UI.
Each task is self-contained and independently verifiable. Execute in order.

**Prerequisite:** `multi-user-auth-isolation` spec fully implemented (JWT auth, `@require_auth` decorator available, `g.user_id` set on every protected request).

---

## Phase 1 — Database

### Task 1: Add recurring_transactions table
- [ ] 1.1 In `backend/database.py` `_create_tables()`, add `CREATE TABLE IF NOT EXISTS recurring_transactions` with all columns: `recurring_id`, `user_id`, `account_id`, `category_id`, `payee_id`, `amount`, `type`, `note`, `frequency`, `next_run_date`, `end_date`, `is_active`
- [ ] 1.2 Add `CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))` constraint
- [ ] 1.3 Add `CHECK (type IN ('income', 'expense', 'investment'))` constraint
- [ ] 1.4 Add `FOREIGN KEY (user_id) REFERENCES users(user_id)`
- [ ] 1.5 Add `FOREIGN KEY (account_id) REFERENCES Account_Dim(account_id)`
- [ ] 1.6 Add `FOREIGN KEY (category_id) REFERENCES Category_Dim(category_id)`
- [ ] 1.7 Add `CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id)`
- [ ] 1.8 Add `CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON recurring_transactions(next_run_date, is_active)`
- [ ] 1.9 Verify: run `python main.py` — server starts without errors, new table appears in DB

**Files changed:** `backend/database.py`
**Verify:** `python main.py` completes startup; no SQL errors in console

---

## Phase 2 — Backend API

### Task 2: Create date advancement helper and recurring blueprint
- [ ] 2.1 Create `backend/routes/recurring.py` with a Flask Blueprint named `recurring_bp` with url_prefix `/api`
- [ ] 2.2 Implement `advance_date(date_str: str, frequency: str) -> str` pure function in the same file:
  - `daily`: add 1 day (`timedelta(days=1)`)
  - `weekly`: add 7 days (`timedelta(weeks=1)`)
  - `monthly`: add 1 calendar month, clamp to last valid day using `calendar.monthrange()`
  - `yearly`: add 1 year via `date.replace(year+1)`, clamp Feb 29 → Feb 28 on non-leap years
- [ ] 2.3 Register `recurring_bp` in `backend/main.py` (import + `app.register_blueprint`)
- [ ] 2.4 Verify: `python main.py` starts cleanly with the new blueprint registered

**Files created:** `backend/routes/recurring.py`
**Files changed:** `backend/main.py`

### Task 3: Implement CRUD endpoints
- [ ] 3.1 Implement `GET /api/recurring` — query `recurring_transactions WHERE user_id = g.user_id`, return JSON array sorted by `recurring_id`; decorate with `@require_auth`
- [ ] 3.2 Implement `POST /api/recurring` — validate required fields (`account_id`, `category_id`, `amount`, `type`, `frequency`, `next_run_date`), validate `amount > 0`, validate `frequency` in allowed set, INSERT row, return `{"recurring_id": last_insert_id, "message": "Recurring transaction created"}` with HTTP 201
- [ ] 3.3 Implement `PUT /api/recurring/<int:recurring_id>` — fetch rule, verify `user_id == g.user_id` (return 404 if not), UPDATE only provided fields, return `{"message": "Recurring transaction updated"}` 200
- [ ] 3.4 Implement `DELETE /api/recurring/<int:recurring_id>` — fetch rule, verify ownership (404 if not), hard DELETE the row, return `{"message": "Recurring transaction deleted"}` 200
- [ ] 3.5 Implement `PATCH /api/recurring/<int:recurring_id>/toggle` — fetch rule, verify ownership (404 if not), flip `is_active` (0→1 or 1→0), UPDATE row, return `{"message": "Recurring transaction updated", "is_active": <new_value>}` 200
- [ ] 3.6 Verify: all 5 endpoints reachable; GET returns 200 with empty list for new user; POST creates a rule; DELETE removes it; toggle flips is_active

**Files changed:** `backend/routes/recurring.py`

### Task 4: Implement process endpoint
- [ ] 4.1 Implement `POST /api/recurring/process` in `recurring.py` with `@require_auth`
- [ ] 4.2 Query all rules: `WHERE user_id = g.user_id AND is_active = 1 AND next_run_date <= date('now')`
- [ ] 4.3 For each due rule: generate `transaction_id = f"tx-{int(time.time() * 1000)}"`, INSERT into `Transaction_Fact` with `transaction_date = f"{rule['next_run_date']} 00:00:00"`, `is_deleted = 0`
- [ ] 4.4 After each INSERT, call `advance_date(rule['next_run_date'], rule['frequency'])` to compute `new_next_run_date`
- [ ] 4.5 If `rule['end_date']` is set and `new_next_run_date > rule['end_date']`: UPDATE rule with `next_run_date = new_next_run_date, is_active = 0`
- [ ] 4.6 Otherwise: UPDATE rule with `next_run_date = new_next_run_date` only
- [ ] 4.7 Return `{"generated": <count>}` 200
- [ ] 4.8 Verify: create a rule with `next_run_date` in the past → call POST /api/recurring/process → confirm transaction appears in GET /api/transactions and rule's next_run_date advanced

**Files changed:** `backend/routes/recurring.py`

---

## Phase 3 — Frontend

### Task 5: Add TypeScript type and API functions
- [ ] 5.1 Add `RecurringTransaction` interface to `frontend/types.ts` with fields: `recurring_id` (number), `account_id`, `category_id`, `payee_id` (number|null), `amount` (number), `type` ('income'|'expense'|'investment'), `note` (string), `frequency` ('daily'|'weekly'|'monthly'|'yearly'), `next_run_date` (string), `end_date` (string|null), `is_active` (number)
- [ ] 5.2 In `frontend/index.tsx` (or a separate `api/recurring.ts` if preferred), add fetch helpers:
  - `fetchRecurring(token)` → GET `/api/recurring`
  - `createRecurring(token, data)` → POST `/api/recurring`
  - `toggleRecurring(token, id)` → PATCH `/api/recurring/:id/toggle`
  - `deleteRecurring(token, id)` → DELETE `/api/recurring/:id`
  - `processRecurring(token)` → POST `/api/recurring/process`
- [ ] 5.3 Verify: TypeScript compiles without errors (`npm run build`)

**Files changed:** `frontend/types.ts`, `frontend/index.tsx` (or new `frontend/api/recurring.ts`)

### Task 6: Add state and startup processing to App
- [ ] 6.1 Add state in the `App` component in `frontend/index.tsx`:
  - `recurringRules: RecurringTransaction[]` initialized to `[]`
  - `generatedCount: number` initialized to `0`
  - `showRecurringForm: boolean` initialized to `false`
- [ ] 6.2 Add `loadRecurring()` function that calls `fetchRecurring(token)` and sets `recurringRules`
- [ ] 6.3 Call `loadRecurring()` alongside the existing data-loading calls (transactions, accounts, categories)
- [ ] 6.4 Add `runProcessRecurring()` async function: calls `processRecurring(token)`, if `generated > 0` → set `generatedCount`, call `loadTransactions()` and `loadRecurring()` to refresh data
- [ ] 6.5 Call `runProcessRecurring()` once on mount, after the auth token is confirmed (same place other initial fetches happen)
- [ ] 6.6 Verify: on app load, network tab shows POST /api/recurring/process fired once

**Files changed:** `frontend/index.tsx`

### Task 7: Build recurring rules UI
- [ ] 7.1 Add a "Recurring" tab/section to the existing sidebar navigation in `index.tsx` (match the existing tab style — Tailwind v4 utility classes, same pattern as other tabs)
- [ ] 7.2 Render the recurring section when that tab is active:
  - Show header "Giao dịch định kỳ" with an "+ Thêm mới" button
  - If `generatedCount > 0`, show a dismissible banner: "✓ Đã tạo {generatedCount} giao dịch định kỳ"
  - If `recurringRules` is empty, show an empty state message
- [ ] 7.3 Render each rule as a card showing: `amount` (formatted via `formatCurrency`), `frequency` label in Vietnamese, account name (lookup from `accounts` state), category name (lookup from `categories` state), `next_run_date`, and `is_active` status badge
- [ ] 7.4 Each card has a toggle button: shows "Tắt" if `is_active=1` or "Bật" if `is_active=0`; on click, calls `toggleRecurring(token, recurring_id)` then re-fetches the rule list
- [ ] 7.5 Each card has a "Xóa" button; on click, calls `deleteRecurring(token, recurring_id)` then re-fetches the rule list
- [ ] 7.6 Verify: rules load and display; toggle and delete update the list correctly

**Files changed:** `frontend/index.tsx`

### Task 8: Build create recurring rule form
- [ ] 8.1 When "+ Thêm mới" is clicked, show an inline form (modal or inline section — match existing form patterns in the app)
- [ ] 8.2 Form fields (all using Tailwind v4 utility classes matching the app's existing input style):
  - Số tiền (number input, required)
  - Loại (select: thu nhập / chi tiêu / đầu tư, required)
  - Tài khoản (select from `accounts` state, required)
  - Danh mục (select from `categories` state, filtered to matching `type`, required)
  - Tần suất (select: hàng ngày / hàng tuần / hàng tháng / hàng năm, required)
  - Ngày bắt đầu (date input, `next_run_date`, required)
  - Ngày kết thúc (date input, `end_date`, optional)
  - Ghi chú (text input, optional)
- [ ] 8.3 On submit: call `createRecurring(token, formData)`, on success close form and call `loadRecurring()`
- [ ] 8.4 Show inline error message if API returns an error
- [ ] 8.5 Verify: create a monthly salary rule → rule appears in list → POST /api/recurring/process generates it if date is past

**Files changed:** `frontend/index.tsx`

---

## Final Verification Checklist

- [ ] `recurring_transactions` table exists in DB after `python main.py` startup
- [ ] `GET /api/recurring` returns 401 without token, 200 with empty array for new user
- [ ] `POST /api/recurring` creates a rule and returns `recurring_id`
- [ ] `PATCH /api/recurring/:id/toggle` flips `is_active` correctly
- [ ] `DELETE /api/recurring/:id` removes the rule; other users' rules are unaffected
- [ ] `POST /api/recurring/process` with a past `next_run_date` generates a transaction and advances the date
- [ ] Monthly rule on Jan 31 advances to Feb 28 (not Feb 31)
- [ ] Rule with `end_date` deactivates after the last occurrence
- [ ] Frontend calls process once on startup; generated count banner appears when > 0
- [ ] Recurring tab lists rules; toggle and delete work correctly
- [ ] Create form submits valid rules; validation rejects missing required fields
