# Requirements: Future Interaction Ideas

## Goal

Improve navigation, filtering, editing, category customization, and chart consistency across the finance app without changing the backend data model unless later implementation discovers a real API gap.

This spec converts `.kiro/future-ideas.md` into implementation-ready requirements. It is not implemented yet.

## Current State

- Dashboard budget cards are rendered by `frontend/components/dashboard/BudgetOverview.tsx`.
- The dashboard route passes `selectedBudgetMonth` into `BudgetOverview`.
- Transactions route exists at `frontend/src/routes/_authenticated/transactions/index.tsx`.
- Transactions currently filter client-side using local state and `FilterPanel`.
- Transaction data should continue using the shared `useTransactions()` query key `['transactions']`.
- Accounts, categories, budgets, debts, and savings each have card-style item UIs and edit modals/dialogs.
- Category create/edit currently accepts icon/color data, but icon selection is still text/input oriented.
- Dashboard and analytics charts currently mix category colors from fallback palettes and category data.

## Requirements

- REQ-1: Dashboard budget cards must deep-link to the Transactions route with category and month filters applied.
- REQ-2: Transactions filtering must support multiple selected values per filter group.
- REQ-3: Transactions filter state must be visible, removable, and clearable.
- REQ-4: Transactions filter state should be URL-backed where practical so navigation and reloads preserve active filters.
- REQ-5: Cards on Accounts, Debts, Savings, Categories, and Budgets routes must open the matching edit popup when clicked.
- REQ-6: Secondary actions inside cards must not trigger the parent edit action.
- REQ-7: Category create/edit forms must provide an icon picker/dropdown instead of relying on free typing.
- REQ-8: User-selected category colors must drive category chart colors across dashboard and analytics charts.
- REQ-9: Invalid or missing category colors must fall back to the app chart palette from `frontend/styles/tokens.ts`.
- REQ-10: All new user-facing labels must be added to both English and Vietnamese locale files.

## Out Of Scope

- Backend schema changes.
- New analytics endpoints.
- Payee management UI.
- Changing transaction creation/editing behavior.
- Replacing the existing chart library.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User clicks a dashboard budget card for Food in March 2026 | App navigates to `/transactions` with Food and March 2026 filters active |
| User selects expense and income types in Transactions | Both transaction types are shown, other types are excluded |
| User selects multiple categories | Transactions matching any selected category are shown |
| User clears all filters | Transactions list returns to unfiltered state |
| User clicks an account/debt/savings/category/budget card body | The matching edit popup opens |
| User clicks delete/history/payment/contribution inside a card | Only that secondary action runs; edit popup does not also open |
| User creates/edits a category | Icon can be selected from a picker/dropdown and previewed |
| A category has a stored color | Dashboard and analytics category charts use that stored color |
| A category has no valid color | Charts use the existing fallback palette |

## Verification

```powershell
cd frontend; npm run build
git diff --check
```
