# Design: UI/UX System Polish

## Approach

Implement the polish as an incremental frontend-only design system pass.

The core approach is:

1. Introduce explicit reusable UI surface patterns instead of relying on broad global selectors.
2. Keep the current neon aqua/purple concept, but route all common visual decisions through shared tokens/classes/components.
3. Stabilize dashboard charts with dedicated chart layout primitives before polishing the rest of the app.
4. Migrate the highest-impact screens first: dashboard, auth, CRUD modals/forms, and common route shells.
5. Preserve existing API calls, hooks, auth behavior, i18n behavior, and business calculations.

This fits the current architecture because the frontend already uses:

- Tailwind v4 and CSS variables in `frontend/styles/theme.css`.
- TypeScript color tokens in `frontend/styles/tokens.ts`.
- shadcn primitives in `frontend/components/ui`.
- route-level React components under `frontend/src/routes`.
- shared hooks for dashboard, transactions, accounts, budgets, debts, and savings.

The implementation should prefer small, reviewable migrations over a single all-app rewrite.

## Interfaces

No backend API, database, route tree, auth, or data contract interfaces will change.

Frontend-only interfaces may be introduced:

### Shared UI Components

New components may be added under `frontend/components/common` or a similar local folder:

- `PageHeader`
  - props: `title`, `description?`, `actions?`
- `EmptyState`
  - props: `icon?`, `title`, `description?`, `action?`
- `ErrorState`
  - props: `title`, `description?`, `action?`
- `AppCard`
  - wrapper around shadcn `Card` or a controlled card surface
  - props: `interactive?`, `selected?`, `variant?`
- `StatCard`
  - selected metric/stat card pattern
- `ChartCard`
  - consistent chart shell with header, summary, controls, content, empty state
- `FormDialog`
  - wrapper for common `Dialog` form layout

Exact props should be finalized during implementation and kept minimal.

### CSS Utility Classes

New stable classes may be defined in `frontend/styles/index.css`:

- `.app-surface`
- `.app-card`
- `.interactive-card`
- `.selected-card`
- `.chart-surface`
- `.form-surface`
- `.toolbar-surface`

These classes should replace broad selectors such as `.bg-card.border:hover` where practical.

### Token Additions

`frontend/styles/theme.css` may add semantic variables for:

- glass surface background
- glass hover background
- selected card background
- chart hover cursor
- success/warning/danger meter colors
- light/dark body gradient

`frontend/styles/tokens.ts` may expose matching JS values for:

- chart cursor color
- budget meter colors
- chart pastel series colors
- semantic success/warning/danger colors used inline

## Data Flow

No data flow changes are required.

Existing data should continue to flow as it does today:

- Dashboard data: existing dashboard/query hooks.
- Transactions/accounts/budgets/categories: existing API wrappers and TanStack Query hooks.
- Debts/savings: existing hooks.
- Auth user data: `useAuth()`.
- i18n text: `react-i18next` and `common.json`.
- Currency/date formatting: `useLocaleFormat()`.

Chart presentation changes should consume the same data structures currently passed into `DynamicChart`.

Form/modal migrations should keep the same submit handlers and mutation hooks. Only UI wrappers, layout, validation messaging, and visual states should change.

## Component Strategy

### Dashboard

Dashboard should become the reference implementation for the design system.

Key design decisions:

- Metric cards act like selectable controls and should use `StatCard`.
- Dynamic chart shell should use `ChartCard`.
- Distribution chart layout should reserve separate regions for:
  - chart SVG
  - center label
  - fixed legend
  - separator line
  - tooltip overlay
- Tooltip overlay should be bounded to the chart safe area.
- Bar chart cursor should use a glassmorphism fill token, not the default Recharts cursor.
- Budget meters should use tokenized success/warning/danger colors.

### Auth

Auth screens should not look like a separate product.

Key design decisions:

- Remove old `zinc`/`emerald` styling.
- Use the same body background, card surface, input, button, and error styles.
- Keep auth pages focused and compact.
- Do not introduce marketing hero layouts.

### CRUD Pages

CRUD routes should have predictable structure:

- `PageHeader`
- primary action button
- optional filter/search area
- content area
- loading/empty/error state
- dialog-based add/edit/delete flows

Modal migrations should prefer shadcn `Dialog` and existing `ConfirmDialog`.

### Forms And Selects

Use shadcn primitives where possible:

- `Input`
- `Textarea`
- `Select`
- `Button`
- `Dialog`
- `Checkbox`
- `Switch`

Native select may remain temporarily, but must be readable in both themes and documented as remaining debt.

### Light/Dark Mode

Light and dark mode must both be treated as first-class.

Implementation should avoid dark-only hard-coded colors. Any custom color should be a semantic token or be intentionally documented as chart/brand color.

## Edge Cases

- Long VND currency values in metric cards must not overflow.
- Long category/account/debt/savings names must truncate or wrap predictably.
- Pie/donut charts with many small segments must keep legend readable.
- Empty chart datasets must show useful empty states, not blank cards.
- Loading states should not cause layout jumps that hide primary content.
- Modal forms must fit small mobile screens.
- Account popup should not overflow mobile viewport.
- Native browser select styling can differ by OS/browser, so contrast must be checked manually if native selects remain.
- Recharts `ResponsiveContainer` requires explicit parent sizing; chart containers must not rely only on `min-height`.
- Global CSS changes can affect many surfaces; selectors should be scoped.

## Compatibility

### Backend/API

No backend/API changes. No migrations.

### Routing

Do not manually edit `frontend/src/routeTree.gen.ts`.

### Auth

Continue using `useAuth()` from `contexts/AuthContext.tsx`.

### i18n

All new visible strings must be added to both:

- `frontend/src/i18n/locales/en/common.json`
- `frontend/src/i18n/locales/vi/common.json`

User-generated data remains untranslated.

### Charts

Continue using Recharts.

Chart colors and inline chart styles must come from `frontend/styles/tokens.ts` or from CSS variables intentionally mirrored into tokens.

### Deployment

The existing build and start flow remains unchanged:

```powershell
cd frontend; npm run build
```

## Verification Strategy

Every implementation slice should run:

```powershell
cd frontend; npm run build
git diff --check
```

Targeted searches should be used after relevant slices:

```powershell
rg -n "zinc|emerald|sky|amber|rose|#[0-9a-fA-F]{3,8}|rgba\(" frontend/components frontend/src frontend/styles
rg -n "<select|fixed inset-0" frontend/components frontend/src/routes
rg -n "Coming Soon|TODO|stub" frontend/src/routes frontend/components
```

Manual QA should cover:

- dark mode and light mode
- dashboard chart interactions
- auth forms
- add/edit/delete dialogs
- dropdown/select readability
- mobile viewport behavior

Automated Playwright screenshot checks are recommended after the first polish pass, especially for dashboard desktop/mobile and modal mobile layouts.
