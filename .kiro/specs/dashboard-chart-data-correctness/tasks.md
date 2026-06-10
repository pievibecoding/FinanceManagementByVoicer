# Tasks: Dashboard Chart Data Correctness

## Implementation Tasks

- [x] 1. Audit current dashboard chart inputs and stale chart paths
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/src/routes/_authenticated/index.tsx`
  - Verification: identify active chart modes, unused props, unused chart types, and current investment balance semantics before editing.

- [x] 2. Add normalized chart data helpers
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: account/transaction/category comparisons use normalized IDs instead of raw strict equality.

- [x] 3. Fix historical account balance calculation for asset fluctuation
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: seeded users with transaction history show a non-flat asset trend when account balances change.

- [x] 4. Clarify total asset snapshot semantics in UI
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/src/i18n/locales/en/common.json`, `frontend/src/i18n/locales/vi/common.json`
  - Verification: asset chart label or tooltip clearly distinguishes historical account balance from current savings/debt snapshot offsets.

- [x] 5. Implement range-based time bucket aggregation
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: 1 week/1 month use daily buckets, 6 months uses weekly buckets, 1 year/all/long custom ranges use monthly or quarterly buckets.

- [x] 6. Restrict time range controls to time-series charts
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: distribution/current-state charts do not display preset/custom range controls.

- [x] 7. Add `Other` grouping for distribution charts
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/src/i18n/locales/en/common.json`, `frontend/src/i18n/locales/vi/common.json`
  - Verification: when visible item limits hide data, remaining values appear as `Other` / `Khác` and totals remain correct.

- [x] 8. Improve debt and loan summary wording
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/src/i18n/locales/en/common.json`, `frontend/src/i18n/locales/vi/common.json`
  - Verification: owed debt and money lent are shown separately; net value is not the only summary.

- [x] 9. Handle empty and sparse chart states
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: no-data charts show an empty state; sparse data keeps stable axes/tooltips.

- [x] 10. Remove or document stale props and unused chart modes
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`, `frontend/src/routes/_authenticated/index.tsx`
  - Verification: TypeScript build has no unused props/imports and intentionally retained chart modes are documented by usage.

## Final Verification

- [x] `cd frontend && npm run build`
- [x] `git diff --check`
- [x] `rg "vi-VN|en-US" frontend/components/dashboard frontend/hooks frontend/src/routes/_authenticated/index.tsx`
- [x] `rg "expenseByCategory|monthlyNetWorth|net-savings-trend" frontend/components/dashboard/DynamicChart.tsx frontend/src/routes/_authenticated/index.tsx`
- [x] Manual hook `.kiro/manual-hooks/02-spec-pushback.md` reviewed
- [x] Manual hook `.kiro/manual-hooks/03-spec-alignment.md` reviewed
- [x] Manual hook `.kiro/manual-hooks/04-pre-commit-review.md` completed before any commit
