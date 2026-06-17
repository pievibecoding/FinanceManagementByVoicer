# Finance Management by Voicer — Project Context

> Auto-loaded context for AI coding agents. Accurate as of latest commits.

---

## 1. Project Overview

**Finance Management by Voicer** is a Vietnamese personal finance tracker with AI-powered voice/text transaction parsing and multi-user authentication with full data isolation.

| Layer | Tech | Entry Point |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4, TanStack Router, TanStack Query, shadcn/ui | `frontend/src/main.tsx` |
| BFF Server | Express 5 (TypeScript) + Gemini Flash Lite API | `frontend/server.ts` (port 3000) |
| Backend API | Python Flask + Flask-CORS | `backend/main.py` (port 5000) |
| Database | Turso (libSQL / SQLite-compatible, cloud) | `backend/database.py` |
| Auth | JWT (python-jose) + bcrypt (rounds=12) + Google OAuth | `backend/auth/` |
| AI | Google Gemini `gemini-3.1-flash-lite` (via `@google/genai`) | server-side only in `server.ts` |

**Core flow:** User logs in → speaks/types Vietnamese → Express BFF calls Gemini to parse → saves to Turso via Flask REST (JWT-authenticated, user-scoped) → React reads back via TanStack Query.

**Dev command:** `cd frontend && npm run dev` → runs `tsx --env-file=.env.local server.ts` (Express port 3000 with Vite middleware). Do NOT run `vite` directly.

**Production (Render):** `npm run build` → Vite build + esbuild `server.ts` → `npm start` → `node dist/server.cjs`.

---

## 2. Frontend Architecture

### Entry point chain
```
frontend/index.html → /src/main.tsx
  └── ThemeProvider / FontProvider / DirectionProvider
  └── QueryClientProvider (staleTime: 10s)
  └── RouterProvider
       └── src/routeTree.gen.ts (auto-generated — DO NOT edit)
       └── src/routes/__root.tsx  (AuthProvider + Toaster)
```

### Route tree
```
/sign-in          → src/routes/sign-in.tsx
/sign-up          → src/routes/sign-up.tsx
/signout          → src/routes/signout.tsx
/help             → src/routes/help.tsx (stub)
/_authenticated   → src/routes/_authenticated/route.tsx (auth guard → redirects to /sign-in if not authenticated)
  /               → src/routes/_authenticated/index.tsx  (Dashboard)
  /accounts       → src/routes/_authenticated/accounts/index.tsx
  /transactions   → src/routes/_authenticated/transactions/index.tsx
  /categories     → src/routes/_authenticated/categories/index.tsx
  /budgets        → src/routes/_authenticated/budgets/index.tsx
  /analytics      → src/routes/_authenticated/analytics/index.tsx  ⚠️ broken (calls non-existent endpoints)
  /debts          → src/routes/_authenticated/debts/index.tsx
  /savings        → src/routes/_authenticated/savings/index.tsx
  /settings       → src/routes/_authenticated/settings/index.tsx (core profile/account/billing UI)
```

### Auth flow
- `contexts/AuthContext.tsx` — React Context, single source of truth for auth state
- Token stored in `localStorage` under key `finance_auth_token`
- On mount: verifies token with `GET /api/auth/me`, clears if expired
- `__root.tsx` wraps the whole app in `<AuthProvider>`
- `_authenticated/route.tsx` checks `isAuthenticated`, redirects to `/sign-in` if false
- **No Zustand auth store** — `stores/auth-store.ts` was deleted. Use `useAuth()` from `contexts/AuthContext.tsx` everywhere.

### API proxy
All `/api/*` browser requests → Express BFF (port 3000) → Flask (port 5000).
- Express `app.all("/api/*path")` catches all non-specific routes and proxies to Flask
- **Express 5 wildcard syntax:** `/api/*path` (named), NOT `/api/*`
- File extension bypass: requests ending in `.ts`, `.tsx`, `.js` etc. skip proxy → served by Vite
- DELETE requests: no body sent (avoids Flask rejection)
- Auth header forwarded as-is from browser to Flask

---

## 3. Frontend File Map

```
frontend/
├── index.html                    ← HTML shell → src/main.tsx
├── server.ts                     ← Express BFF: auth proxy + /api/parse-transaction + Vite middleware
├── vite.config.ts                ← TanStack Router plugin, Tailwind, path alias @/ → frontend/
├── tsconfig.json
├── package.json                  ← scripts: dev (tsx server.ts), build, start
├── types.ts                      ← AuthResponse interface (used by api/auth.ts)
├── .env.local                    ← GEMINI_API_KEY, VITE_GOOGLE_CLIENT_ID, FLASK_BACKEND_URL
│
├── src/
│   ├── main.tsx                  ← React root, QueryClient, ThemeProvider, RouterProvider
│   ├── routeTree.gen.ts          ← Auto-generated (DO NOT EDIT)
│   └── routes/
│       ├── __root.tsx            ← Root layout: AuthProvider + Toaster + ReactQueryDevtools
│       ├── sign-in.tsx
│       ├── sign-up.tsx
│       ├── signout.tsx
│       ├── help.tsx              ← stub
│       └── _authenticated/
│           ├── route.tsx         ← Auth guard
│           ├── index.tsx         ← Dashboard page
│           ├── accounts/index.tsx
│           ├── transactions/index.tsx  ← client-side filtering, separate detailsOpen state
│           ├── categories/index.tsx
│           ├── budgets/index.tsx
│           ├── analytics/index.tsx     ← ⚠️ calls /api/analytics/* that don't exist in Flask
│           └── settings/
│               ├── index.tsx     ← profile summary, language/theme controls, billing placeholder
│               └── notifications.tsx
│
├── api/                          ← fetch wrappers, all use relative paths (through Express proxy)
│   ├── auth.ts                   ← register, login, googleAuth, getMe, logout
│   ├── dashboard.ts              ← Account/Budget types + getAccounts, getBudgets
│   │                               NOTE: getTransactions was REMOVED — use transactionsApi instead
│   ├── transactions.ts           ← getTransactions, addTransaction, updateTransaction, deleteTransaction
│   ├── accounts.ts               ← getAccounts, addAccount, updateAccount; delete wrapper is not backed
│   ├── categories.ts             ← getCategories, addCategory, updateCategory, deleteCategory
│   ├── budgets.ts                ← getBudgets, upsertBudget, deleteBudget
│   └── analytics.ts             ← ⚠️ calls /api/analytics/* (non-existent endpoints)
│
├── hooks/                        ← TanStack Query hooks
│   ├── useDashboard.ts           ← useDashboardMetrics (uses useAccounts + useTransactions + useBudgets + useDebts + useSavings)
│   │                               totalBalance = Σ acc.current_balance (server-maintained, not recomputed)
│   ├── useTransactions.ts        ← useTransactions (key: ['transactions']), useAddTransaction,
│   │                               useUpdateTransaction, useDeleteTransaction
│   │                               All mutations use refetchType: 'all' for immediate UI update
│   ├── useAccounts.ts            ← useAccounts, useAddAccount, useUpdateAccount (backed ✅),
│   │                               useDeleteAccount (NOT backed ⚠️ — Flask has no DELETE /api/accounts/<id>),
│   │                               useTransferBetweenAccounts (backed ✅ — calls POST /api/accounts/transfer)
│   ├── useCategories.ts          ← useCategories, useAddCategory, useUpdateCategory, useDeleteCategory
│   ├── useBudgets.ts             ← useBudgets, useUpsertBudget, useDeleteBudget
│   ├── useDebts.ts               ← useDebts, useCreateDebt, useUpdateDebt, useDeleteDebt,
│   │                               useDebtPayments, useCreatePayment, useDeletePayment
│   ├── useSavings.ts             ← useSavings, useCreateSavings, useUpdateSavings, useDeleteSavings,
│   │                               useSavingsContributions, useCreateContribution, useDeleteContribution
│   ├── useAnalytics.ts           ← ⚠️ calls non-existent /api/analytics/* Flask endpoints
│   ├── use-dialog-state.tsx
│   ├── use-mobile.tsx
│   └── use-table-url-state.ts
│
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx       ← Uses useAuth() to show real user name/email
│   │   ├── nav-user.tsx
│   │   ├── authenticated-layout.tsx
│   │   └── data/sidebar-data.ts  ← Nav link definitions
│   ├── ui/                       ← shadcn/ui components
│   ├── auth/
│   │   ├── LoginForm.tsx         ← uses res.username ?? res.name for display name
│   │   └── RegisterForm.tsx
│   ├── dashboard/
│   │   ├── MetricCard.tsx
│   │   ├── IncomeExpenseChart.tsx  ← bar chart, 6 time range options (7d/30d/3m/6m/12m/ytd)
│   │   ├── DynamicChart.tsx        ← MetricCard-driven chart surface:
│   │   │                              net worth area, income bar, income/expense bar,
│   │   │                              expense/account/savings donuts, separate debt/loan donuts;
│   │   │                              time-series charts support range, bucket, custom dates, Brush
│   │   ├── AccountsSummary.tsx     ← shows real current_balance computed from transactions
│   │   ├── BudgetOverview.tsx      ← grid progress bars, current month only
│   │   └── AIChatWidget.tsx        ← floating button, continuous mic, editable operation drafts
│   │                                  supports 7 operation_type flows plus legacy draft compatibility
│   │                                  dual-layer inner_transfer fix: server rule-based override +
│   │                                  client-side detectInnerTransferFromText() fallback
│   ├── transactions/
│   │   ├── TransactionTable.tsx    ← shows category name (not ID), receives categories prop
│   │   ├── TransactionDetailsView.tsx ← view-only panel, Edit/Delete buttons
│   │   ├── AddTransactionModal.tsx    ← dropdown for account/category, date+time to Flask format
│   │   ├── EditTransactionModal.tsx   ← dropdown for account/category, preserves original time
│   │   ├── DeleteConfirmationDialog.tsx ← shows error alert on failure
│   │   ├── FilterPanel.tsx            ← search, date range, type filter (all client-side)
│   │   └── Pagination.tsx
│   ├── accounts/
│   ├── categories/
│   ├── budgets/
│   ├── analytics/
│   ├── sign-out-dialog.tsx        ← uses useAuth().logout() (NOT useAuthStore)
│   ├── profile-dropdown.tsx       ← uses useAuth()
│   └── confirm-dialog.tsx
│
├── contexts/
│   └── AuthContext.tsx            ← AuthProvider, useAuth hook, token verify on mount
│
├── context/                       ← UI providers (theme, font, direction, layout, search)
├── lib/                           ← utils.ts (cn helper), cookies.ts, handle-server-error.ts
├── config/                        ← fonts.ts
├── styles/
    ├── index.css                  ← Tailwind v4 + shadcn tokens + body background gradient
    ├── theme.css                  ← CSS variables: brand palette + semantic tokens (--primary, --destructive, etc.)
    └── tokens.ts                  ← JS/TS color tokens — single source of truth for hex used in Recharts/inline styles
```

---

## 4. Key Constraints & Gotchas

1. **Gemini model name** — `"gemini-3.1-flash-lite"` in `server.ts`. **NEVER change this.**
2. **`@/` alias** resolves to `frontend/` root, NOT `frontend/src/`.
3. **`routeTree.gen.ts`** is auto-generated by TanStack Router plugin on dev start — DO NOT edit manually.
4. **No auth store** — `stores/auth-store.ts` was deleted. Use `useAuth()` from `contexts/AuthContext.tsx`.
5. **Single transactions cache** — both dashboard and transactions page use `useTransactions()` with key `['transactions']`. NEVER create a second function fetching `/api/transactions` with a different key.
6. **Transaction filtering is client-side** — `useTransactions()` always fetches all transactions. Page components filter with `useMemo`.
7. **`transaction_date` format** — Flask requires `'YYYY-MM-DD HH:MM:SS'`. HTML `<input type="date">` returns `YYYY-MM-DD` — always append time before sending to Flask.
8. **Edit modal state** — `TransactionDetailsView` and `EditTransactionModal` must NOT be open simultaneously. Close details first (`setDetailsOpen(false)`), then open edit.
9. **Transaction soft delete** — transaction DELETE sets `Transaction_Fact.is_deleted=1` and all transaction GETs filter `WHERE is_deleted = 0`.
10. **Express 5 wildcard** — use `/api/*path` (named wildcard), not `/api/*`.
11. **DELETE proxy** — no `Content-Type` header and no body sent for DELETE requests.
12. **Unbacked account delete wrapper** — `api/accounts.ts` and `hooks/useAccounts.ts` expose `deleteAccount`/`useDeleteAccount` but Flask has no `DELETE /api/accounts/<id>`. Do not wire account delete into UI until backend support exists.
13. **`/api/accounts/transfer`** — Flask endpoint exists (`POST`). Use `accountsApi.transferBetweenAccounts()` / `useTransferBetweenAccounts()`. Creates one `inner_transfer` row and atomically updates both account balances.
14. **`/api/transactions/<id>/transfer`** — Flask `PUT` endpoint exists for editing an existing inner_transfer transaction.
15. **Analytics page** — currently calls `/api/analytics/overview` etc. which **do not exist** in Flask. The only analytics endpoint is `POST /api/sql-query`.
16. **Dashboard chart behavior** — `DynamicChart.tsx` owns chart aggregation and interaction state. Pass raw transactions/accounts/categories/savings/debts unless the component contract changes; keep chart labels/i18n keys in both locale files.
17. **Color system** — two layers:
    - CSS tokens in `styles/theme.css` (`:root {}`) — used via Tailwind utilities (`text-primary`, `bg-destructive`, `border-border`, etc.)
    - JS tokens in `styles/tokens.ts` — hex values used directly in Recharts (`fill`, `stroke`, `dot`) and inline styles. **When changing the color scheme, update BOTH files.**
    - Tailwind arbitrary dynamic values like `` `border-[${hex}]` `` do NOT work at runtime — use `style={{ borderColor: hex }}` instead.
18. **Render health checks** — `/ping`, `/api/ping`, `/health`, and `/api/health` are public and intentionally avoid auth/DB access so Render/UptimeRobot can wake the free service without waiting for Turso or migrations.

---

## 5. Backend REST API (Flask — port 5000)

All endpoints under `/api/`. JSON in, JSON out. All routes **except `/api/auth/*`** require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Returns |
|---|---|---|
| POST | `/api/auth/register` | `{access_token, user_id}` 201 |
| POST | `/api/auth/login` | `{access_token, user_id, email, username}` 200 |
| POST | `/api/auth/google` | `{access_token, user_id, email, name}` 200 |
| GET | `/api/auth/me` | `{user_id, username, email}` 200 |
| POST | `/api/auth/logout` | `{message}` 200 |

### Transactions
| Method | Path | Notes |
|---|---|---|
| GET | `/api/transactions` | user-scoped, `is_deleted=0`, sorted DESC |
| POST | `/api/transactions` | `{transaction_date, account_id, category_id, amount, transaction_type, note?, payee_id?, location?}` |
| PUT | `/api/transactions/<id>` | partial update, allowed fields: `transaction_date, account_id, category_id, amount, type, note, payee_id, location` |
| DELETE | `/api/transactions/<id>` | soft deletes parent (`is_deleted=1`) |

### Accounts
| Method | Path | Notes |
|---|---|---|
| GET | `/api/accounts` | user-scoped |
| POST | `/api/accounts` | `{account_name, account_type, initial_balance, color?}` |
| PUT | `/api/accounts/<id>` | partial metadata update: `account_name, account_type, initial_balance, color` |
| POST | `/api/accounts/transfer` | `{from_account_id, to_account_id, amount, date, note?}` — creates `inner_transfer` row + updates both balances atomically |

**⚠️ No DELETE for accounts.**

### Categories
| Method | Path | Notes |
|---|---|---|
| GET | `/api/categories` | with budget merged from current month |
| POST | `/api/categories` | `{category_name, category_type, icon, color}` |
| PUT | `/api/categories/<id>` | metadata update and/or `{budget}` compatibility update |
| DELETE | `/api/categories/<id>` | deletes only when not referenced by active transactions or budgets |

Categories are seeded per user at registration, but users can add/edit/delete unused categories.

### Budgets
| Method | Path | Notes |
|---|---|---|
| GET | `/api/budgets` | optional `?month=YYYY-MM` |
| PUT | `/api/budgets/<category_id>` | upsert |
| DELETE | `/api/budgets/<category_id>` | optional `?month=YYYY-MM` |

### Payees
| Method | Path |
|---|---|
| GET/POST | `/api/payees` |
| PUT/DELETE | `/api/payees/<id>` |

### Analytics (SQL passthrough)
| Method | Path | Notes |
|---|---|---|
| POST | `/api/sql-query` | SELECT only, blocks `users`/`user_settings`/`schema_migrations` tables |

**⚠️ No `/api/analytics/*` endpoints.** The analytics page currently errors because it calls these.

---

## 6. Database Schema (key facts)

- All amounts: **positive integers in VND**. `Transaction_Fact.transaction_type` is `income`, `expense`, or `inner_transfer`. Debt and savings movements live in their own domain fact tables.
- `transaction_date` format: `'YYYY-MM-DD HH:MM:SS'`
- `transaction_id` format: `'tx-{timestamp_ms}'`
- `is_deleted=1` = soft deleted, never returned by GET
- `Account_Dim.current_balance` — maintained server-side by Flask on every mutation. Frontend reads directly from API, no client-side recomputation needed.
- Per-user default categories seeded at registration: Thiết yếu, Ăn uống, Tiền lương, Di chuyển, Mua sắm, Giải trí, Học tập, Sức khỏe, Khác
- System user `user_id=1` owns old seed data — new users cannot see it

---

## 7. Environment Variables

**`backend/.env`:**
```
TURSO_DB_URL=https://...      (must use https://, database.py converts libsql:// automatically)
TURSO_AUTH_TOKEN=...
AUTH_SECRET_KEY=...
AUTH_TOKEN_EXPIRE_DAYS=1
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**`frontend/.env.local`:**
```
GEMINI_API_KEY=AIza...        (must start with AIza — AQ. format is invalid)
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
FLASK_BACKEND_URL=http://localhost:5000   (server-side only, used by server.ts)
```

---

## 8. Missing Features (not yet implemented in new app)

| Feature | Status |
|---|---|
| Analytics page | ⚠️ Errors — calls non-existent `/api/analytics/*` endpoints |
| Voice/AI chat integration | ✅ `AIChatWidget.tsx` on dashboard (floating button) |
| Debts management | ✅ `/debts` route — full CRUD + payment history |
| Savings goals | ✅ `/savings` route — full CRUD + contribution history |
| Payees management | ⚠️ Backend route exists; no frontend hook or dedicated page |
| Settings page | ✅ Core profile/account/billing UI exists |
| SQL analytics console | ❌ Not in new app |

---

## 9. Deployment (Render)

Defined in `render.yaml`:
- **Backend**: Python service, `python backend/main.py`, env vars set in Render dashboard
- **Frontend**: Node service (`fmbv`), build: `cd frontend && npm install && npm run build`, start: `cd frontend && npm start`
- `FLASK_BACKEND_URL` env var points to backend Render URL
- Render free plan spins down after 15min inactivity — first request may be slow
