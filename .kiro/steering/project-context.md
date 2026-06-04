# Finance Management by Voicer — Project Context Bundle

> Auto-loaded context for AI coding agents. Provides architecture, data model, API contracts, and conventions in a single reference.

---

## 1. Project Overview

**Finance Management by Voicer** is a Vietnamese personal finance tracker with AI-powered voice/text transaction parsing.

| Layer | Tech | Entry Point |
|---|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4, Lucide, `@google/genai` | `frontend/index.tsx` |
| BFF Server | Express 5 (TypeScript) + Gemini 2.0 Flash API | `frontend/server.ts` |
| Backend API | Python Flask + Flask-CORS | `backend/main.py` (port 5000) |
| Database | Turso (libSQL / SQLite-compatible, cloud) | `backend/database.py` |
| AI | Google Gemini 2.0 Flash (via `@google/genai`) | server-side only |

**Core flow:** User speaks/types Vietnamese → Express BFF calls Gemini to parse → saves to Turso via Flask REST → React reads back.

---

## 2. Database Schema (Star Schema)

```sql
-- Dimension: Accounts
Account_Dim (
  account_id      TEXT PRIMARY KEY,   -- 'momo' | 'vcb' | 'vps' | 'cash'
  account_name    TEXT NOT NULL,       -- 'Ví MoMo' | 'Ngân hàng VCB' | 'Tài khoản VPS' | 'Tiền mặt'
  account_type    TEXT NOT NULL,       -- 'E-Wallet' | 'Bank' | 'Investment' | 'Cash'
  initial_balance INTEGER NOT NULL DEFAULT 0
)

-- Dimension: Categories
Category_Dim (
  category_id   TEXT PRIMARY KEY,  -- 'food' | 'salary' | 'investment' | 'transport' | 'shopping' | 'entertainment' | 'study' | 'health' | 'other'
  category_name TEXT NOT NULL,      -- Vietnamese names (e.g., 'Ăn uống', 'Tiền lương')
  category_type TEXT NOT NULL,      -- 'expense' | 'income' | 'investment'
  budget        INTEGER NOT NULL DEFAULT 0  -- monthly budget in VND (0 = no limit)
)

-- Fact: Transactions
Transaction_Fact (
  transaction_id   TEXT PRIMARY KEY,  -- format: 'tx-{timestamp_ms}'
  transaction_date TEXT NOT NULL,     -- format: 'YYYY-MM-DD HH:MM:SS'
  account_id       TEXT NOT NULL REFERENCES Account_Dim,
  category_id      TEXT NOT NULL REFERENCES Category_Dim,
  amount           INTEGER NOT NULL,  -- absolute positive value in VND
  type             TEXT NOT NULL,     -- 'income' | 'expense' | 'investment'
  note             TEXT               -- short Vietnamese description
)
```

**Seeded accounts:** momo (5M), vcb (45M), vps (200M), cash (2M) VND initial balance.

**Seeded categories:** food (4M budget), transport (1.5M), shopping (3M), entertainment (2M), study (2M), health (1M), other (1.5M). salary + investment have budget=0.

---

## 3. Backend REST API (Flask — port 5000)

All endpoints under `/api/`. JSON in, JSON out.

### Transactions
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/transactions` | — | `Transaction[]` sorted by date DESC |
| POST | `/api/transactions` | `{transaction_date, account_id, category_id, amount, type, note}` | `{message, transaction_id}` 201 |
| DELETE | `/api/transactions/:id` | — | `{message}` 200 |

**POST required fields:** `transaction_date`, `account_id`, `category_id`, `amount`, `type`. `note` is optional.

### Accounts
| Method | Path | Returns |
|---|---|---|
| GET | `/api/accounts` | `Account_Dim[]` sorted by account_id |

### Categories
| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/categories` | — | `Category_Dim[]` sorted by category_id |
| PUT | `/api/categories/:id` | `{budget: number}` | `{message}` 200 |

### Analytics (SQL Passthrough)
| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/sql-query` | `{query: string}` | `{headers: string[], rows: any[][]}` |

**Security:** Only SELECT statements accepted. Non-SELECT returns 400.

---

## 4. Frontend Server BFF (Express — port 3000)

### `/api/parse-transaction` POST
- **Input:** `{ prompt: string, localTime: string }` (localTime format: `YYYY-MM-DD HH:MM:SS`)
- **Flow:** Calls Gemini 2.0 Flash with a Vietnamese finance system prompt → maps category/account names to IDs → POSTs to Flask `http://localhost:5000/api/transactions`
- **Output:** `{ amount, type, category, account, note, transaction_date }` (human-readable names, not IDs)

**Important:** Gemini is called **server-side only** (in `server.ts`). Never call `@google/genai` from `index.tsx`.

---

## 5. Frontend TypeScript Types (`frontend/types.ts`)

```typescript
interface Account {
  account_id: string;
  account_name: string;
  initial_balance: number;
  current_balance: number;   // computed client-side via computeBalances()
}

interface Category {
  category_id: string;
  category_name: string;
  budget: number;
}

interface Transaction {
  transaction_id: string;
  transaction_date: string;  // 'YYYY-MM-DD HH:MM:SS'
  account_id: string;
  category_id: string;
  amount: number;            // always positive integer VND
  type: 'income' | 'expense' | 'investment';
  note: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  parsedTransaction?: { amount, type, category, account, note, transaction_date };
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
├── DesignUI.css                # Global design system — CSS variables + utility classes
├── .kiro/steering/
│   ├── coding-guidelines.md    # Auto-loaded coding rules
│   └── project-context.md      # ← THIS FILE (auto-loaded project context)
│
├── backend/
│   ├── main.py                 # Flask app factory + startup (port 5000)
│   ├── database.py             # Turso connection, table creation, seeding
│   ├── config.py               # Loads TURSO_DB_URL + TURSO_AUTH_TOKEN from .env
│   ├── requirements.txt        # Flask, Flask-Cors, python-dotenv, libsql-client
│   └── routes/
│       ├── transactions.py     # GET/POST/DELETE /api/transactions
│       ├── accounts.py         # GET /api/accounts
│       ├── categories.py       # GET/PUT /api/categories
│       └── analytics.py        # POST /api/sql-query (SELECT only)
│
├── database/
│   ├── schema.sql              # DDL reference (3 tables)
│   └── analytics.sql           # Sample SQL queries (basic → advanced)
│
└── frontend/
    ├── index.tsx               # Main React app — all UI, state, event handlers
    ├── server.ts               # Express BFF: /api/parse-transaction + Vite middleware
    ├── types.ts                # TypeScript interfaces
    ├── utils.ts                # formatCurrency, computeBalances, evaluateSQLQuery, seeds
    ├── constants.ts            # UI placeholder strings
    ├── index.css               # Tailwind v4 import
    ├── index.html              # HTML shell
    ├── vite.config.ts          # Vite + React + Tailwind plugins
    ├── tsconfig.json
    ├── package.json            # Scripts: dev (tsx server.ts), build, start
    └── components/             # Shared UI components
        ├── ArtifactCard.tsx
        ├── DottedGlowBackground.tsx
        ├── Icons.tsx
        └── SideDrawer.tsx
```

---

## 9. Environment Variables

**`backend/.env`** (never commit secrets):
```
TURSO_DB_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

**`frontend/.env.local`** (never commit):
```
GEMINI_API_KEY=...
FLASK_BACKEND_URL=http://localhost:5000   # optional, defaults to localhost:5000
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
2. **`transaction_id` format:** `tx-{Date.now()}` (millisecond timestamp). Flask uses this pattern; keep consistent.
3. **`transaction_date` format:** `YYYY-MM-DD HH:MM:SS`. Always use this format for DB writes and AI output.
4. **Offline fallback:** Frontend has seed data in `utils.ts` and falls back gracefully if Flask is unreachable.
5. **SQL passthrough endpoint** (`/api/sql-query`) only accepts SELECT — enforce this on both client and server.
6. **Gemini is server-side only.** API key must stay in `frontend/.env.local`, consumed only by `server.ts`.
7. **Balance computation is client-side.** `Account_Dim` only stores `initial_balance`. `current_balance` is computed in `computeBalances()` in `utils.ts`.
8. **DO NOT use `DesignUI.css`** — its utility classes (`.flex`, `.grid`, `.items-center`, etc.) conflict with Tailwind v4 responsive variants (`lg:grid-cols-12`, `lg:col-span-*`) and break the main app layout. Use only Tailwind v4 utility classes for all styling. The `DesignUI.css` file exists for reference only and must never be imported.
9. **The frontend is a single-file SPA** (`index.tsx` ~700+ lines). All state lives in the `App` component.
10. **Turso connection:** Use `https://` URL prefix (not `libsql://`) in `TURSO_DB_URL` — the `libsql-client` Python package requires HTTP mode for AWS regions.
