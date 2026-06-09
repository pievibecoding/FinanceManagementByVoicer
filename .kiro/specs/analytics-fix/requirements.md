# Requirements: Analytics Fix

## Goal

Make the Analytics page load real data without calling nonexistent `/api/analytics/*` endpoints.

## Current State

- `frontend/api/analytics.ts` and `frontend/hooks/useAnalytics.ts` call `/api/analytics/*`.
- Flask does not expose `/api/analytics/*`.
- The existing backend analytics surface is `POST /api/sql-query`.
- The current Analytics UI should be preserved unless a task explicitly changes it.

## Requirements

- REQ-1: Replace frontend analytics data fetching so it uses an existing backend API.
- REQ-2: Do not create frontend calls to nonexistent routes.
- REQ-3: Preserve the existing analytics page layout and chart components.
- REQ-4: Keep analytics user-scoped through the backend SQL passthrough behavior.
- REQ-5: Keep TypeScript types explicit for overview, category spending, income-vs-expense, and monthly trends.

## Out Of Scope

- Adding new Flask `/api/analytics/*` routes.
- Redesigning the Analytics UI.
- Adding new chart types.
- Changing auth, transaction creation, debts, savings, or dashboard behavior.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User opens `/analytics` | Page no longer errors because of `/api/analytics/*` calls |
| Analytics hooks fetch data | Requests use `POST /api/sql-query` |
| Backend rejects/returns empty data | Page shows existing loading/error/empty states safely |
| Build runs | `cd frontend && npm run build` passes |

## Verification

```powershell
rg -n "/api/analytics" frontend
rg -n "/api/sql-query" frontend
cd frontend; npm run build
git diff --check
```
