# Design: Analytics Fix

## Approach

Replace the broken analytics REST wrapper implementation with SQL-passthrough-backed functions. Keep the hook and component API stable where possible so the Analytics route and components need minimal changes.

## Interfaces

- Keep exported analytics types from `frontend/api/analytics.ts`.
- Implement analytics fetchers by POSTing SELECT statements to `/api/sql-query`.
- Keep `useAnalyticsOverview`, `useSpendingByCategory`, `useIncomeVsExpense`, and `useMonthlyTrends` as the hook surface.

## Data Flow

Analytics page -> TanStack Query hook -> `frontend/api/analytics.ts` -> Express proxy -> Flask `POST /api/sql-query` -> Turso -> transformed frontend chart data.

## Edge Cases

- Empty result sets should return zeroed summaries or empty arrays, not crash.
- SQL endpoint errors should surface through existing `isError` handling.
- Date range inputs must be sanitized/controlled by code, not interpolated from arbitrary user text.

## Compatibility

- No backend route changes.
- No route tree changes.
- No i18n scope expansion unless existing Analytics labels need new text.
- Query keys should remain analytics-specific and not collide with transaction query keys.
