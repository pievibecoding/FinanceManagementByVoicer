# Requirements: Dashboard Chart Data Correctness

## Goal

Improve dashboard chart correctness, readability, and user trust after the chart redesign.

The charts should keep the same business content, but the data must be interpreted consistently across accounts, transactions, savings, debts, and selected time ranges. When the app cannot reconstruct true historical values from available data, the UI must avoid presenting snapshot-based values as fully historical facts.

## Current State

The dashboard currently uses client-side data from existing shared hooks:

- `useAccounts()`
- `useTransactions()`
- `useBudgets()`
- `useSavings()`
- `useDebts()`

`frontend/components/dashboard/DynamicChart.tsx` now supports multiple chart types, range controls, custom date windows, and a brush for time-series charts.

Known issues and constraints:

- The net worth chart can appear flat even when transactions exist because transaction/account joins may compare IDs with different runtime types, such as string vs number.
- Account balances can be reconstructed over time from `initial_balance` plus transaction history.
- Savings goals and debts are currently available as current snapshots, not complete historical daily balances.
- Distribution charts do not need time range controls unless their data is explicitly filtered by time.
- Long time ranges can become visually dense if every point is displayed as a daily bucket.
- Some distribution legends show only top items and can hide the remaining amount without a visible "Other" bucket.
- Debt and loan values can be confusing if they are summarized as one net number instead of being shown as separate obligations and receivables.
- Some props/chart modes appear unused or stale after the redesign and may make future chart changes harder to reason about.

## Requirements

- REQ-1: Chart data joins must normalize comparable IDs before matching records.
  - Account, transaction, category, debt, and savings IDs must not fail to match because one side is a string and the other is a number.
  - Transaction effects must be applied to the correct account when computing historical account balances.

- REQ-2: The asset fluctuation chart must show real movement when transaction history changes account balances.
  - Income transactions must increase the affected account balance from their transaction date onward.
  - Expense transactions must decrease the affected account balance from their transaction date onward.
  - Investment transactions must follow the existing app's balance semantics and be documented in the implementation design.

- REQ-3: The chart must clearly define what "total assets" means with the current data model.
  - If the value includes historical account balances plus current savings/debt snapshots, the UI must not imply that savings and debts are fully reconstructed historically.
  - If the app cannot calculate true historical total assets, the label, tooltip, or chart description must make the limitation clear.

- REQ-4: Time-series charts must choose bucket granularity based on selected range.
  - Short ranges should preserve daily detail.
  - Longer ranges should aggregate into weekly or monthly buckets to prevent overcrowded axes and unreadable tooltips.
  - Custom ranges must choose bucket granularity from the actual selected span.

- REQ-5: Time range controls must appear only on charts where the selected time window changes the data meaningfully.
  - Distribution/current-state charts must not show time range controls unless their values are filtered by date.
  - Time-series charts must keep range controls and custom date selection.

- REQ-6: Distribution charts must not silently hide non-top categories.
  - If the chart limits visible slices/bars, the remaining value must be grouped into an "Other" bucket.
  - The grouped value must be included in totals, legends, and tooltips.
  - English and Vietnamese labels must stay in sync.

- REQ-7: Debt and loan chart summaries must avoid ambiguous netting.
  - Total debt owed and total money lent must be shown as separate concepts.
  - If a net value is shown, it must be secondary to the separate values.

- REQ-8: Empty and sparse data states must remain understandable.
  - A chart with no data must show an empty state rather than misleading zero-filled trends.
  - Sparse data should still show stable axes and useful tooltips.

- REQ-9: Chart formatting must stay locale-aware.
  - Currency and dates must use existing locale utilities instead of hardcoded locale strings.
  - English and Vietnamese translation files must include matching keys for new or changed chart text.

- REQ-10: The chart implementation must remove or intentionally document stale chart inputs.
  - Unused props, unused chart modes, or dead calculation branches introduced by earlier versions must be removed if not needed.
  - If a currently unused chart mode is kept for future use, the design must explain why it remains.

## Out Of Scope

- Replacing Recharts with another chart library.
- Creating new backend analytics endpoints.
- Rebuilding the Analytics page that currently calls missing `/api/analytics/*` endpoints.
- Adding a full historical ledger for savings goals and debts.
- Migrating database schema.
- Changing authentication, AI parsing, accounts CRUD, transactions CRUD, savings CRUD, or debts CRUD outside what is required for dashboard chart correctness.
- Committing or pushing changes.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| Account IDs have mixed string/number runtime types | Transactions still apply to the correct account in chart calculations. |
| A user has income and expense transactions across several months | The asset fluctuation chart changes over time instead of remaining flat. |
| The asset chart includes current savings or debt snapshots | The UI makes clear whether those values are historical or current snapshot offsets. |
| User selects 1 week or 1 month | Time-series charts preserve daily-level detail. |
| User selects 6 months, 1 year, all time, or a long custom range | Time-series charts aggregate points enough to keep axes readable. |
| User opens a distribution chart | No unused time range control is shown. |
| More categories exist than the chart displays directly | Remaining values appear as "Other" / "Khác" with correct totals. |
| Debt and loan data both exist | The dashboard shows owed debt and lent money separately, without making net debt the only visible summary. |
| A chart has no source data | The user sees a clear empty state instead of a misleading flat or zero chart. |
| App language changes | New chart labels, legends, and tooltip text are translated consistently in English and Vietnamese. |

## Verification

```powershell
cd frontend; npm run build
git diff --check
```

Additional checks for this feature:

```powershell
rg "vi-VN|en-US" frontend/components/dashboard frontend/hooks frontend/src/routes/_authenticated/index.tsx
rg "expenseByCategory|monthlyNetWorth|net-savings-trend" frontend/components/dashboard/DynamicChart.tsx frontend/src/routes/_authenticated/index.tsx
```
