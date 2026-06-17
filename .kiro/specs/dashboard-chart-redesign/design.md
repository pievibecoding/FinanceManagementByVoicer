# Design: Dashboard Chart Redesign

## Approach

Keep this feature frontend-only and contained to the dashboard chart surface. The dashboard already fetches accounts, transactions, categories, budgets, debts, and savings through existing hooks, so the redesign should transform that data client-side.

Split `DynamicChart` into smaller local helpers or child components so presentation and data preparation are easier to reason about:

- A chart frame for common layout and visual hierarchy.
- A range control for time-series charts only.
- Data builders for daily net worth, income over time, income/expense over time, and distribution/current-state charts.
- Shared tooltip, empty state, and legend/list presentation.

Use Recharts because it is already installed and used. Use `Brush` for the stock-chart-like visible-window adjustment in V1. Do not implement server-side/infinite loading because `useTransactions()` already fetches all transactions client-side.

## Interfaces

### Component props

`DynamicChartProps` should keep the current external inputs from the dashboard route:

- `chartType`
- `transactions`
- `accounts`
- `categories`
- `expenseByCategory`
- `monthlyNetWorth`
- `savings`
- `debts`

`expenseByCategory` and `monthlyNetWorth` may become legacy props during the refactor if the chart computes current-month expense allocation and daily net worth from `transactions`. Do not change the dashboard hook contract unless a task explicitly covers cleanup.

### Chart behavior model

Introduce chart metadata inside `DynamicChart.tsx` or a nearby helper:

```ts
type ChartKind = 'time-series' | 'distribution' | 'current-state'
```

Metadata should define:

- title key
- kind
- whether range controls show
- default range
- whether brush is enabled
- whether the chart is allowed to render brush only when enough data points exist

### Range model

Use existing range presets and add custom:

```ts
type TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom'
type DateRange = { start: string; end: string }
```

Dates should be stored as `YYYY-MM-DD` strings for input compatibility, then converted to `Date` objects for filtering.

### i18n

Add matching keys to:

- `frontend/src/i18n/locales/vi/common.json`
- `frontend/src/i18n/locales/en/common.json`

Expected new concepts:

- Custom range
- Start date
- End date
- Total/current summary labels if introduced
- Empty state labels for range-specific no-data cases

## Data Flow

1. Dashboard route fetches data through existing hooks.
2. User clicks a metric card.
3. Dashboard maps the selected metric to a chart type and passes existing data to `DynamicChart`.
4. `DynamicChart` reads chart metadata.
5. If the chart is time-series:
   - Show preset/custom range controls.
   - Build the date window.
   - Build time-series points from transactions/accounts.
   - Optionally apply Recharts `Brush` to adjust the visible window.
6. If the chart is distribution/current-state:
   - Hide range controls.
   - Build data from the chart-specific current scope.
7. Render chart, tooltip, summary, empty state, and legend/list with shared styling.

## Data Transforms

### Daily net worth

For each date in the selected window:

1. Start with each account's `initial_balance`.
2. Apply all transactions with `transaction_date` less than or equal to that date.
3. Add the current active savings total as a constant offset for every point.
4. Subtract the current active debt total as a constant offset for every point.
5. Carry forward the prior day value when no transactions occur.

The initial value for a selected window must include transactions before the window start so the first day is an actual balance, not a reset.

This is not a full historical savings/debt reconstruction. The current hooks expose current savings and debt snapshots, not enough dated history to reconstruct their past daily balances reliably. The chart should keep user-facing behavior consistent with the dashboard net worth definition without adding backend/API work.

### Income over time

The existing `monthly-income-breakdown` chart may keep its internal chart type to reduce routing scope, but the visible title should become an income-over-time label if the implementation groups by the selected range rather than strictly by month.

For short ranges, group income by day. For longer ranges, grouping can remain daily in V1, with axis ticks formatted compactly enough to avoid overlap.

### Expense allocation

Use current-month expense transactions only. This matches the "monthly expense" metric card.

### Account distribution

Compute each account balance from `initial_balance` plus all transactions. Do not filter by date range.

### Savings breakdown

Use savings goals whose status is not `cancelled`.

### Debt breakdown

Use active debt and loan records, grouped into "I owe" and "owed to me" sections as the current chart does.

## Edge Cases

- No transactions in range: show a polished empty state.
- Custom start date after end date: disable apply or normalize dates so start <= end.
- One-day range: show a stable chart, not a broken axis.
- Brush with too few points: hide the brush and keep preset/custom filtering usable.
- Negative balances/net worth: keep values visible and format correctly.
- Zero-value donut data: show empty state instead of rendering invalid pie segments.
- Many categories/accounts: show top items in the legend/list and keep chart readable.
- Long Vietnamese labels: truncate in side list and show full value in tooltip.
- Mobile or narrow chart width: range controls wrap or collapse without overlapping chart content.

## Compatibility

- No backend/API changes.
- No changes to auth/data isolation.
- No changes to `frontend/src/routeTree.gen.ts`.
- No duplicate transaction query keys.
- Existing metric card click behavior remains.
- Existing chart colors remain in `frontend/styles/tokens.ts`; new chart colors must use that file if needed.
- New display text must be synced in English and Vietnamese locale files.
