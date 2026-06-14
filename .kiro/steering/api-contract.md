# API Contract Rules

Read this before changing frontend API wrappers, hooks, Flask routes, or Express proxy behavior.

## Source of Truth

- Browser calls must use relative `/api/*` paths and go through `frontend/server.ts`.
- Express forwards `/api/*path` to Flask. Use the Express 5 named wildcard syntax only.
- All non-auth Flask routes require `Authorization: Bearer <token>`.
- Do not invent frontend endpoints. Verify a Flask route exists before calling it.

## Existing REST Surface

### Auth

- `GET|HEAD /ping` and `/api/ping` are public lightweight health checks. They must not touch Turso or require auth.
- `GET|HEAD /health` and `/api/health` are public lightweight health checks returning JSON status. They must not touch Turso or require auth.
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Transactions

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/<id>`
- `PUT /api/transactions/<id>/transfer`  — dedicated edit endpoint for `inner_transfer` rows; accepts `{from_account_id, to_account_id, amount, transaction_date, note?, location?}`
- `DELETE /api/transactions/<id>`

Rules:
- Amounts are positive VND integers.
- `Transaction_Fact.transaction_type` must be `income`, `expense`, or `inner_transfer`.
- `account_transfer` is legacy naming only; new API/UI code must use `inner_transfer`.
- Route Giao dịch must not show debt or savings movements; those live in domain fact endpoints.
- Only `transaction_type='income'` and `transaction_type='expense'` count toward dashboard/analytics income and expense summaries.
- Internal account transfers are stored as one user-facing `inner_transfer` row with `source_account_id` and `destination_account_id`.
- `transaction_date` must be `YYYY-MM-DD HH:MM:SS`.
- Optional transaction fields include `payee_id` and `location`. `source_account_id` and `destination_account_id` are required for `inner_transfer`.
- Deletes soft-delete the parent transaction with `is_deleted=1`.

### AI Parse Drafts

- `POST /api/parse-transaction`

Rules:
- This Express route calls Gemini and returns a parsed draft.
- It must not silently persist a standard transaction.
- It must not auto-create accounts or payees during parsing.
- Standard transaction drafts are saved later through `POST /api/transactions` after the user confirms or edits and confirms the draft.
- Debt and savings operation types may use their existing confirm/picker flows, but ambiguous matches must not be saved silently.
- AI drafts must return domain intent:
  - transaction: `expense`, `income`, `inner_transfer`
  - debt: `debt_disbursement`, `debt_payment`
  - savings: `savings_contribution`, `savings_withdrawal`
- Debt/savings cash movements must call debt/savings endpoints and write their domain fact tables, not `Transaction_Fact`.
- If required cash-flow context is missing or ambiguous, AI UI must ask for the missing account/fund/debt and block confirm until the user selects it. It must not save a guessed movement silently.
- The Gemini model name is `gemini-3.1-flash-lite` unless the user explicitly approves a model change.

### Accounts

- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/<id>`
- `POST /api/accounts/transfer`

Rules:
- Account create/update supports `account_name`, `account_type`, `initial_balance`, and `color`.
- `POST /api/accounts/transfer` accepts `{from_account_id, to_account_id, amount, date, note?}`. Creates one `inner_transfer` row in `Transaction_Fact` and atomically updates both account balances. Returns `{message, transaction_id}`.
- `Account_Dim.current_balance` is maintained server-side by Flask on every transaction, debt, and savings mutation. Frontend reads it directly from `GET /api/accounts` — do not recompute it client-side.
- Do not add frontend calls for account DELETE unless a backend route is implemented first.
- Existing `frontend/api/accounts.ts` and `frontend/hooks/useAccounts.ts` expose `deleteAccount`/`useDeleteAccount`, but these call a non-existent Flask route. Treat account delete as unusable until backend support exists.

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/<id>`
- `DELETE /api/categories/<id>`

Rules:
- Categories are seeded at user registration.
- Category create/update supports `category_name`, `category_type`, `icon`, and `color`.
- Category PUT also accepts `{budget}` for backward-compatible current-month budget updates.
- Category delete is blocked if the category is still referenced by active transactions or budgets.

### Budgets

- `GET /api/budgets?month=YYYY-MM`
- `PUT /api/budgets/<category_id>`
- `DELETE /api/budgets/<category_id>?month=YYYY-MM`

### Debts

- `GET /api/debts`
- `POST /api/debts`
- `PUT /api/debts/<debt_id>`
- `DELETE /api/debts/<debt_id>`
- `GET /api/debts/<debt_id>/payments`
- `POST /api/debts/<debt_id>/payments`

Rules:
- Creating a new debt/loan requires `account_id` so the backend can create the linked `debt_disbursement` transaction and update account balance.
- Debt payments are stored in `Debt_Transaction_Fact`; response fields may expose `payment_id` as an alias of `debt_transaction_id`.
- `DELETE /api/debts/<debt_id>/payments/<payment_id>`

### Savings

- `GET /api/savings`
- `POST /api/savings`
- `PUT /api/savings/<savings_id>`
- `DELETE /api/savings/<savings_id>`
- `GET /api/savings/<savings_id>/contributions`
- `POST /api/savings/<savings_id>/contributions`
- `DELETE /api/savings/<savings_id>/contributions/<contribution_id>`
- `POST /api/savings/<savings_id>/withdrawals`

Rules:
- Contributions/withdrawals are stored in `Savings_Transaction_Fact`; response fields may expose `contribution_id`/`withdrawal_id` as aliases of `savings_transaction_id`.
- Savings movements must not create `Transaction_Fact` rows.

### Analytics

- `POST /api/sql-query`

Rules:
- There are no `/api/analytics/*` Flask endpoints.
- Analytics fixes must use the SQL passthrough endpoint or implement backend routes first as an explicit feature.
- SQL passthrough is SELECT-only and blocks sensitive tables.

## Query Key Rules

- Transactions use `['transactions']`.
- Do not create duplicate transaction fetchers/query keys.
- Mutations that affect dashboard totals must invalidate/refetch all relevant query keys.

## Verification

Before committing API-related changes:

```powershell
rg -n "/api/analytics|/api/[A-Za-z0-9_/-]+" frontend backend
cd frontend; npm run build
git diff --check
```
