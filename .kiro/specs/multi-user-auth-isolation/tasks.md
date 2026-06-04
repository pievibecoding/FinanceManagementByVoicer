# Implementation Tasks

## Task Overview

These tasks follow the 4-phase migration strategy from the design document.
Each task is self-contained and independently verifiable. Execute in order — later tasks depend on earlier ones.

---

## Phase 1 — Database Schema Migration

### Task 1: Add auth tables and migrate existing schema
- [ ] 1.1 Add `users` table creation to `backend/database.py` `_create_tables()`
- [ ] 1.2 Add `user_settings` table creation to `backend/database.py` `_create_tables()`
- [ ] 1.3 Add ALTER TABLE migrations in `_create_tables()` to add `user_id INTEGER DEFAULT 1` to `Account_Dim`
- [ ] 1.4 Add ALTER TABLE migrations in `_create_tables()` to add `user_id INTEGER DEFAULT 1` to `Category_Dim`
- [ ] 1.5 Add ALTER TABLE migrations in `_create_tables()` to add `user_id INTEGER DEFAULT 1` to `Transaction_Fact`
- [ ] 1.6 Add ALTER TABLE migration to add `is_deleted INTEGER NOT NULL DEFAULT 0` to `Transaction_Fact`
- [ ] 1.7 Add indexes: `idx_account_user`, `idx_category_user`, `idx_transaction_user`, `idx_transaction_date`
- [ ] 1.8 Add `_seed_system_user()` function that inserts `user_id=1` system user if not exists
- [ ] 1.9 Call `_seed_system_user()` from `initialize_db()`
- [ ] 1.10 Verify: run `python main.py` — server starts, all 3 existing tables still work, no data lost

**Files changed:** `backend/database.py`
**Verify:** Flask starts without errors, existing `/api/transactions` still returns data

---

## Phase 2 — Backend Auth Routes

### Task 2: Add Python dependencies
- [ ] 2.1 Add `python-jose[cryptography]` to `backend/requirements.txt`
- [ ] 2.2 Add `bcrypt` to `backend/requirements.txt`
- [ ] 2.3 Add `google-auth` to `backend/requirements.txt`
- [ ] 2.4 Add `AUTH_SECRET_KEY` and `GOOGLE_CLIENT_ID` to `backend/.env` and `backend/.env.example`
- [ ] 2.5 Add `AUTH_SECRET_KEY` and `GOOGLE_CLIENT_ID` loading to `backend/config.py`
- [ ] 2.6 Run `pip install -r requirements.txt` to confirm packages install cleanly

**Files changed:** `backend/requirements.txt`, `backend/.env`, `backend/.env.example`, `backend/config.py`

### Task 3: Create auth module files
- [ ] 3.1 Create `backend/auth/__init__.py` (empty)
- [ ] 3.2 Create `backend/auth/password_hasher.py` — `hash_password(plain)` and `verify_password(plain, hashed)` using bcrypt (copy pattern from tooltrace-pro)
- [ ] 3.3 Create `backend/auth/jwt_utils.py` — `create_token(user_id)`, `verify_token(token)`, and `require_auth` Flask decorator that sets `g.user_id`
- [ ] 3.4 Create `backend/auth/db.py` — user DB operations: `find_user_by_email()`, `find_user_by_google_sub()`, `create_user()`, `update_google_sub()`, `find_user_by_id()`
- [ ] 3.5 Create `backend/auth/auth_service.py` — `register()`, `login()`, `google_auth()` business logic
- [ ] 3.6 Create `backend/auth/router.py` — Flask Blueprint with routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout`

**Files created:** `backend/auth/__init__.py`, `backend/auth/password_hasher.py`, `backend/auth/jwt_utils.py`, `backend/auth/db.py`, `backend/auth/auth_service.py`, `backend/auth/router.py`

### Task 4: Register auth blueprint and add seed function
- [ ] 4.1 Import and register `auth_bp` Blueprint in `backend/main.py`
- [ ] 4.2 Add `seed_categories_for_user(db, user_id)` function to `backend/database.py` — creates 9 default categories with `{user_id}-{slug}` as category_id
- [ ] 4.3 Call `seed_categories_for_user()` from `auth_service.register()` and `auth_service.google_auth()` (new user path only)
- [ ] 4.4 Verify: `POST /api/auth/register` with email/password returns `{access_token, user_id}`
- [ ] 4.5 Verify: `POST /api/auth/login` with valid credentials returns `{access_token, user_id, email}`
- [ ] 4.6 Verify: `POST /api/auth/google` with a valid Google ID token returns `{access_token, user_id, email, name}`
- [ ] 4.7 Verify: `GET /api/auth/me` with valid Bearer token returns `{user_id, email, username}`

**Files changed:** `backend/main.py`, `backend/database.py`, `backend/auth/auth_service.py`

---

## Phase 3 — Protect Existing Routes

### Task 5: Add auth middleware to all existing routes
- [ ] 5.1 Import `require_auth` and `g` in `backend/routes/transactions.py`
- [ ] 5.2 Add `@require_auth` to `get_transactions()` — filter query: `WHERE user_id = ? AND is_deleted = 0`, param `[g.user_id]`
- [ ] 5.3 Add `@require_auth` to `create_transaction()` — include `user_id = g.user_id` in INSERT
- [ ] 5.4 Update `delete_transaction()` to soft delete: `UPDATE SET is_deleted = 1 WHERE transaction_id = ? AND user_id = ?`
- [ ] 5.5 Import `require_auth` and `g` in `backend/routes/accounts.py`
- [ ] 5.6 Add `@require_auth` to `get_accounts()` — filter: `WHERE user_id = ?`
- [ ] 5.7 Add `@require_auth` to `create_account()` — include `user_id = g.user_id` in INSERT
- [ ] 5.8 Import `require_auth` and `g` in `backend/routes/categories.py`
- [ ] 5.9 Add `@require_auth` to `get_categories()` — filter: `WHERE user_id = ?`
- [ ] 5.10 Add `@require_auth` to `update_category_budget()` — add `AND user_id = ?` to UPDATE WHERE clause
- [ ] 5.11 Import `require_auth` and `g` in `backend/routes/analytics.py`
- [ ] 5.12 Add `@require_auth` to `execute_sql_query()`
- [ ] 5.13 Verify: all 4 routes return 401 without a token
- [ ] 5.14 Verify: all 4 routes return correct data when called with a valid Bearer token

**Files changed:** `backend/routes/transactions.py`, `backend/routes/accounts.py`, `backend/routes/categories.py`, `backend/routes/analytics.py`

### Task 6: Update Express BFF to forward auth token
- [ ] 6.1 In `frontend/server.ts` `parse-transaction` handler: extract `Authorization` header from incoming request
- [ ] 6.2 Forward `Authorization` header to Flask when calling `POST /api/transactions`
- [ ] 6.3 Forward `Authorization` header to Flask when calling `GET /api/accounts`
- [ ] 6.4 Forward `Authorization` header to Flask when calling `POST /api/accounts` (new account creation)
- [ ] 6.5 Verify: voice transaction parsing still works end-to-end with a valid token

**Files changed:** `frontend/server.ts`

---

## Phase 4 — Frontend Auth UI

### Task 7: Install frontend dependency
- [ ] 7.1 Run `npm install @react-oauth/google` in the `frontend/` directory
- [ ] 7.2 Add `VITE_GOOGLE_CLIENT_ID=` to `frontend/.env.local` and `frontend/.env.example`
- [ ] 7.3 Verify: `npm run dev` still starts without errors

**Files changed:** `frontend/package.json`, `frontend/.env.local`, `frontend/.env.example`

### Task 8: Create AuthContext
- [ ] 8.1 Create `frontend/contexts/AuthContext.tsx` with `AuthProvider` component
- [ ] 8.2 Store `token`, `user_id`, `email`, `name` in `localStorage` using keys: `finance_auth_token`, `finance_auth_user_id`, `finance_auth_email`, `finance_auth_name`
- [ ] 8.3 Export `useAuth()` hook returning `{ user, token, login, logout, isAuthenticated }`
- [ ] 8.4 `login(token, userId, email, name?)` — saves to state + localStorage
- [ ] 8.5 `logout()` — clears state + localStorage

**Files created:** `frontend/contexts/AuthContext.tsx`

### Task 9: Create auth API client
- [ ] 9.1 Create `frontend/api/auth.ts`
- [ ] 9.2 Implement `authApi.register(email, username, password)` — POST to `/api/auth/register` (via Flask at port 5000 or BFF proxy)
- [ ] 9.3 Implement `authApi.login(email, password)` — POST to `/api/auth/login`
- [ ] 9.4 Implement `authApi.googleAuth(idToken)` — POST to `/api/auth/google`
- [ ] 9.5 Implement `authApi.getMe(token)` — GET `/api/auth/me` with Bearer header
- [ ] 9.6 Implement `authApi.logout()` — clears localStorage keys
- [ ] 9.7 Add `AuthResponse` TypeScript interface to `frontend/types.ts`

**Files created:** `frontend/api/auth.ts`
**Files changed:** `frontend/types.ts`

### Task 10: Create auth UI components
- [ ] 10.1 Create `frontend/components/auth/LoginForm.tsx` — email + password form + `GoogleLogin` button from `@react-oauth/google`, styled with `.glass`, `.input`, `.btn-primary` from `DesignUI.css`
- [ ] 10.2 Create `frontend/components/auth/RegisterForm.tsx` — email + username + password + confirm password form, same styling
- [ ] 10.3 Create `frontend/components/auth/AuthPage.tsx` — wraps with `GoogleOAuthProvider` if `VITE_GOOGLE_CLIENT_ID` is set, shows `LoginForm` or `RegisterForm` based on mode state
- [ ] 10.4 Add toggle between login and register mode
- [ ] 10.5 Display API errors below the form
- [ ] 10.6 Show loading state on buttons during API calls
- [ ] 10.7 Verify: AuthPage renders correctly at `localhost:3000` without crashing

**Files created:** `frontend/components/auth/LoginForm.tsx`, `frontend/components/auth/RegisterForm.tsx`, `frontend/components/auth/AuthPage.tsx`

### Task 11: Integrate auth into main app entry point
- [ ] 11.1 Import `AuthProvider` and `useAuth` from `contexts/AuthContext.tsx` in `frontend/index.tsx`
- [ ] 11.2 Import `AuthPage` component
- [ ] 11.3 Add `GoogleOAuthProvider` wrapper in `index.tsx` entry point (outermost wrapper)
- [ ] 11.4 Add route guard: render `<AuthPage />` when `!isAuthenticated`, else render `<App />`
- [ ] 11.5 Add logout button to the main app UI (top navigation area in `App` component)
- [ ] 11.6 Display authenticated user's email/name in the header
- [ ] 11.7 Update all `fetch()` calls in `index.tsx` to include `Authorization: Bearer {token}` header
- [ ] 11.8 Add 401 response handler: on 401, call `logout()` and redirect to login
- [ ] 11.9 Verify: unauthenticated visit shows login page
- [ ] 11.10 Verify: after login, main app loads with user's own data
- [ ] 11.11 Verify: logout clears state and returns to login page
- [ ] 11.12 Verify: two separate family member accounts show fully isolated transactions

**Files changed:** `frontend/index.tsx`

---

## Final Verification Checklist

- [ ] Registration with email/password creates account and seeds 9 default categories
- [ ] Registration with Google creates account without password
- [ ] Login with email/password returns valid JWT
- [ ] Login with Google returns valid JWT (existing and new users)
- [ ] All `/api/transactions`, `/api/accounts`, `/api/categories` return 401 without token
- [ ] User A cannot see User B's transactions (data isolation)
- [ ] Soft delete marks `is_deleted=1`, does not appear in GET
- [ ] Voice transaction parsing works end-to-end with authenticated user
- [ ] Existing data (system user) still accessible via system credentials
- [ ] Page refresh preserves authentication state (localStorage persistence)
