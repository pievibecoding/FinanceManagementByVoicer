# Finance Management by Voicer

Vietnamese personal finance tracker with AI-powered voice/text transaction parsing and multi-user authentication.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript, Vite, Tailwind v4, Lucide, `@react-oauth/google` |
| BFF Server | Express 5 (TypeScript) + Gemini 2.0 Flash API |
| Backend API | Python Flask + Flask-CORS |
| Database | Turso (libSQL / SQLite-compatible, cloud) |
| Auth | JWT (python-jose) + bcrypt + Google OAuth |
| AI | Google Gemini 2.0 Flash (server-side only) |

---

## Architecture

```
Browser (React SPA)
  │  auth: JWT in localStorage
  │  all API calls: Authorization: Bearer <token>
  ▼
Express BFF — port 3000          (frontend/server.ts)
  │  serves Vite dev assets
  │  proxies /api/auth/* → Flask
  │  calls Gemini for voice parsing
  │  forwards Bearer token to Flask
  ▼
Flask REST API — port 5000       (backend/main.py)
  │  JWT auth middleware on all /api/* routes
  │  full user_id data isolation
  ▼
Turso (libSQL cloud)             (backend/database.py)
  users, Account_Dim, Category_Dim, Transaction_Fact
```

**Core flow:** User speaks/types Vietnamese → Express BFF calls Gemini to parse → saves to Turso via Flask REST → React reads back.

---

## Prerequisites

- Python 3.10+
- Node.js 20+
- A [Turso](https://turso.tech) database (free tier works)
- A Google Cloud project with OAuth 2.0 credentials (optional — for Google sign-in)
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

---

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd FinanceManagementByVoicer
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Copy the example env file and fill in your secrets:

```bash
copy .env.example .env
```

```env
# backend/.env
TURSO_DB_URL=https://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-token
AUTH_SECRET_KEY=your-random-32-char-secret
AUTH_TOKEN_EXPIRE_DAYS=1
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com   # optional
```

> **Important:** Use `https://` prefix for `TURSO_DB_URL`, not `libsql://`.

### 3. Frontend

```bash
cd frontend
npm install
```

Copy the example env file and fill in your secrets:

```bash
copy .env.example .env.local
```

```env
# frontend/.env.local
GEMINI_API_KEY=your-gemini-api-key
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com   # optional, enables Google sign-in
FLASK_BACKEND_URL=http://localhost:5000                 # optional, defaults to localhost:5000
```

---

## Running Locally

Open two terminals:

**Terminal 1 — Backend (Flask)**
```bash
cd backend
python main.py
# Starts on http://localhost:5000
# Auto-creates tables and seeds system user on first run
```

**Terminal 2 — Frontend (Express + Vite)**
```bash
cd frontend
npm run dev
# Starts on http://localhost:3000
```

Open `http://localhost:3000` — you'll land on the login page.

---

## Authentication

The app uses JWT-based authentication with optional Google OAuth.

- **Register:** POST `/api/auth/register` `{ email, username, password }`
- **Login:** POST `/api/auth/login` `{ email, password }`
- **Google:** POST `/api/auth/google` `{ id_token }`
- **Me:** GET `/api/auth/me` ← requires `Authorization: Bearer <token>`
- **Logout:** POST `/api/auth/logout`

On first registration, default expense/income/investment categories are seeded for the new user. Accounts must be created manually.

---

## REST API Reference

All routes under `/api/` require `Authorization: Bearer <token>` except the `/api/auth/*` endpoints.

### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/api/transactions` | List all (user-scoped, sorted by date DESC) |
| POST | `/api/transactions` | Create `{ transaction_date, account_id, category_id, amount, type, note }` |
| DELETE | `/api/transactions/:id` | Soft-delete (sets `is_deleted=1`) |

### Accounts

| Method | Path | Description |
|---|---|---|
| GET | `/api/accounts` | List user's accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account metadata, including color |

### Categories

| Method | Path | Description |
|---|---|---|
| GET | `/api/categories` | List user's categories |
| PUT | `/api/categories/:id` | Update budget `{ budget: number }` |

### Analytics

| Method | Path | Description |
|---|---|---|
| POST | `/api/sql-query` | Run a SELECT query `{ query: string }` — returns `{ headers, rows }` |

---

## Database Schema

```
users (user_id PK, username, email, password_hash, google_sub, created_at, is_deleted)
user_settings (setting_id PK, user_id FK, currency, language, timezone)
Account_Dim (account_id PK, user_id FK, account_name, account_type, initial_balance)
Category_Dim (category_id PK, user_id FK, category_name, category_type, budget)
Transaction_Fact (transaction_id PK, user_id FK, transaction_date, account_id FK,
                  category_id FK, amount, type, note, is_deleted)
```

- `amount` is always a positive integer (VND). Direction is encoded in `type`.
- `transaction_id` format: `tx-{timestamp_ms}`
- `transaction_date` format: `YYYY-MM-DD HH:MM:SS`
- `current_balance` is computed client-side — `Account_Dim` stores `initial_balance` only.

---

## Project Structure

```
FinanceManagementByVoicer/
├── backend/
│   ├── main.py                # Flask app factory (port 5000)
│   ├── database.py            # Turso connection + table init + seeding
│   ├── config.py              # Env vars
│   ├── requirements.txt
│   ├── auth/
│   │   ├── router.py          # /api/auth/* endpoints
│   │   ├── auth_service.py    # register / login / google_auth logic
│   │   ├── jwt_utils.py       # JWT create/verify + @require_auth decorator
│   │   ├── db.py              # User DB operations
│   │   └── password_hasher.py # bcrypt (rounds=12)
│   └── routes/
│       ├── transactions.py    # GET/POST/DELETE /api/transactions
│       ├── accounts.py        # GET/POST/PUT /api/accounts
│       ├── categories.py      # GET/PUT /api/categories
│       └── analytics.py       # POST /api/sql-query
│
├── frontend/
│   ├── index.tsx              # Main React SPA
│   ├── server.ts              # Express BFF + Vite middleware
│   ├── types.ts               # TypeScript interfaces
│   ├── utils.ts               # formatCurrency, computeBalances, evaluateSQLQuery
│   ├── constants.ts
│   ├── api/
│   │   └── auth.ts            # Auth API client
│   ├── contexts/
│   │   └── AuthContext.tsx    # Auth state (token, user, login/logout)
│   └── components/
│       ├── auth/
│       │   ├── AuthPage.tsx   # Login/register page shell
│       │   ├── LoginForm.tsx  # Email+password + Google login
│       │   └── RegisterForm.tsx
│       ├── ArtifactCard.tsx
│       ├── SideDrawer.tsx
│       ├── Icons.tsx
│       └── DottedGlowBackground.tsx
│
└── database/                  # Legacy SQL references removed; runtime schema lives in backend/database.py
```

---

## Build & Deploy

```bash
# Build frontend (outputs to frontend/dist/)
cd frontend
npm run build

# Run production server
npm start
# Serves React SPA + API on port 3000
```

The production server (`dist/server.cjs`) serves the Vite-built static assets and all `/api/*` proxy routes.

---

## Vietnamese Amount Shortcuts (AI Parsing)

| Input | Value |
|---|---|
| 50k / 50 ngàn | 50,000 VND |
| 1 loét / 1 xị | 100,000 VND |
| 3 củ | 3,000,000 VND |
| nửa củ | 500,000 VND |
| 1 tỏi | 1,000,000,000 VND |
