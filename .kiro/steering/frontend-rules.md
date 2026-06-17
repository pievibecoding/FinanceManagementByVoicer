# Frontend Rules

Use this for React, routes, components, hooks, i18n, and UI changes.

## Architecture

- `@/` resolves to `frontend/`, not `frontend/src/`.
- Use TanStack Router route files under `frontend/src/routes`.
- Do not manually edit `frontend/src/routeTree.gen.ts`.
- Auth state comes from `contexts/AuthContext.tsx` and `useAuth()`.
- Do not recreate a Zustand auth store.

## Data Fetching

- Prefer existing API wrappers in `frontend/api`.
- Prefer existing TanStack Query hooks in `frontend/hooks`.
- Reuse query keys; do not duplicate `['transactions']`.
- Dashboard totals must use existing shared hooks where possible.
- Some existing wrappers/hooks are ahead of the Flask API: account update/delete are not backed. Verify `.kiro/steering/api-contract.md` before wiring mutators into UI.

## UI

- Match existing shadcn/Tailwind patterns.
- Keep changes scoped to the requested workflow.
- Do not add marketing/landing-page patterns to app screens.
- For charts, use `frontend/styles/tokens.ts` for Recharts hex values and CSS tokens for Tailwind classes.
- Dashboard `DynamicChart.tsx` aggregates from raw transactions/accounts/categories/savings/debts and owns range, bucket, custom-date, donut tooltip, and Brush interaction state. Keep new chart behavior in that component unless the contract is intentionally redesigned.

## i18n

- Use `react-i18next` and keys in `frontend/src/i18n/locales/*/common.json`.
- Keep English and Vietnamese locale files in sync.
- User-created names, notes, category names, account names, debt names, and savings names are data and should not be translated.
- Use `useLocaleFormat()` for currency/date formatting instead of hardcoded `vi-VN`.

## Verification

```powershell
cd frontend; npm run build
git diff --check
```
