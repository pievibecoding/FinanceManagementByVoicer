# Technical Design Document

## 1. System Architecture

### 1.1 Component Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ AuthPage       │  │ App (Main UI)   │  │ AuthContext      │  │
│  │ - LoginForm    │  │ - Protected     │  │ - Token Storage  │  │
│  │ - RegisterForm │  │   by Auth       │  │ - User State     │  │
│  │ - GoogleLogin  │  │                 │  │                  │  │
│  └────────────────┘  └─────────────────┘  └──────────────────┘  │
│           │                    │                     │            │
└───────────┼────────────────────┼─────────────────────┼────────────┘
            │                    │                     │
            ▼                    ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Express BFF Server (port 3000)                │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  POST /api/parse-transaction                               │  │
│  │  - Gemini AI transaction parsing                           │  │
│  │  - Forwards to Flask with user context                     │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Flask Backend API (port 5000)                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Auth Routes (/api/auth/*)                                │    │
│  │  - POST /register   - POST /login   - POST /google       │    │
│  │  - GET  /me         - POST /logout                       │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ Protected Routes (require JWT)                           │    │
│  │  - /api/transactions (GET, POST, DELETE)                 │    │
│  │  - /api/accounts (GET, POST)                             │    │
│  │  - /api/categories (GET, PUT)                            │    │
│  │  - /api/sql-query (POST)                                 │    │
│  ├──────────────────────────────────────────────────────────┤    │
│  │ Auth Middleware                                          │    │
│  │  - JWT verification (python-jose)                        │    │
│  │  - Extract user_id from token                            │    │
│  │  - Inject user_id into request context                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Turso Database (libSQL)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ users       │  │ user_settings│  │ Account_Dim (+ user_id)│  │
│  └─────────────┘  └──────────────┘  └────────────────────────┘  │
│  ┌────────────────────────┐  ┌─────────────────────────────────┐│
│  │ Category_Dim (+ user_id)│  │ Transaction_Fact (+ user_id,   ││
│  │                         │  │                   is_deleted)   ││
│  └────────────────────────┘  └─────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Authentication Flow

#### Password-based Authentication
```
User → AuthPage (email, password)
  │
  ▼
POST /api/auth/login
  │
  ▼
Flask: verify password (bcrypt)
  │
  ▼
Generate JWT token
  │
  ▼
Return {access_token, user_id, email}
  │
  ▼
Frontend stores token in localStorage
  │
  ▼
Redirect to main App
```

#### Google OAuth Authentication
```
User → AuthPage → Click Google Sign-In
  │
  ▼
GoogleLogin component (@react-oauth/google)
  │
  ▼
Google OAuth popup → User authorizes
  │
  ▼
Receive credential (Google ID token)
  │
  ▼
POST /api/auth/google {id_token}
  │
  ▼
Flask: Verify ID token (google.oauth2.id_token)
  │
  ├── Case 1: google_sub exists → find user → generate JWT
  ├── Case 2: google_sub new + email exists → link google_sub to user → generate JWT
  └── Case 3: google_sub new + email new → create user → generate JWT
  │
  ▼
Return {access_token, user_id, email, name}
  │
  ▼
Frontend stores token in localStorage
  │
  ▼
Redirect to main App
```

### 1.3 Data Isolation Enforcement

Every protected API call:
```
Request → Flask route
  │
  ▼
Auth middleware extracts user_id from JWT
  │
  ▼
Route handler receives user_id
  │
  ▼
DB query: WHERE user_id = {authenticated_user_id}
  │
  ▼
Return only user's own data
```

---

## 2. Database Schema Design

### 2.1 New Tables

#### users
```sql
CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE,
    email         TEXT UNIQUE,
    password_hash TEXT,
    google_sub    TEXT UNIQUE,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    is_deleted    INTEGER NOT NULL DEFAULT 0,
    CHECK (username IS NOT NULL OR email IS NOT NULL OR google_sub IS NOT NULL)
);
```

**Design rationale:**
- `user_id`: INTEGER AUTOINCREMENT for performance (matches tooltrace-pro pattern)
- `username`, `email`, `google_sub`: All nullable, but CHECK constraint ensures at least one exists
- `password_hash`: Nullable (Google users don't need passwords)
- `google_sub`: Unique identifier from Google ID token (e.g., "1234567890 1234567890")
- `is_deleted`: Soft delete support

#### user_settings
```sql
CREATE TABLE IF NOT EXISTS user_settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    currency   TEXT NOT NULL DEFAULT 'VND',
    language   TEXT NOT NULL DEFAULT 'vi',
    timezone   TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

**Design rationale:**
- One settings row per user
- Future-proof for internationalization
- Currency defaults to VND for Vietnamese users

### 2.2 Schema Migrations

#### Add user_id to existing tables
```sql
-- 1. Add user_id column to Account_Dim
ALTER TABLE Account_Dim ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;

-- 2. Add user_id column to Category_Dim
ALTER TABLE Category_Dim ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;

-- 3. Add user_id column to Transaction_Fact
ALTER TABLE Transaction_Fact ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1;

-- 4. Add is_deleted column to Transaction_Fact
ALTER TABLE Transaction_Fact ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;

-- 5. Create foreign key constraints (Turso supports this)
CREATE INDEX idx_account_user ON Account_Dim(user_id);
CREATE INDEX idx_category_user ON Category_Dim(user_id);
CREATE INDEX idx_transaction_user ON Transaction_Fact(user_id);
CREATE INDEX idx_transaction_date ON Transaction_Fact(transaction_date);
```

#### Seed system user
```sql
-- Create default system user for existing data
INSERT INTO users (user_id, username, email, password_hash, created_at)
VALUES (1, 'system', 'system@local', NULL, datetime('now'));

-- All existing data now belongs to user_id=1
-- No additional UPDATE needed (DEFAULT 1 handles it)
```

---

## 3. Backend API Design

### 3.1 New Backend Structure

```
backend/
├── auth/
│   ├── __init__.py
│   ├── router.py           # Auth endpoints
│   ├── auth_service.py     # Business logic (register, login, google_auth)
│   ├── jwt_utils.py        # JWT encode/decode/verify
│   ├── password_hasher.py  # bcrypt wrapper
│   ├── models.py           # Pydantic request/response models
│   └── db.py               # User DB operations
├── routes/
│   ├── transactions.py     # (updated with user_id filtering)
│   ├── accounts.py         # (updated with user_id filtering)
│   ├── categories.py       # (updated with user_id filtering)
│   └── analytics.py        # (updated with user_id filtering)
├── database.py             # (updated with auth tables)
├── main.py                 # (register auth blueprint)
└── requirements.txt        # (add python-jose, bcrypt, google-auth)
```

### 3.2 Auth Endpoints

#### POST /api/auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "username": "user123",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 2
}
```

**Errors:**
- 409: Email/username already exists
- 422: Invalid email format
- 400: Password < 8 characters

#### POST /api/auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 2,
  "email": "user@example.com"
}
```

**Errors:**
- 401: Invalid credentials

#### POST /api/auth/google
**Request:**
```json
{ "id_token": "google_credential_token_string" }
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 3,
  "email": "user@gmail.com",
  "name": "Nguyen Van A"
}
```

**Errors:**
- 401: Google authentication failed

#### GET /api/auth/me
**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "user_id": 2,
  "email": "user@example.com",
  "username": "user123"
}
```

**Errors:**
- 401: Token invalid or expired

### 3.3 Authentication Middleware

Flask uses a decorator pattern for route protection:

```python
# backend/auth/jwt_utils.py
from functools import wraps
from flask import request, jsonify, g
from jose import JWTError, jwt

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            g.user_id = int(payload["sub"])
            g.role    = payload.get("role", "user")
        except JWTError:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)
    return decorated
```

### 3.4 Updated Route Signatures

All existing routes get `@require_auth` decorator and filter by `g.user_id`:

```python
# transactions.py
@transactions_bp.route("/api/transactions", methods=["GET"])
@require_auth
def get_transactions():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Transaction_Fact WHERE user_id = ? AND is_deleted = 0 ORDER BY transaction_date DESC",
            [g.user_id]
        )
        # ...

# accounts.py
@accounts_bp.route("/api/accounts", methods=["GET"])
@require_auth
def get_accounts():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Account_Dim WHERE user_id = ? ORDER BY account_id",
            [g.user_id]
        )
        # ...

# categories.py
@categories_bp.route("/api/categories", methods=["GET"])
@require_auth
def get_categories():
    db = get_db()
    try:
        result = db.execute(
            "SELECT * FROM Category_Dim WHERE user_id = ? ORDER BY category_id",
            [g.user_id]
        )
        # ...
```

### 3.5 Python Models (Pydantic-free for Flask)

Since this project uses Flask (not FastAPI), we use simple dataclasses instead of Pydantic:

```python
# backend/auth/models.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class RegisterRequest:
    email: str
    username: str
    password: str

@dataclass
class LoginRequest:
    email: str
    password: str

@dataclass
class GoogleAuthRequest:
    id_token: str
```

### 3.6 User Seed Logic

When a new user registers, default categories are created:

```python
def seed_categories_for_user(db, user_id: int) -> None:
    categories = [
        (f"{user_id}-food",          "Ăn uống",             "expense",    4_000_000),
        (f"{user_id}-salary",        "Tiền lương",           "income",             0),
        (f"{user_id}-investment",    "Đầu tư chứng khoán",  "investment",         0),
        (f"{user_id}-transport",     "Di chuyển",            "expense",    1_500_000),
        (f"{user_id}-shopping",      "Mua sắm",              "expense",    3_000_000),
        (f"{user_id}-entertainment", "Giải trí",             "expense",    2_000_000),
        (f"{user_id}-study",         "Học tập",              "expense",    2_000_000),
        (f"{user_id}-health",        "Sức khỏe",             "expense",    1_000_000),
        (f"{user_id}-other",         "Khác",                 "expense",    1_500_000),
    ]
    for cat in categories:
        db.execute(
            "INSERT INTO Category_Dim (category_id, category_name, category_type, budget, user_id) VALUES (?, ?, ?, ?, ?)",
            [*cat, user_id]
        )
```

**Rationale:** `category_id` is prefixed with `user_id` (e.g., `"2-food"`) to maintain uniqueness in the shared table across all users. Each user gets their own independent budget limits.

---

## 4. Frontend Component Design

### 4.1 New File Structure

```
frontend/
├── components/
│   ├── auth/
│   │   ├── AuthPage.tsx       # Login/Register page wrapper + GoogleOAuthProvider
│   │   ├── LoginForm.tsx      # Email+password form + Google button
│   │   └── RegisterForm.tsx   # Email+username+password form
│   ├── ArtifactCard.tsx       (unchanged)
│   ├── DottedGlowBackground.tsx (unchanged)
│   ├── Icons.tsx              (unchanged)
│   └── SideDrawer.tsx         (unchanged)
├── contexts/
│   └── AuthContext.tsx        # Token storage, user state, login/logout
├── api/
│   └── auth.ts                # Auth API client functions
├── index.tsx                  # (wrap with AuthProvider, add route guard)
├── types.ts                   # (add AuthUser interface)
└── ...
```

### 4.2 AuthContext

```typescript
// frontend/contexts/AuthContext.tsx
const TOKEN_KEY    = "finance_auth_token";
const USER_ID_KEY  = "finance_auth_user_id";
const USER_EMAIL   = "finance_auth_email";
const USER_NAME    = "finance_auth_name";

interface AuthContextValue {
  user: { id: number; email: string; name: string } | null;
  token: string | null;
  login: (token: string, userId: number, email: string, name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}
```

**Token stored in `localStorage`** — consistent with tooltrace-pro approach.

### 4.3 Auth API Client

```typescript
// frontend/api/auth.ts
const BACKEND_BASE = "/";  // Express BFF at port 3000 proxies to Flask

export const authApi = {
  register(email: string, username: string, password: string): Promise<AuthResponse>,
  login(email: string, password: string): Promise<AuthResponse>,
  googleAuth(idToken: string): Promise<AuthResponse>,
  getMe(token: string): Promise<{user_id: number; email: string; username: string}>,
  logout(): void  // clears localStorage
};
```

### 4.4 Route Guard Pattern

`index.tsx` wraps the main App with auth checking:

```typescript
// index.tsx pattern
export default function Root() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthPage />;
  }
  return <App />;
}

// Wrapped with providers in main entry:
// <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>
//   <AuthProvider>
//     <Root />
//   </AuthProvider>
// </GoogleOAuthProvider>
```

### 4.5 API Calls With Auth Token

All existing fetch calls in `index.tsx` must include the Authorization header:

```typescript
// Before (unauthenticated):
const res = await fetch("/api/transactions");

// After (authenticated):
const res = await fetch("http://localhost:5000/api/transactions", {
  headers: { "Authorization": `Bearer ${token}` }
});
```

The Express BFF (`server.ts`) passes through the auth token when calling Flask for transaction parsing:

```typescript
// server.ts: forward user token to Flask
await fetch(`${FLASK_URL}/api/transactions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": req.headers.authorization || ""  // forward from frontend
  },
  body: JSON.stringify({ ... })
});
```

### 4.6 AuthPage Component

Styled with the project's glassmorphism design system using `.glass`, `.btn-primary`, `.input` CSS classes from `DesignUI.css`:

```
┌─────────────────────────────────────────┐
│         Finance Management               │
│            by Voicer                     │
│                                          │
│  ┌─────────────────────────────────────┐ │
│  │                                     │ │
│  │  [G] Continue with Google           │ │
│  │                                     │ │
│  │  ──────────── hoặc ──────────────   │ │
│  │                                     │ │
│  │  Email: [_____________________]     │ │
│  │  Password: [_________________]      │ │
│  │                                     │ │
│  │       [    Đăng nhập    ]           │ │
│  │                                     │ │
│  │  Chưa có tài khoản? Đăng ký         │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 5. Security Design

### 5.1 Password Hashing

Using `bcrypt` directly (same pattern as tooltrace-pro `password_hasher.py`):

```python
import bcrypt

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8")[:72], bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
```

- Work factor: 12 (balances security vs. response time ~300ms)
- Input truncated at 72 bytes (bcrypt limitation)

### 5.2 JWT Token Structure

```json
{
  "sub": "2",
  "role": "user",
  "iat": 1748923200,
  "exp": 1749009600
}
```

- `sub`: string representation of `user_id`
- `exp`: 24 hours from `iat` (configurable via `AUTH_TOKEN_EXPIRE_DAYS`)
- Algorithm: HS256
- Signed with `AUTH_SECRET_KEY` env variable

### 5.3 Google ID Token Verification

```python
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

id_info = google_id_token.verify_oauth2_token(
    id_token_string,
    google_requests.Request(),
    GOOGLE_CLIENT_ID  # from env var
)
# id_info["sub"]   → google_sub
# id_info["email"] → email
# id_info["name"]  → display name
```

---

## 6. Dependencies

### 6.1 New Python Packages (backend/requirements.txt)

```
Flask
Flask-Cors
python-dotenv
libsql-client
python-jose[cryptography]   # JWT encode/decode
bcrypt                       # password hashing
google-auth                  # Google ID token verification
```

### 6.2 New npm Packages (frontend/package.json)

```
@react-oauth/google   # GoogleOAuthProvider + GoogleLogin component
```

### 6.3 New Environment Variables

**backend/.env:**
```
TURSO_DB_URL=libsql://...
TURSO_AUTH_TOKEN=...
AUTH_SECRET_KEY=your_random_32_char_secret_here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
AUTH_TOKEN_EXPIRE_DAYS=1
```

**frontend/.env.local:**
```
GEMINI_API_KEY=...
FLASK_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## 7. Migration Strategy

### Phase 1 — Schema Migration (non-breaking)
1. Run `initialize_db()` to create `users` and `user_settings` tables
2. Run ALTER TABLE to add `user_id` (DEFAULT 1) and `is_deleted` columns
3. Insert system user (user_id=1) into `users` table
4. All existing data now belongs to user_id=1 — app continues to work

### Phase 2 — Deploy Auth Routes
1. Add `backend/auth/` folder with all auth modules
2. Register auth blueprint in `main.py`
3. Test `/api/auth/register`, `/api/auth/login`, `/api/auth/google` in isolation

### Phase 3 — Protect Existing Routes
1. Add `@require_auth` decorator to all existing routes
2. Add `user_id` filter to all queries
3. Update Express BFF to forward Authorization header

### Phase 4 — Deploy Frontend Auth UI
1. Add `frontend/contexts/AuthContext.tsx`
2. Add `frontend/components/auth/` components
3. Add `frontend/api/auth.ts`
4. Wrap `index.tsx` with `<AuthProvider>` and `<GoogleOAuthProvider>`
5. Add route guard: show `<AuthPage>` if not authenticated

### Rollback Plan
- Phases 1-2 are fully non-breaking (old data preserved, routes still accessible)
- Phase 3 can be rolled back by removing `@require_auth` decorators
- Phase 4 can be rolled back by reverting `index.tsx` entry point

---

## 8. Requirements Traceability

| Requirement | Design Element |
|---|---|
| Req 1: User Registration | `POST /api/auth/register`, `auth_service.register()` |
| Req 2: Google Authentication | `POST /api/auth/google`, `auth_service.google_auth()` |
| Req 3: Session Management | `AuthContext`, localStorage, `GET /api/auth/me` |
| Req 4: Database Schema | `users` table, `user_settings` table, ALTER TABLE migrations |
| Req 5: Data Isolation | `@require_auth` decorator, `WHERE user_id = g.user_id` on all queries |
| Req 6: Protected Routes | `require_auth` Flask decorator on `/api/transactions`, `/api/accounts`, `/api/categories`, `/api/sql-query` |
| Req 7: Auth API Endpoints | `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/me`, `/api/auth/logout` |
| Req 8: Frontend Auth Flow | `AuthPage`, `LoginForm`, `RegisterForm`, `GoogleOAuthProvider` |
| Req 9: Token Management | `AuthContext` localStorage, `Authorization: Bearer` header |
| Req 10: User Seed Data | `seed_categories_for_user()` called on register |
| Req 11: Backward Compatibility | Phase 1 migration, DEFAULT 1 on user_id columns |
| Req 12: Soft Delete | `is_deleted` column, soft DELETE in route, filter in GET |
| Req 13: User Profile Display | `useAuth()` hook exposes `user.email` and `user.name` |
| Req 14: Password Security | `bcrypt` rounds=12, `password_hasher.py` |
| Req 15: Error Handling | HTTP status codes + Vietnamese error messages in each endpoint |
