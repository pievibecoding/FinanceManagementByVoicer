# Tasks: Analytics Fix

## Implementation Tasks

- [ ] 1. Audit current analytics API and backend SQL endpoint
  - Files/areas: `frontend/api/analytics.ts`, `frontend/hooks/useAnalytics.ts`, `backend/main.py`
  - Verification: confirm no Flask `/api/analytics/*` route exists and identify SQL response shape.

- [ ] 2. Replace broken analytics fetchers with SQL passthrough fetchers
  - Files/areas: `frontend/api/analytics.ts`
  - Verification: `rg -n "/api/analytics" frontend` returns no active fetch calls.

- [ ] 3. Preserve hooks and route behavior
  - Files/areas: `frontend/hooks/useAnalytics.ts`, `frontend/src/routes/_authenticated/analytics/index.tsx`
  - Verification: hooks still expose existing data shapes to components.

- [ ] 4. Verify UI states and build
  - Files/areas: Analytics route and components.
  - Verification: `cd frontend && npm run build`.

## Final Verification

- [ ] `rg -n "/api/analytics" frontend`
- [ ] `rg -n "/api/sql-query" frontend`
- [ ] `cd frontend && npm run build`
- [ ] `git diff --check`
- [ ] Manual hook `.kiro/manual-hooks/04-pre-commit-review.md` completed
