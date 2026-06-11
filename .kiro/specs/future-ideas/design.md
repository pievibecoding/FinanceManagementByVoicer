# Design: Future Interaction Ideas

## Approach

Implement the ideas as a frontend interaction polish pass. Keep data fetching aligned with existing hooks and API contracts:

- Use URL search params for Transactions filters.
- Keep transaction filtering client-side over `useTransactions()`.
- Reuse existing edit modals/dialogs on feature routes.
- Introduce shared helpers for category display metadata so charts and cards resolve category name/icon/color consistently.
- Prefer existing shadcn/Radix UI primitives already in the repo for picker/dropdown behavior.

## Interfaces

### Transactions URL Filters

Proposed query params:

- `types=income,expense`
- `categories=1,2,3`
- `accounts=1,5`
- `start=YYYY-MM-DD`
- `end=YYYY-MM-DD`
- `q=search text`

Rules:

- Filter groups combine with AND.
- Values inside `types`, `categories`, and `accounts` combine with OR.
- Empty or missing params mean no filter for that group.

### Dashboard Budget Deep Link

`BudgetOverview` should accept an optional click handler or route navigation dependency:

```ts
onBudgetCardClick?: (params: {
  categoryId: string
  month: string
}) => void
```

The dashboard route can translate that into Transactions URL params.

### Card Edit Interaction

Cards on item routes should expose body click behavior:

```ts
onEditOpen: (item) => void
```

Secondary action buttons must call `event.stopPropagation()`.

### Category Icon Picker

Create a small shared category icon list, for example:

```ts
type CategoryIconOption = {
  value: string
  labelKey: string
  groupKey?: string
}
```

The picker can use `Popover` + `Command` or `Select`, depending on expected icon count.

### Category Display Metadata

Create a shared helper for resolving category metadata:

```ts
type CategoryDisplayMeta = {
  id: string
  name: string
  color: string
  icon?: string
}

function getCategoryDisplayMeta(
  categoryId: string | number,
  categories: Category[],
  fallbackIndex?: number
): CategoryDisplayMeta
```

## Data Flow

### Dashboard To Transactions

1. User clicks a budget card in Dashboard.
2. Dashboard builds query params from category id and selected budget month.
3. Router navigates to `/transactions`.
4. Transactions route reads URL params.
5. Existing `useTransactions()` fetches all user transactions.
6. Client-side filters apply category/date range and render matching transactions.

### Transactions Filters

1. Filter controls update URL params.
2. Route parses params into a normalized filter model.
3. `useMemo` filters the existing transaction list.
4. Active filter chips render from the same normalized model.

### Click Card To Edit

1. Card body receives click/keyboard activation.
2. Route sets existing edit modal state to the clicked item.
3. Nested buttons stop propagation and run their own action.

### Category Colors In Charts

1. Chart receives transactions and categories.
2. Chart aggregation groups by category id.
3. Shared helper resolves category name/color/icon.
4. Recharts receives category color when valid, fallback palette otherwise.

## Edge Cases

- Unknown category id in URL: show no matching category chip or show a fallback `#id` label, but do not crash.
- Deleted/missing category referenced by old transactions: use fallback label and fallback color.
- Invalid hex/color string: ignore and use fallback palette.
- Empty filters: show all transactions.
- Query params with duplicate values: normalize and de-duplicate.
- Card secondary actions: all must stop event propagation.
- Touch devices: card click target must remain usable without requiring hover.
- Keyboard users: cards should use button semantics or `role="button"` with keyboard handlers if the root element is not a button.

## Compatibility

- Must preserve shared transaction cache key `['transactions']`.
- Must keep English and Vietnamese locale files synchronized.
- Must not add frontend calls to unbacked account/category mutator routes unless backend support is implemented first.
- Must not modify `frontend/src/routeTree.gen.ts` manually.
- Must use `useLocaleFormat()` for date/currency display.
- Category colors used in Recharts should come from category data first and `frontend/styles/tokens.ts` fallbacks second.
