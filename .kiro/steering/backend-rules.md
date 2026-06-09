# Backend Rules

Use this for Flask API, auth, database, migrations, and server-side business logic.

## Flask API

- Backend entrypoint is `backend/main.py`.
- Database access is in `backend/database.py`.
- All non-auth routes must be user-scoped through JWT auth.
- Keep response shapes compatible with existing frontend API wrappers unless the spec explicitly changes them.

## Auth

- JWT uses `python-jose`.
- Password hashing uses bcrypt with existing settings.
- Do not weaken auth checks or expose user data across accounts.

## Database

- Turso/libSQL is SQLite-compatible.
- Amounts are positive VND integers.
- `transaction_date` format is `YYYY-MM-DD HH:MM:SS`.
- Transactions use soft delete with `is_deleted=1`.
- Avoid destructive migrations without an explicit rollback/data migration plan.

## API Compatibility

- If adding a route, update `.kiro/steering/api-contract.md`.
- If changing a response shape, update the matching frontend types/wrappers in the same feature.
- Do not add frontend calls before backend routes exist.

## Verification

Use the smallest meaningful backend checks available in the repo. For cross-stack changes, also run:

```powershell
cd frontend; npm run build
git diff --check
```
