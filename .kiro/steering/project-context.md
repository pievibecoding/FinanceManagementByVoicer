# Finance Management by Voicer — Project Context

> Auto-loaded context for AI coding agents. Accurate as of the current codebase state.

---

## 1. Project Overview

**Finance Management by Voicer** is a Vietnamese personal finance tracker with AI-powered voice/text transaction parsing and multi-user authentication.

| Layer | Tech | Entry Point |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4, TanStack Router, TanStack Query, shadcn/ui, Zustand | `frontend/src/main.tsx` |
| BFF Server | Express 5 (TypeScript) + Gemini Flash Lite API | `frontend/server.ts` (port 3000) |
| Backend API | Python Flask + Flask-CORS | `backend/main.py` (port 5000) |
| Database | Turso (libSQL / SQLite-compatible, cloud) | `backend/database.py` |
| Auth | JWT (python-jose) + bcrypt (rounds=12) + Google OAuth | `backend/auth/` |
| AI | Google Gemini (via `@google/genai`) | server-side only in `server.ts` |

**Core flow:** User logs in → speaks/types Vietnamese → Express BFF calls Gemini to parse → saves to Turso via Flask REST (JWT-authenticated, user-scoped) → React reads back via TanStack Query.

**Dev command:** `cd frontend && npm run dev` → runs `tsx --env-file=.env.local server.ts` which starts Express on port 3000 with Vite middleware embedded. **Do NOT run `vite` directly.**

---

## 2. Frontend Architecture (New — TanStack Router)

The frontend was migrated from a single-file SPA (`index.tsx`) to a TanStack Router file-based routing app.

### Entry point chain
```
frontend/index.html
  └── /src/main.tsx              (React root, QueryClient, ThemeProvider, RouterProvider)
       └── src/routeTree.gen.ts  (auto-generated — DO NOT edit manually)
       └── src/routes/__root.tsx (wraps AuthProvider + Toaster)
```

### Route tree
```
/sign-in          → src/routes/sign-in.tsx
/sign-up          → src/routes/sign-up.tsx
/signout          → src/routes/signout.tsx
/help             → src/routes/help.tsx (stub)
/_authenticated   → src/routes/_authenticated/route.tsx (auth guard)
  /               → src/routes/_authenticated/index.tsx (Dashboard)
  /accounts       → src/routes/_authenticated/accounts/index.tsx
  /transactions   → src/routes/_authenticated/transactions/index.tsx
  /categories     → src/routes/_authenticated/categories/index.tsx
  /budgets        → src/routes/_authenticated/budgets/index.tsx
  /analytics      → src/routes/_authenticated/analytics/index.tsx
  /settings       → src/routes/_authenticated/settings/index.tsx (stub)
```

### Auth flow
- `contexts/AuthContext.tsx` — React Context, single source of truth for auth state
- `__root.tsx` wraps the whole app in `<AuthProvider>`
- `_authenticated/route.tsx` checks `isAuthenticated` from `useAuth()`, redirects to `/sign-in` if false
- Token stored in `localStorage` under key `finance_auth_token`
- `AuthContext` verifies token against `/api/auth/me` on load

### API proxy (critical)
All `/api/*` calls from the browser go to Express (port 3000), which proxies them to Flask (port 5000).
- `vite.config.ts` has `server.proxy` for Vite standalone mode (not normally used)
- `server.ts` has explicit auth routes + `app.all("/api/*path")` generic catch-all for all other Flask routes
- **Never call Flask directly from the browser** — always use relative `/api/` paths

---

## 3. Frontend File Map

```
frontend/
├── index.html                    ← HTML shell → src/main.tsx
├── server.ts                     ← Express BFF: auth proxy + /api/parse-transaction + Vite middleware
├── vite.config.ts                ← TanStack Router plugin, Tailwind, path alias @/ → frontend/
├── tsconfig.json
├── package.json                  ← scripts: dev (tsx server.ts), build, start
├── types.ts                      ← Shared TypeScript interfaces (AuthResponse, etc.)
├── .env.local                    ← GEMINI_API_KEY, VITE_GOOGLE_CLIENT_ID, FLASK_BACKEND_URL
│
├── src/
│   ├── main.tsx                  ← React root
│   ├── routeTree.gen.ts          ← Auto-generated route tree (do not edit)
│   └── routes/                  ← File-based routes (TanStack Router)
│       ├── __root.tsx
│       ├── sign-in.tsx
│       ├── sign-up.tsx
│       ├── signout.tsx
│       ├── help.tsx
│       └── _authenticated/
│           ├── route.tsx         ← Auth guard
│           ├── index.tsx         ← Dashboard
│           ├── accounts/index.tsx
│           ├── transactions/index.tsx
│           ├── categories/index.tsx
│           ├── budgets/index.tsx
│           ├── analytics/index.tsx
│           └── settings/
│               ├── index.tsx
│               └── notifications.tsx
│
├── api/                          ← API client functions (fetch wrappers)
│   ├── auth.ts                   ← register, login, googleAuth, getMe, logout
│   ├── dashboard.ts              ← getAccounts, getTransactions, getBudgets (used by useDashboard)
│   ├── accounts.ts               ← CRUD for /api/accounts
│   ├── transactions.ts           ← CRUD for /api/transactions
│   ├── categories.ts             ← CRUD for /api/categories
│   ├── budgets.ts                ← CRUD for /api/budgets
│   └── analytics.ts              ← calls /api/analytics/* (⚠️ see API mismatches below)
│
├── hooks/                        ← TanStack Query hooks wrapping api/ calls
│   ├── useDashboard.ts
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   ├── useCategories.ts
│   ├── useBudgets.ts
│   ├── useAnalytics.ts
│   ├── use-dialog-state.tsx
│   ├── use-mobile.tsx
│   └── use-table-url-state.ts
│
├── components/
│   ├── layout/                   ← App shell: sidebar, header, authenticated-layout
│   │   ├── authenticated-layout.tsx
│   │   ├── app-sidebar.tsx       ← Uses useAuth() to show real user name
│   │   ├── nav-user.tsx
│   │   ├── nav-group.tsx
│   │   ├── team-switcher.tsx
│   │   └── data/sidebar-data.ts  ← Nav link definitions
│   ├── ui/                       ← shadcn/ui components (button, dialog, table, etc.)
│   ├── auth/
│   │   ├── LoginForm.tsx         ← Used by /sign-in route
│   │   └── RegisterForm.tsx      ← Used by /sign-up route
│   ├── dashboard/                ← MetricCard, BudgetCard, AccountCard, TransactionListItem, QuickActions
│   ├── accounts/                 ← AccountCard, AddModal, EditModal, DeleteDialog
│   ├── transactions/             ← TransactionTable, FilterPanel, AddModal, EditModal, DeleteDialog, DetailsView, Pagination
│   ├── categories/               ← CategoryCard, AddModal, EditModal, DeleteDialog
│   ├── budgets/                  ← BudgetCard, AddModal, EditModal, DeleteDialog
│   ├── analytics/                ← AnalyticsOverview, SpendingByCategory, IncomeVsExpense, MonthlyTrends
│   ├── AnimatedIcon.tsx
│   ├── FinanceIcons.tsx
│   ├── command-menu.tsx
│   ├── confirm-dialog.tsx
│   ├── navigation-progress.tsx
│   ├── profile-dropdown.tsx
│   ├── sign-out-dialog.tsx
│   ├── skip-to-main.tsx
│   └── theme-switch.tsx
│
├── contexts/
│   └── AuthContext.tsx            ← Auth state: token + user + login/logout + localStorage + /api/auth/me verify
│
├── context/                       ← UI providers from shadcn-admin template
│   ├── theme-provider.tsx
│   ├── font-provider.tsx
│   ├── direction-provider.tsx
│   ├── layout-provider.tsx
│   └── search-provider.tsx
│
├── lib/
│   ├── utils.ts                   ← cn() helper
│   ├── cookies.ts
│   └── handle-server-error.ts
│
├── config/
│   └── fonts.ts
│
├── styles/
│   ├── index.css                  ← Main CSS (Tailwind v4 + shadcn tokens)
│   └── theme.css
│
└── assets/
    └── logo.tsx
```

---

## 4. Backend REST API (Flask — port 5000)

All endpoints under `/api/`. JSON in, JSON out. All routes **except `/api/auth/*`** require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, username, password}` | `{access_token, user_id}` 201 |
| POST | `/api/auth/login` | `{email, password}` | `{access_token, user_id, email, username}` 200 |
| POST | `/api/auth/google` | `{id_token}` | `{access_token, user_id, email, name}` 200 |
| GET | `/api/auth/me` | — | `{user_id, username, email}` 200 |
| POST | `/api/auth/logout` | — | `{message}` 200 |

### Transactions
| Method | Path | Returns |
|---|---|---|
| GET | `/api/transactions` | `Transaction[]` (user-scoped, `is_deleted=0`, sorted DESC) |
| POST | `/api/transactions` | `{message, transaction_id}` 201 |
| DELETE | `/api/transactions/:id` | `{message}` 200 — soft delete |

**POST body:** `{transaction_date, account_id, category_id, amount, type, note?, payee_id?, splits?[]}`

**⚠️ No PUT /api/transactions/:id** — update is not implemented in Flask.

### Accounts
| Method | Path | Returns |
|---|---|---|
| GET | `/api/accounts` | `Account_Dim[]` |
| POST | `/api/accounts` | `{account_id}` 201 |

**⚠️ No PUT or DELETE /api/accounts/:id** — not implemented.

### Categories
| Method | Path | Returns |
|---|---|---|
| GET | `/api/categories` | `Category_Dim[]` (with budget merged from current month) |
| PUT | `/api/categories/<category_id>` | `{message}` 200 — updates budget only |

**⚠️ No POST or DELETE /api/categories** — categories are seeded per user at registration.

### Budgets
| Method | Path | Returns |
|---|---|---|
| GET | `/api/budgets` | `budgets[]` (optional `?month=YYYY-MM`) |
| PUT | `/api/budgets/<category_id>` | `{budget_id}` 200 |
| DELETE | `/api/budgets/<category_id>` | `{message}` 200 |

### Payees
| Method | Path | Returns |
|---|---|---|
| GET | `/api/payees` | `payees[]` |
| POST | `/api/payees` | `{payee_id, payee_name}` 201 |
| PUT | `/api/payees/<payee_id>` | `{message}` 200 |
| DELETE | `/api/payees/<payee_id>` | `{message}` 200 |

### Recurring Transactions
| Method | Path | Returns |
|---|---|---|
| GET | `/api/recurring` | `recurring_transactions[]` |
| POST | `/api/recurring` | `{recurring_id}` 201 |
| PUT | `/api/recurring/<recurring_id>` | `{message}` 200 |
| DELETE | `/api/recurring/<recurring_id>` | `{message}` 200 |
| PATCH | `/api/recurring/<recurring_id>/toggle` | `{is_active}` 200 |
| POST | `/api/recurring/process` | `{generated}` 200 |

### Analytics
| Method | Path | Returns |
|---|---|---|
| POST | `/api/sql-query` | `{headers: string[], rows: any[][]}` — SELECT only, blocks `users` table |

**⚠️ No `/api/analytics/overview`, `/api/analytics/spending-by-category`, etc.** — these don't exist. The `api/analytics.ts` frontend file calls non-existent endpoints and needs to be rewritten to use `POST /api/sql-query` instead.

---

## 5. API Mismatches (Frontend calls endpoints that don't exist in Flask)

These need to be fixed — either add the endpoints to Flask or rewrite the frontend api files:

| Frontend call | Flask reality | Action needed |
|---|---|---|
| `GET /api/analytics/overview` | ❌ Doesn't exist | Rewrite using `POST /api/sql-query` |
| `GET /api/analytics/spending-by-category` | ❌ Doesn't exist | Rewrite using `POST /api/sql-query` |
| `GET /api/analytics/income-vs-expense` | ❌ Doesn't exist | Rewrite using `POST /api/sql-query` |
| `GET /api/analytics/monthly-trends` | ❌ Doesn't exist | Rewrite using `POST /api/sql-query` |
| `PUT /api/transactions/:id` | ❌ Doesn't exist | Add to Flask or remove Edit from UI |
| `POST /api/categories` | ❌ Doesn't exist | Remove from frontend |
| `DELETE /api/categories/:id` | ❌ Doesn't exist | Remove from frontend |
| `PUT /api/accounts/:id` | ❌ Doesn't exist | Add to Flask or remove Edit from UI |
| `DELETE /api/accounts/:id` | ❌ Doesn't exist | Add to Flask or remove Delete from UI |

---

## 6. Missing Features (not yet in new app)

| Feature | Old App | New App |
|---|---|---|
| AI Voice/Text Parser | ✅ Full UI with microphone, chat history, Gemini integration | ❌ Missing entirely |
| Payees management | ✅ Inline in old app | ❌ No route, no hook, no api file |
| Recurring transactions | ✅ Full CRUD + process | ❌ No route, no hook, no api file |
| SQL Analytics console | ✅ Direct SQL query UI | ❌ Missing |
| Split transactions | ✅ In manual entry modal | ❌ Not in new transaction modal |

---

## 7. Database Schema (Star Schema — Multi-User)

```sql
users (user_id, username, email, password_hash, google_sub, created_at, is_deleted)
user_settings (setting_id, user_id, currency, language, timezone)
Account_Dim (account_id INTEGER PK AUTOINCREMENT, user_id, account_name, account_type, initial_balance)
Category_Dim (category_id INTEGER PK AUTOINCREMENT, user_id, category_name, category_type, budget)
Transaction_Fact (transaction_id TEXT PK, user_id, transaction_date, account_id, category_id,
                  amount INTEGER, type TEXT, note TEXT, payee_id, is_deleted)
split_transactions (split_id, transaction_id, category_id INTEGER, amount, note)
budgets (budget_id, user_id, category_id INTEGER, month TEXT 'YYYY-MM', amount_limit, UNIQUE(user_id, category_id, month))
payees (payee_id, user_id, payee_name, default_category_id INTEGER, UNIQUE(user_id, payee_name))
recurring_transactions (recurring_id, user_id, account_id INTEGER, category_id INTEGER, payee_id,
                        amount, type, note, frequency, next_run_date, end_date, is_active)
schema_migrations (migration_name, applied_at)
```

**Key rules:**
- All amounts are **positive integers in VND**. Direction is encoded in `type` ('income'|'expense'|'investment')
- `transaction_date` format: `'YYYY-MM-DD HH:MM:SS'`
- `transaction_id` format: `'tx-{timestamp_ms}'` or `'tx-{timestamp_ms}-r{recurring_id}'`
- Soft delete: `is_deleted=1` on Transaction_Fact. All GETs filter `WHERE is_deleted = 0`
- `category_id = 'split'` is a sentinel value for split transactions (stored as TEXT in Transaction_Fact)
- Per-user default categories seeded on registration: Ăn uống, Tiền lương, Đầu tư chứng khoán, Di chuyển, Mua sắm, Giải trí, Học tập, Sức khỏe, Khác

---

## 8. Environment Variables

**`backend/.env`:**
```
TURSO_DB_URL=https://...
TURSO_AUTH_TOKEN=...
AUTH_SECRET_KEY=...
AUTH_TOKEN_EXPIRE_DAYS=1
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**`frontend/.env.local`:**
```
GEMINI_API_KEY=...
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
FLASK_BACKEND_URL=http://localhost:5000    ← server-side only (used by server.ts)
```

---

## 9. Key Constraints

1. **`npm run dev`** runs `tsx server.ts` — Express serves Vite middleware. Do NOT run `vite` directly.
2. **Gemini is server-side only** — called in `server.ts`, never from browser code.
3. **`@/` alias** resolves to `frontend/` (root of frontend folder), not `frontend/src/`.
4. **`routeTree.gen.ts`** is auto-generated by TanStack Router plugin on dev server start — do not edit.
5. **Auth** uses `contexts/AuthContext.tsx` everywhere. The old `stores/auth-store.ts` has been deleted.
6. **Analytics** page currently errors because it calls non-existent Flask endpoints.
7. **Vite proxy** in `vite.config.ts` only applies when running Vite standalone (not normal). Normal dev uses Express proxy in `server.ts` (`app.all("/api/*path")`).
8. **Express 5** wildcard syntax is `/api/*path` (named), not `/api/*`.
