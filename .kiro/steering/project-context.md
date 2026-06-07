# Finance Management by Voicer — Project Context Bundle

> Auto-loaded context for AI coding agents. Provides architecture, data model, API contracts, and conventions in a single reference.

---

## 1. Project Overview

**Finance Management by Voicer** is a Vietnamese personal finance tracker with AI-powered voice/text transaction parsing and multi-user authentication with full data isolation.

| Layer | Tech | Entry Point |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4, Lucide, `@google/genai`, `@react-oauth/google` | `frontend/index.tsx` |
| BFF Server | Express 5 (TypeScript) + Gemini 3.1 Flash Lite API | `frontend/server.ts` |
| Backend API | Python Flask + Flask-CORS | `backend/main.py` (port 5000) |
| Database | Turso (libSQL / SQLite-compatible, cloud) | `backend/database.py` |
| Auth | JWT (python-jose) + bcrypt (rounds=12) + Google OAuth (`google-auth`) | `backend/auth/` |
| AI | Google Gemini 2.0 Flash (via `@google/genai`) | server-side only |

**Core flow:** User logs in → speaks/types Vietnamese → Express BFF calls Gemini to parse → saves to Turso via Flask REST (JWT-authenticated, user-scoped) → React reads back.

---

## 2. Database Schema (Star Schema — Multi-User)

```sql
-- Users (authentication)
users (
  user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT,                     -- nullable (Google-only users)
  google_sub    TEXT UNIQUE,              -- nullable (email/password users)
  created_at    TEXT NOT NULL,
  is_deleted    INTEGER NOT NULL DEFAULT 0
  -- CHECK: at least one of username, email, google_sub is NOT NULL
)

-- User Settings
user_settings (
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users,
  currency   TEXT DEFAULT 'VND',
  language   TEXT DEFAULT 'vi',
  timezone   TEXT DEFAULT 'Asia/Ho_Chi_Minh'
)

-- Dimension: Accounts
Account_Dim (
  account_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users,  -- data isolation
  account_name    TEXT NOT NULL,
  account_type    TEXT NOT NULL,       -- 'E-Wallet' | 'Bank' | 'Investment' | 'Cash'
  initial_balance INTEGER NOT NULL DEFAULT 0
)

-- Dimension: Categories
Category_Dim (
  category_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users,  -- data isolation
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL,        -- 'expense' | 'income' | 'investment'
  budget        INTEGER NOT NULL DEFAULT 0
)

-- Fact: Transactions
Transaction_Fact (
  transaction_id   TEXT PRIMARY KEY,  -- format: 'tx-{timestamp_ms}' or 'tx-{timestamp_ms}-r{recurring_id}'
  user_id          INTEGER NOT NULL REFERENCES users,  -- data isolation
  transaction_date TEXT NOT NULL,     -- format: 'YYYY-MM-DD HH:MM:SS'
  account_id       INTEGER NOT NULL REFERENCES Account_Dim,
  category_id      INTEGER NOT NULL REFERENCES Category_Dim,
  amount           INTEGER NOT NULL,  -- absolute positive value in VND
  type             TEXT NOT NULL,     -- 'income' | 'expense' | 'investment'
  note             TEXT,
  payee_id         INTEGER REFERENCES payees(payee_id),
  is_deleted       INTEGER NOT NULL DEFAULT 0  -- soft delete
)

-- Split Transactions (for multi-category transactions)
split_transactions (
  split_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL REFERENCES Transaction_Fact(transaction_id),
  category_id    INTEGER NOT NULL REFERENCES Category_Dim(category_id),
  amount         INTEGER NOT NULL,
  note           TEXT
)

-- Budgets (monthly per-category limits)
budgets (
  budget_id    INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users,
  category_id  INTEGER NOT NULL REFERENCES Category_Dim(category_id),
  month        TEXT NOT NULL,        -- format: 'YYYY-MM'
  amount_limit INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, category_id, month)
)

-- Payees (merchants/contacts)
payees (
  payee_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users,
  payee_name          TEXT NOT NULL,
  default_category_id INTEGER REFERENCES Category_Dim(category_id),
  UNIQUE (user_id, payee_name)
)

-- Recurring Transactions
recurring_transactions (
  recurring_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users,
  account_id    INTEGER NOT NULL REFERENCES Account_Dim(account_id),
  category_id   INTEGER NOT NULL REFERENCES Category_Dim(category_id),
  payee_id      INTEGER REFERENCES payees(payee_id),
  amount        INTEGER NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense', 'investment')),
  note          TEXT,
  frequency     TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_run_date TEXT NOT NULL,        -- format: 'YYYY-MM-DD'
  end_date      TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1
)

-- Schema Migration Tracker
schema_migrations (
  migration_name TEXT PRIMARY KEY,
  applied_at     TEXT NOT NULL DEFAULT (datetime('now'))
)
```

**System user:** `user_id=1` owns all pre-migration data (seeded on first startup).

**Per-user default categories** (seeded on registration): Ăn uống, Tiền lương, Đầu tư chứng khoán, Di chuyển, Mua sắm, Giải trí, Học tập, Sức khỏe, Khác. Category IDs are auto-incremented INTEGERs per user.

**Seeded accounts** (system user only): momo (5M), vcb (45M), vps (200M), cash (2M) VND. New users must create their own accounts.

---

## 3. Backend REST API (Flask — port 5000)

All endpoints under `/api/`. JSON in, JSON out. All routes **except `/api/auth/*`** require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/auth/register` | `{email, username, password}` | `{access_token, user_id}` 201 |
| POST | `/api/auth/login` | `{email, password}` | `{access_token, user_id, email}` 200 |
| POST | `/api/auth/google` | `{id_token}` | `{access_token, user_id, email, name}` 200 |
| GET | `/api/auth/me` | — | `{user_id, username, email}` 200 |
| POST | `/api/auth/logout` | — | `{message}` 200 |

### Transactions
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/transactions` | — | `Transaction[]` (user-scoped, `is_deleted=0`, sorted by date DESC) |
| POST | `/api/transactions` | `{transaction_date, account_id, category_id, amount, type, note}` | `{message, transaction_id}` 201 |
| DELETE | `/api/transactions/:id` | — | `{message}` 200 — soft delete (sets `is_deleted=1`) |

**POST required fields:** `transaction_date`, `account_id`, `category_id`, `amount`, `type`. Optional: `note`, `payee_id`, `splits[]` (for multi-category transactions). If `splits` provided, `category_id` is set to sentinel 'split' and amounts must sum to total.

### Accounts
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/accounts` | — | `Account_Dim[]` (user-scoped, sorted by account_id) |
| POST | `/api/accounts` | `{account_name, account_type, initial_balance}` | `{account_id}` 201 — auto-creates if name doesn't exist |

### Categories
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/categories` | — | `Category_Dim[]` (user-scoped, sorted by category_id, budget merged from current month) |
| PUT | `/api/categories/<category_id>` | `{budget: number}` | `{message}` 200 — updates both Category_Dim.budget and budgets table for current month |

### Budgets
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/budgets` | — | `budgets[]` (user-scoped, optional `?month=YYYY-MM`) |
| PUT | `/api/budgets/<category_id>` | `{amount_limit, month?}` | `{budget_id}` 200 |
| DELETE | `/api/budgets/<category_id>` | — | `{message}` 200 (optional `?month=YYYY-MM`) |

### Payees
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/payees` | — | `payees[]` (user-scoped) |
| POST | `/api/payees` | `{payee_name, default_category_id?}` | `{payee_id, payee_name}` 201 |
| PUT | `/api/payees/<payee_id>` | `{payee_name?, default_category_id?}` | `{message}` 200 |
| DELETE | `/api/payees/<payee_id>` | — | `{message}` 200 |

### Recurring Transactions
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/recurring` | — | `recurring_transactions[]` (user-scoped) |
| POST | `/api/recurring` | `{account_id, category_id, amount, type, frequency, next_run_date, note?, end_date?, payee_id?}` | `{recurring_id}` 201 |
| PUT | `/api/recurring/<recurring_id>` | partial update fields | `{message}` 200 |
| DELETE | `/api/recurring/<recurring_id>` | — | `{message}` 200 |
| PATCH | `/api/recurring/<recurring_id>/toggle` | — | `{is_active}` 200 |
| POST | `/api/recurring/process` | — | `{generated}` 200 — generates due transactions |

### Analytics (SQL Passthrough)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/sql-query` | `{query: string}` | `{headers: string[], rows: any[][]}` |

**Security:** Only SELECT statements accepted. Non-SELECT returns 400.

---

## 4. Frontend Server BFF (Express — port 3000)

### `/api/parse-transaction` POST
- **Input:** `{ prompt: string, localTime: string }` (localTime format: `YYYY-MM-DD HH:MM:SS`)
- **Flow:** Calls Gemini 3.1 Flash Lite with a Vietnamese finance system prompt → fetches user's accounts, categories, and payees → maps names to IDs → auto-creates new accounts/payees if needed → POSTs to Flask `http://localhost:5000/api/transactions`
- **Output:** `{ valid, rejection_reason, amount, type, category, account, account_is_new, note, transaction_date, payee_name }` (human-readable names, not IDs)

### `/api/auth/*` (proxy to Flask)
All auth routes are proxied from Express to Flask unchanged, passing through the `Authorization` header from the browser.

**Token forwarding:** For all Flask calls (transactions, accounts, categories, analytics), `server.ts` extracts `req.headers.authorization` and forwards it as-is.

**Important:** Gemini is called **server-side only** (in `server.ts`). Never call `@google/genai` from `index.tsx`.

---

## 5. Frontend TypeScript Types (`frontend/types.ts`)

```typescript
interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email?: string;
  name?: string;
  username?: string;
}

interface AuthUser {
  id: number;
  email: string;
  name: string;
}

interface Account {
  account_id: number;
  account_name: string;
  initial_balance: number;
  current_balance: number;   // computed client-side via computeBalances()
}

interface Category {
  category_id: number;
  category_name: string;
  budget: number;
}

interface SplitItem {
  split_id?: number;
  category_id: number;
  amount: number;
  note?: string;
}

interface Transaction {
  transaction_id: string;
  transaction_date: string;  // 'YYYY-MM-DD HH:MM:SS'
  account_id: number;
  category_id: number;
  amount: number;            // always positive integer VND
  type: 'income' | 'expense' | 'investment';
  note: string;
  payee_id?: number | null;
  splits?: SplitItem[];
  is_deleted?: number;       // 0 or 1 — filtered to 0 by API
}

interface Budget {
  budget_id: number;
  category_id: number;
  month: string;             // 'YYYY-MM'
  amount_limit: number;
}

interface Payee {
  payee_id: number;
  payee_name: string;
  default_category_id: number | null;
}

interface RecurringTransaction {
  recurring_id: number;
  account_id: number;
  category_id: number;
  payee_id: number | null;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  note: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;     // 'YYYY-MM-DD'
  end_date: string | null;
  is_active: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  parsedTransaction?: { amount, type, category, account, account_is_new, note, transaction_date, payee_name };
  sqlCommand?: string;
}

interface AnalyticsResult {
  headers: string[];
  rows: any[][];
  description?: string;
  type: 'group_by' | 'budget_alert' | 'window_function' | 'custom';
}
```

---

## 6. Frontend Utility Functions (`frontend/utils.ts`)

| Function | Purpose |
|---|---|
| `formatCurrency(amount)` | Formats VND using `Intl.NumberFormat('vi-VN')` |
| `computeBalances(accounts, transactions)` | Derives `current_balance` for each account from initial_balance + transaction history |
| `evaluateSQLQuery(query, state)` | Client-side SQL simulator for demo/offline mode. Supports `SELECT *`, `GROUP BY`, window functions, `LEFT JOIN` budget patterns |
| `initialAccounts / initialCategories / initialTransactions` | Seed data for offline/fallback mode |

**Balance rules in `computeBalances`:**
- `income` → adds to account balance
- `expense` → subtracts from account balance
- `investment` → subtracts from account balance (treated as transfer out)

---

## 7. Design System (`DesignUI.css` + Tailwind v4)

The project uses a **Glassmorphism** design system. Always use CSS variables and utility classes from `DesignUI.css`. Do NOT invent inline styles.

**Key CSS variables:**
```css
--celadon: #74d3ae         /* primary brand teal */
--sage-green: #678d58      /* secondary brand green */
--peach-fuzz: #dd9787      /* accent / CTA color */
--champagne-mist: #f6e7cb  /* light surface */
--deep-twilight: #1a2e1a   /* dark background */

--blur-sm / --blur-md / --blur-lg / --blur-xl
--shadow-glass / --shadow-glass-lg / --shadow-accent / --shadow-blue
--radius-sm(6px) / --radius-md(12px) / --radius-lg(18px) / --radius-xl(24px)
--status-success / --status-error / --status-warning
```

**Key utility classes:** `.glass`, `.glass-sm`, `.glass-lg`, `.glass-blue`, `.glass-accent`, `.glass-success`, `.glass-error`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-blue`, `.input`, `.card`, `.badge`, `.badge-accent`, `.badge-blue`, `.badge-success`, `.badge-error`, `.divider`, `.glass-scroll`

The main app (`index.tsx`) uses **Tailwind v4 utility classes** (zinc palette, emerald, rose, sky, amber) for most inline styling — the DesignUI classes are the official design token layer.

---

## 8. File Map

```
FinanceManagementByVoicer/
├── .clinerules.md              # Agent behavioral rules (read BEFORE coding)
├── CLAUDE.md                   # LLM coding behavioral guidelines
├── README.md                   # Project setup & API reference
├── DesignUI.css                # Global design system — CSS variables + utility classes
├── .kiro/steering/
│   ├── coding-guidelines.md    # Auto-loaded coding rules
│   └── project-context.md      # ← THIS FILE (auto-loaded project context)
├── .kiro/specs/
│   └── multi-user-auth-isolation/
│       ├── requirements.md     # Full auth requirements spec
│       ├── design.md           # Auth architecture design
│       ├── tasks.md            # Implementation task list
│       └── IMPLEMENTATION_STATUS.md  # Current progress tracker
│
├── backend/
│   ├── main.py                 # Flask app factory + startup (port 5000)
│   ├── database.py             # Turso connection, table creation, seeding, migrations (multi-user schema)
│   ├── config.py               # Loads env vars (TURSO, AUTH_SECRET_KEY, GOOGLE_CLIENT_ID)
│   ├── requirements.txt        # Flask, Flask-Cors, python-dotenv, libsql-client, python-jose, bcrypt, google-auth
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── router.py           # Blueprint: /api/auth/register, login, google, me, logout
│   │   ├── auth_service.py     # Business logic: register, login, google_auth
│   │   ├── jwt_utils.py        # JWT create/verify + @require_auth decorator
│   │   ├── db.py               # User DB ops (find_by_email, find_by_google_sub, create_user)
│   │   └── password_hasher.py  # bcrypt hash/verify (rounds=12)
│   └── routes/
│       ├── transactions.py     # GET/POST/DELETE /api/transactions (auth + user-scoped + soft delete + splits)
│       ├── accounts.py         # GET/POST /api/accounts (auth + user-scoped)
│       ├── categories.py       # GET/PUT /api/categories (auth + user-scoped + budget merge)
│       ├── budgets.py          # GET/PUT/DELETE /api/budgets (auth + user-scoped + monthly)
│       ├── payees.py           # GET/POST/PUT/DELETE /api/payees (auth + user-scoped)
│       ├── recurring.py        # GET/POST/PUT/DELETE/PATCH /api/recurring (auth + user-scoped + process)
│       └── analytics.py        # POST /api/sql-query (auth, SELECT only)
│
├── database/
│   ├── schema.sql              # DDL reference (basic tables only - migrations add columns)
│   └── analytics.sql           # Sample SQL queries (basic → advanced)
│
└── frontend/
    ├── index.tsx               # Main React app — all UI, state, event handlers
    ├── server.ts               # Express BFF: auth proxy + /api/parse-transaction + Vite middleware
    ├── types.ts                # TypeScript interfaces (incl. AuthResponse, AuthUser)
    ├── utils.ts                # formatCurrency, computeBalances, evaluateSQLQuery, seeds
    ├── constants.ts            # UI placeholder strings
    ├── index.css               # Tailwind v4 import
    ├── index.html              # HTML shell
    ├── vite.config.ts          # Vite + React + Tailwind plugins
    ├── tsconfig.json
    ├── package.json            # Scripts: dev (tsx server.ts), build, start
    ├── api/
    │   └── auth.ts             # Auth API client (register, login, googleAuth, getMe, logout)
    ├── contexts/
    │   └── AuthContext.tsx     # Auth state: token + user + login/logout + localStorage persistence
    └── components/
        ├── auth/
        │   ├── AuthPage.tsx    # Login/register page shell (GoogleOAuthProvider wrapper)
        │   ├── LoginForm.tsx   # Email+password + Google login
        │   └── RegisterForm.tsx # Registration form
        ├── ArtifactCard.tsx
        ├── DottedGlowBackground.tsx
        ├── Icons.tsx
        └── SideDrawer.tsx
```

---

## 9. Environment Variables

**`backend/.env`** (never commit secrets):
```
TURSO_DB_URL=https://...          # must use https:// not libsql://
TURSO_AUTH_TOKEN=...
AUTH_SECRET_KEY=...               # random 32-char string for JWT signing
AUTH_TOKEN_EXPIRE_DAYS=1          # JWT TTL (default: 1 day)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # optional, enables Google OAuth
```

**`frontend/.env.local`** (never commit):
```
GEMINI_API_KEY=...
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com  # optional, enables Google sign-in button
FLASK_BACKEND_URL=http://localhost:5000               # optional, defaults to localhost:5000
```

---

## 10. Dev Commands

```bash
# Backend (Python)
cd backend
python main.py         # starts Flask on port 5000, auto-initializes DB

# Frontend (Node)
cd frontend
npm run dev            # starts Express+Vite on port 3000 (tsx server.ts)
npm run build          # Vite build + esbuild server bundle
npm start              # production (node dist/server.cjs)
```

---

## 11. Vietnamese Finance Slang (for AI prompt context)

| Slang | Value |
|---|---|
| k / kđ / ngàn / nghìn | × 1,000 (e.g., 50k = 50,000) |
| loét / lít / xị | 100,000 VND |
| củ | 1,000,000 VND (e.g., 3 củ = 3,000,000) |
| nửa củ | 500,000 VND |
| tỏi | 1,000,000,000 VND |

Transaction `type` classification:
- `income`: lương, thưởng, nhận tiền, lãi
- `expense`: ăn, mua, đi, trả, sắm, giải trí, học, thuốc
- `investment`: đầu tư, chứng khoán, nạp VPS, mua cổ phiếu, tiết kiệm

---

## 12. Key Constraints & Gotchas

1. **Amounts are always positive integers (VND).** The `type` field encodes direction — never store negative amounts.
2. **`transaction_id` format:** `tx-{Date.now()}` (millisecond timestamp) for manual transactions, or `tx-{timestamp}-r{recurring_id}` for recurring-generated transactions.
3. **`transaction_date` format:** `YYYY-MM-DD HH:MM:SS`. Always use this format for DB writes and AI output.
4. **Offline fallback:** Frontend has seed data in `utils.ts` and falls back gracefully if Flask is unreachable.
5. **SQL passthrough endpoint** (`/api/sql-query`) only accepts SELECT — enforce this on both client and server.
6. **Gemini is server-side only.** API key must stay in `frontend/.env.local`, consumed only by `server.ts`.
7. **Balance computation is client-side.** `Account_Dim` only stores `initial_balance`. `current_balance` is computed in `computeBalances()` in `utils.ts`.
8. **DO NOT use `DesignUI.css`** — its utility classes (`.flex`, `.grid`, `.items-center`, etc.) conflict with Tailwind v4 responsive variants (`lg:grid-cols-12`, `lg:col-span-*`) and break the main app layout. Use only Tailwind v4 utility classes for all styling. The `DesignUI.css` file exists for reference only and must never be imported.
9. **The frontend is a single-file SPA** (`index.tsx` ~700+ lines). All state lives in the `App` component.
10. **Turso connection:** Use `https://` URL prefix (not `libsql://`) in `TURSO_DB_URL` — the `libsql-client` Python package requires HTTP mode for AWS regions.
11. **Auth token flow:** Browser stores JWT in `localStorage` (`finance_auth_token`). `AuthContext.tsx` exposes `token` + `login/logout`. `index.tsx` attaches `Authorization: Bearer <token>` to all API calls. `server.ts` forwards the header to Flask unchanged.
12. **Data isolation:** All Flask routes use `@require_auth` decorator which sets `g.user_id`. Every query filters by `user_id = g.user_id`. A user cannot access another user's data (returns 404, not 403).
13. **Soft delete:** `DELETE /api/transactions/:id` sets `is_deleted=1`, never physically removes the row. All GET queries filter `WHERE is_deleted = 0`.
14. **Category and Account IDs are INTEGERs** (auto-incremented), not TEXT. Migrations convert legacy TEXT IDs to INTEGER. Always use the integer IDs from the API responses.
15. **Google OAuth** is optional. If `VITE_GOOGLE_CLIENT_ID` is not set, the Google sign-in button is hidden. If `GOOGLE_CLIENT_ID` is not set in the backend, `/api/auth/google` will fail — configure both or neither.
16. **Split transactions** allow a single transaction to be split across multiple categories. When creating with `splits`, the main `category_id` is set to sentinel 'split' and the actual categories are stored in `split_transactions`.
17. **Payees** are auto-created by the AI parser when it detects a new merchant name. Payees can have a `default_category_id` for auto-categorization.
18. **Recurring transactions** are processed via `POST /api/recurring/process`. This generates actual transactions for all rules where `next_run_date <= today` and `is_active=1`, then advances `next_run_date` based on frequency.
