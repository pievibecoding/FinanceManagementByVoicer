# Tasks: Future Interaction Ideas

## Implementation Tasks

- [x] 1. Add URL-backed transaction filter model
  - Files/areas: `frontend/src/routes/_authenticated/transactions/index.tsx`, `frontend/components/transactions/FilterPanel.tsx`
  - Verification: URL params parse correctly and filters survive reload.

- [x] 2. Upgrade Transactions filter UI to multi-select
  - Files/areas: `FilterPanel.tsx`, locale files, optional shared filter helper
  - Verification: multiple types/categories/accounts can be selected and removed independently.

- [x] 3. Add active filter chips and clear-all action
  - Files/areas: `FilterPanel.tsx`, transactions route
  - Verification: chips match active URL params and clear actions update the list.

- [x] 4. Wire dashboard budget cards to Transactions deep links
  - Files/areas: `frontend/components/dashboard/BudgetOverview.tsx`, `frontend/src/routes/_authenticated/index.tsx`
  - Verification: clicking a budget card navigates to Transactions with category and month filters active.

- [x] 5. Add click-to-edit behavior to Accounts cards
  - Files/areas: `frontend/src/routes/_authenticated/accounts/index.tsx`, `frontend/components/accounts/AccountCard.tsx`
  - Verification: card body opens edit; action buttons do not double-trigger.

- [x] 6. Add click-to-edit behavior to Debts and Savings cards
  - Files/areas: `frontend/src/routes/_authenticated/debts/index.tsx`, `frontend/src/routes/_authenticated/savings/index.tsx`
  - Verification: row/card body opens edit; pay/history/delete/contribute actions remain isolated.

- [x] 7. Add click-to-edit behavior to Categories and Budgets cards
  - Files/areas: `frontend/src/routes/_authenticated/categories/index.tsx`, `frontend/src/routes/_authenticated/budgets/index.tsx`, matching card components
  - Verification: card body opens edit; delete buttons do not double-trigger.

- [x] 8. Build category icon picker
  - Files/areas: category add/edit modals, new shared icon options file if useful, locale files
  - Verification: create/edit can select icons from UI and preview the selected icon.

- [x] 9. Add shared category display metadata helper
  - Files/areas: `frontend/lib` or `frontend/components/categories`, chart components
  - Verification: helper returns stable name/color/icon with fallback behavior.

- [x] 10. Apply category colors to dashboard charts
  - Files/areas: `frontend/components/dashboard/DynamicChart.tsx`
  - Verification: expense allocation colors match category colors when available.

- [x] 11. Apply category colors to analytics charts
  - Files/areas: `frontend/components/analytics/*`
  - Verification: category-based analytics visuals use category colors consistently.

- [x] 12. Update i18n
  - Files/areas: `frontend/src/i18n/locales/en/common.json`, `frontend/src/i18n/locales/vi/common.json`
  - Verification: English and Vietnamese keys remain in sync.

## Final Verification

- [x] `cd frontend && npm run build`
- [x] `git diff --check`
- [x] `rg -n "types|categories|accounts|start|end|q" frontend/src/routes/_authenticated/transactions frontend/components/transactions frontend/components/dashboard/BudgetOverview.tsx`
- [x] `rg -n "stopPropagation|onClick" frontend/src/routes/_authenticated frontend/components`
- [x] Manual hook `.kiro/manual-hooks/04-pre-commit-review.md` completed
