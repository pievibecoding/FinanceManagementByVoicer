# Requirements: Dashboard Chart Redesign

## Goal

Redesign the dashboard dynamic chart so it looks more polished, keeps the existing finance content, and makes time filtering behavior match the meaning of each chart.

## Current State

- `frontend/src/routes/_authenticated/index.tsx` maps metric cards to `DynamicChart` chart types.
- `frontend/components/dashboard/DynamicChart.tsx` handles chart data transforms, time range state, chart rendering, tooltip rendering, legends, and empty states in one component.
- Dashboard data comes from `useDashboardMetrics()`, which reuses `useTransactions()` and existing account/budget hooks.
- `monthlyNetWorth` is currently grouped by month, so the "asset fluctuation" chart only changes monthly.
- All chart types show the same time range selector, including distribution charts where a time range is either misleading or unnecessary.
- No backend route should be added for this feature. The dashboard already has all required accounts, transactions, categories, savings, and debts data client-side.

## Requirements

- REQ-1: Preserve the existing dashboard chart content and metric-to-chart mapping unless a requirement explicitly changes the display behavior.
- REQ-2: Redesign the chart container with a consistent visual hierarchy: title, optional summary, optional range controls, chart body, tooltip, legend or side list.
- REQ-3: Show time range controls only for time-series charts.
- REQ-4: Hide time range controls for distribution/current-state charts:
  - `expense-allocation`
  - `account-distribution`
  - `savings-breakdown`
  - `debt-breakdown`
- REQ-5: Add a custom date range option for time-series charts.
- REQ-6: For custom date range, allow users to choose start and end dates and adjust the visible chart window with a stock-chart-like horizontal brush/slider on supported time-series charts.
- REQ-7: Change "asset fluctuation" from monthly net worth to daily net worth.
- REQ-8: Daily net worth must include all days in the selected date window, carrying forward the previous value for days without transactions.
- REQ-9: Distribution/current-state charts must use data scopes that match their metric:
  - Expense allocation uses current-month expenses.
  - Account distribution uses current account balances computed from all transactions.
  - Savings breakdown uses active savings goals.
  - Debt breakdown uses active debts and loans.
- REQ-10: For daily net worth, match the dashboard card definition as closely as available client data allows: account balance trend from dated transactions plus current savings total minus current debt total as a constant offset.
- REQ-11: Rename user-facing "monthly income breakdown" chart text to an income-over-time concept if it becomes daily/range-based.
- REQ-12: Keep all chart labels, empty states, and new range-control text translated through `react-i18next`.
- REQ-13: Continue using `useLocaleFormat()` for currency/date formatting and `frontend/styles/tokens.ts` for Recharts colors.
- REQ-14: Do not add new API wrappers, backend routes, database migrations, or duplicate transaction query keys.

## Out Of Scope

- Adding Flask `/api/analytics/*` routes.
- Changing dashboard metric card values.
- Changing transaction/account/debt/savings CRUD behavior.
- Implementing server-side pagination or infinite historical loading.
- Rebuilding the Analytics page.
- Adding new chart libraries.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User selects net worth metric | Chart shows a daily asset fluctuation trend with range controls |
| User selects monthly income metric | Chart title and data communicate income over time, not only monthly income |
| User selects current balance metric | Chart shows account distribution without range controls |
| User selects monthly expense metric | Chart shows current-month expense allocation without range controls |
| User selects total saved metric | Chart shows active savings breakdown without range controls |
| User selects total debt metric | Chart shows active debts/loans breakdown without range controls |
| User selects a time-series chart and chooses Custom | User can set start/end dates and chart updates to that window |
| User drags the chart brush/slider on a supported time-series chart | Visible window updates without making backend requests |
| Selected range has no data | Chart shows a polished empty state without throwing |
| Locale is Vietnamese or English | New labels are translated in both locale files |
| Build runs | `cd frontend; npm run build` passes |

## Verification

```powershell
cd frontend; npm run build
git diff --check
rg -n "NEEDS_TRANSLATION|NEEDS_REVIEW" frontend/src/i18n
rg -n "/api/analytics|/api/sql-query" frontend/api frontend/hooks frontend/components frontend/src/routes
```
