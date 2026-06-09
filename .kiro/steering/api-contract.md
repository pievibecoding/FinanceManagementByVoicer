# API Contract Rules

Read this before changing frontend API wrappers, hooks, Flask routes, or Express proxy behavior.

## Source of Truth

- Browser calls must use relative `/api/*` paths and go through `frontend/server.ts`.
- Express forwards `/api/*path` to Flask. Use the Express 5 named wildcard syntax only.
- All non-auth Flask routes require `Authorization: Bearer <token>`.
- Do not invent frontend endpoints. Verify a Flask route exists before calling it.

## Existing REST Surface

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Transactions

- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/<id>`
- `DELETE /api/transactions/<id>`

Rules:
- Amounts are positive VND integers.
- Direction is represented by `type`.
- `transaction_date` must be `YYYY-MM-DD HH:MM:SS`.
- Deletes are soft deletes.

### Accounts

- `GET /api/accounts`
- `POST /api/accounts`

Rules:
- Do not add frontend calls for account PUT/DELETE unless backend routes are implemented first.
- Current balance is computed client-side from `initial_balance` plus transactions.

### Categories

- `GET /api/categories`
- `PUT /api/categories/<id>` updates budget information only.

Rules:
- Categories are seeded at user registration.
- Do not add category POST/DELETE calls unless backend routes are implemented first.

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
- `DELETE /api/debts/<debt_id>/payments/<payment_id>`

### Savings

- `GET /api/savings`
- `POST /api/savings`
- `PUT /api/savings/<savings_id>`
- `DELETE /api/savings/<savings_id>`
- `GET /api/savings/<savings_id>/contributions`
- `POST /api/savings/<savings_id>/contributions`
- `DELETE /api/savings/<savings_id>/contributions/<contribution_id>`

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
