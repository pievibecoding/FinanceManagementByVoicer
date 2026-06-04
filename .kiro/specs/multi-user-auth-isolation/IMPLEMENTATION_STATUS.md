# Week 1 Implementation Status

## Completed: Phase 1-3 (Backend Complete)

### ✅ Task 1: Database Schema Migration
**Status:** Complete
**Files modified:**
- `backend/database.py` — Added `users`, `user_settings` tables, migrated existing tables with `user_id` and `is_deleted` columns, added indexes, system user seed

**Verification needed:**
```bash
cd backend
python main.py
# Server should start without errors
# Check logs for: "Seeded system user (user_id=1)"
```

---

### ✅ Task 2: Python Dependencies
**Status:** Complete
**Files modified:**
- `backend/requirements.txt` — Added `python-jose[cryptography]`, `bcrypt`, `google-auth`
- `backend/config.py` — Added `AUTH_SECRET_KEY`, `AUTH_TOKEN_EXPIRE_DAYS`, `GOOGLE_CLIENT_ID`

**Action required:**
```bash
cd backend
pip install -r requirements.txt
```

**Environment variables needed in `backend/.env`:**
```
AUTH_SECRET_KEY=your_random_32_char_secret_here
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
AUTH_TOKEN_EXPIRE_DAYS=1
```

---

### ✅ Task 3: Auth Module Files
**Status:** Complete
**Files created:**
- `backend/auth/__init__.py`
- `backend/auth/password_hasher.py` — bcrypt hashing (rounds=12)
- `backend/auth/jwt_utils.py` — JWT create/verify + `@require_auth` decorator
- `backend/auth/db.py` — User DB operations (find_by_email, find_by_google_sub, create_user, etc.)
- `backend/auth/auth_service.py` — Business logic for register, login, google_auth
- `backend/auth/router.py` — Flask Blueprint with `/api/auth/*` endpoints

---

### ✅ Task 4: Register Auth Blueprint
**Status:** Complete
**Files modified:**
- `backend/main.py` — Imported and registered `auth_bp`

**Verification needed:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","username":"testuser","password":"password123"}'

# Expected: 201 with {"access_token": "...", "user_id": 2}
```

---

### ✅ Task 5: Protect Existing Routes
**Status:** Complete
**Files modified:**
- `backend/routes/transactions.py` — Added `@require_auth`, filters by `g.user_id`, soft delete
- `backend/routes/accounts.py` — Added `@require_auth`, filters by `g.user_id`
- `backend/routes/categories.py` — Added `@require_auth`, filters by `g.user_id`
- `backend/routes/analytics.py` — Added `@require_auth`

**Verification needed:**
```bash
# Without token → 401
curl http://localhost:5000/api/transactions

# With token → 200
curl http://localhost:5000/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### ✅ Task 6: Express BFF Token Forwarding
**Status:** Complete
**Files modified:**
- `frontend/server.ts` — Extracts `req.headers.authorization` and forwards to all Flask calls

**Verification needed:**
- Voice transaction parsing with authenticated user should work end-to-end

---

## Remaining: Phase 4 (Frontend)

### ⏳ Task 7: Install Frontend Dependency
**Status:** Not started
- Run `npm install @react-oauth/google` in `frontend/`
- Add `VITE_GOOGLE_CLIENT_ID` to `.env.local` and `.env.example`

### ⏳ Task 8: Create AuthContext
**Status:** Not started
- Create `frontend/contexts/AuthContext.tsx`

### ⏳ Task 9: Create Auth API Client
**Status:** Not started
- Create `frontend/api/auth.ts`
- Update `frontend/types.ts` with `AuthResponse` interface

### ⏳ Task 10: Create Auth UI Components
**Status:** Not started
- Create `frontend/components/auth/LoginForm.tsx`
- Create `frontend/components/auth/RegisterForm.tsx`
- Create `frontend/components/auth/AuthPage.tsx`

### ⏳ Task 11: Integrate Auth into Main App
**Status:** Not started
- Update `frontend/index.tsx` with route guard, token injection

---

## Testing Checklist (After Full Implementation)

- [ ] Registration creates user + JWT + seeds categories
- [ ] Login with email/password returns JWT
- [ ] Google OAuth login works (existing + new users)
- [ ] Protected routes return 401 without token
- [ ] User A cannot see User B's transactions
- [ ] Soft delete works (`is_deleted=1`, not visible in GET)
- [ ] Voice parsing works with authenticated user
- [ ] System user (user_id=1) still accessible

---

## Next Session

Continue with **Task 7** (frontend dependencies) through **Task 11** (full frontend integration).
