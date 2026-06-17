# Tasks: Dashboard Chart Redesign

## Implementation Tasks

- [x] 1. Add chart metadata and range model
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Details: Define chart kind, range visibility, default ranges, and custom date state.
  - Verification: TypeScript build catches invalid chart type/range usage.

- [x] 2. Refactor shared chart shell
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Details: Create a common layout for title, summary, controls, body, empty state, tooltip, and legend/list.
  - Verification: Existing chart types still render.

- [x] 3. Add time-series range controls with Custom
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, locale JSON files
  - Details: Add preset controls, custom start/end date inputs, and guard invalid date ranges.
  - Verification: Custom date selection updates time-series chart data.

- [x] 4. Add Recharts brush for supported time-series charts
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Details: Use Recharts `Brush` to adjust visible points without backend requests.
  - Verification: Dragging brush changes the visible chart window.

- [x] 5. Build daily net worth data
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, optional helper in `frontend/components/dashboard/`
  - Details: Replace monthly asset fluctuation with daily carried-forward account balance trend plus current savings minus current debt offset.
  - Verification: Asset fluctuation chart shows daily points and preserves starting balance from prior transactions.

- [x] 6. Remove range controls from distribution/current-state charts
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Details: Hide controls for expense allocation, account distribution, savings breakdown, and debt breakdown.
  - Verification: Those charts render without range controls.

- [x] 7. Correct distribution chart data scopes
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Details: Expense allocation uses current month, account distribution uses current all-time balances, savings/debts use active/current records.
  - Verification: Changing time range in another chart does not affect these distribution charts.

- [x] 8. Improve chart visuals and legends
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/styles/tokens.ts` if new Recharts colors are needed
  - Details: Replace default legends with readable side/bottom lists, improve donut center summaries, area/line styling, bar spacing, tooltip consistency, and empty states.
  - Verification: Charts remain readable on desktop and narrow layouts.

- [x] 9. Sync i18n labels
  - Files/areas: `frontend/src/i18n/locales/vi/common.json`, `frontend/src/i18n/locales/en/common.json`
  - Details: Add every new chart/range/empty-state label to both locale files, including the income-over-time title if `monthly-income-breakdown` becomes range-based.
  - Verification: `rg -n "NEEDS_TRANSLATION|NEEDS_REVIEW" frontend/src/i18n` returns no matches.

## Final Verification

- [x] `cd frontend; npm run build`
- [x] `git diff --check`
- [x] `rg -n "NEEDS_TRANSLATION|NEEDS_REVIEW" frontend/src/i18n`
- [x] `rg -n "/api/analytics|/api/sql-query" frontend/api frontend/hooks frontend/components frontend/src/routes`
  - Existing `/api/analytics/*` matches remain in the Analytics page code path, as documented in `.kiro/steering/project-context.md`; dashboard chart redesign did not add new API calls.
- [x] Manual hook `.kiro/manual-hooks/04-pre-commit-review.md` completed
