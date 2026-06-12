# Design: Dashboard Chart Data Correctness

## Approach

Keep the fix inside the dashboard chart layer and existing dashboard route composition.

The implementation will normalize chart input data before calculations, then derive chart-specific datasets from those normalized records. This fits the current architecture because dashboard data already comes from shared TanStack Query hooks and `DynamicChart.tsx` already owns the chart transformations.

No new API endpoint, backend query, schema migration, or chart library is required.

The main implementation idea is:

1. Normalize IDs and dates at the chart boundary.
2. Compute historical account balances from account `initial_balance` plus transaction history.
3. Add current snapshot offsets for savings and debts only with clear UI wording.
4. Bucket time-series data according to selected date span.
5. Keep time range controls only for time-series charts.
6. Group hidden distribution values into `Other` / `Khác`.
7. Remove or explicitly keep stale chart inputs.

## Interfaces

### Components

`frontend/components/dashboard/DynamicChart.tsx`

- Keep existing public role as the dashboard's dynamic chart renderer.
- Refine props to only include data actually used by active chart modes.
- Add internal helpers for:
  - ID normalization
  - date parsing
  - transaction ordering
  - time bucket selection
  - distribution top-N grouping
  - empty state detection

`frontend/src/routes/_authenticated/index.tsx`

- Pass only chart data needed by `DynamicChart`.
- Avoid passing stale precomputed values if `DynamicChart` no longer uses them.

### Locale Files

`frontend/src/i18n/locales/en/common.json`

`frontend/src/i18n/locales/vi/common.json`

Add or adjust keys for:

- snapshot wording for asset chart
- `Other` / `Khác`
- empty chart states
- separate debt owed and money lent labels
- bucket/time labels if needed

### Data Semantics

ID comparison:

- Convert comparable IDs with `String(value)` before joining.
- Do not rely on strict equality between raw API values for IDs.

Historical account balance:

- Start each account from `initial_balance`.
- Apply transactions from oldest to newest.
- Income increases the account balance.
- Expense decreases the account balance.
- Expense follows the same balance direction currently used by the app's dashboard/account calculations.

Total asset trend v1:

- Historical account balances are calculated by date.
- Current savings goal amounts and current active debt/loan balances are snapshot offsets.
- The chart label/tooltip must make clear that non-account values are current snapshot adjustments, not fully historical reconstructed values.

Time bucket granularity:

| Span | Bucket |
|---|---|
| 0-31 days | daily |
| 32-180 days | weekly |
| 181-730 days | monthly |
| More than 730 days | quarterly |

The selected bucket must apply to preset ranges and custom ranges.

Distribution grouping:

- Keep the current top visible items limit.
- Sum remaining items into a single `Other` / `Khác` item.
- Include that grouped item in chart data, legend, tooltip, and total calculations.

## Data Flow

1. Dashboard route loads accounts, transactions, budgets, savings, and debts through existing hooks.
2. Dashboard route passes normalized source arrays into `DynamicChart`.
3. `DynamicChart` chooses the active chart mode from the selected metric/card.
4. For time-series chart modes:
   - Resolve selected preset/custom date window.
   - Choose bucket granularity from the actual date span.
   - Build historical account balance points.
   - Add clearly labeled current snapshot offsets when needed.
   - Render chart, brush, axis, tooltip, and summary.
5. For distribution/current-state chart modes:
   - Do not render time range controls.
   - Calculate values from the relevant current or filtered source data.
   - Group hidden values into `Other` / `Khác`.
6. Empty datasets render a chart empty state rather than a misleading flat line or zero-only graph.

## Edge Cases

- Mixed ID types from API responses must still join correctly.
- Missing `account_id`, `category_id`, or invalid dates should not crash the chart.
- Transactions outside the selected range can still affect starting balance for a historical account chart because balances are cumulative.
- Custom range start date after end date should be handled by swapping or rejecting the range in UI behavior.
- Single-point ranges should render a stable point/tooltip instead of a broken line.
- No transactions/accounts/savings/debts should render an empty state.
- More categories than visible chart entries must preserve totals through the `Other` bucket.
- Locale switching must update chart labels and tooltips without remount assumptions.

## Compatibility

- Uses existing frontend hooks and query keys.
- Does not change Flask API contracts.
- Does not add database fields.
- Does not modify auth behavior.
- Does not edit generated `frontend/src/routeTree.gen.ts`.
- Must use `useLocaleFormat()` for currency/date formatting.
- Must keep English and Vietnamese locale files synchronized.
- Must use existing Recharts and `frontend/styles/tokens.ts` color tokens.
- Must preserve existing dashboard card selection behavior.
