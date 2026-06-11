# Requirements: UI/UX System Polish

## Goal

Standardize and improve the whole frontend UI/UX so the app feels like one coherent personal finance product instead of a mix of separately styled screens.

The work should improve visual consistency, chart reliability, form/modal usability, responsive behavior, and accessibility without changing backend contracts or business logic.

## Current State

The app already has:

- Authenticated app layout with sidebar navigation and account popup.
- Dashboard with metric cards, dynamic charts, budget overview, and AI assistant widget.
- CRUD-style pages for transactions, accounts, budgets, categories, debts, and savings.
- Settings, notifications, and help pages with usable frontend-only UI.
- English and Vietnamese i18n files.
- Theme tokens in `frontend/styles/theme.css`.
- Recharts/inline color tokens in `frontend/styles/tokens.ts`.
- shadcn/ui primitives under `frontend/components/ui`.

Known UI/UX issues:

- Visual style is inconsistent across routes.
- Some screens use shadcn primitives while others use hand-written modal/card/select/button patterns.
- Several colors are hard-coded in components instead of using theme tokens.
- Auth screens still use older `zinc`/`emerald` styling that does not match the current neon aqua/purple concept.
- Some chart behavior has been fragile, especially pie chart tooltip positioning and layout sizing.
- Some global CSS selectors affect too many components, making card/chart behavior difficult to control.
- Native dropdown/select styling has caused contrast issues in the past.
- Light mode and dark mode may not be equally polished because many component styles are dark-mode-oriented.
- Some routes contain large inline component implementations, making UI consistency harder to maintain.

## Requirements

### REQ-1: Establish A Consistent UI Style System

- Define reusable frontend UI style patterns for:
  - app cards
  - interactive cards
  - stat/metric cards
  - chart cards
  - form fields
  - toolbar/filter surfaces
  - empty states
  - error states
  - modal/dialog content
- Interactive hover/active styles must apply only to interactive surfaces.
- Non-interactive chart/card containers must not receive click-like hover/active feedback.
- Avoid broad global selectors that unintentionally affect unrelated components.
- The implementation must continue to support Tailwind v4 and the existing shadcn setup.

### REQ-2: Standardize Color Tokens

- Use `frontend/styles/theme.css` as the source for CSS semantic tokens.
- Use `frontend/styles/tokens.ts` as the source for chart and inline hex values.
- Keep CSS tokens and TypeScript color tokens conceptually synchronized.
- Preserve the current concept:
  - dark mode: neon aqua and purple glassmorphism
  - light mode: `#FEFEFA` based background with aqua/periwinkle/purple accents
  - charts: professional pastel palette
- Remove or replace old hard-coded visual colors where practical, including:
  - `zinc`
  - `emerald`
  - old purple/pink rgba values
  - one-off `sky`, `amber`, `rose` usages where they conflict with semantic tokens
- Destructive/success/warning states may keep distinct semantic colors, but they must be tokenized or consistently defined.

### REQ-3: Improve Card Behavior And Visual Hierarchy

- Top dashboard metric cards must behave like selectable controls.
- Selected metric card state must be visually clear and use the purple concept color.
- Card text must remain readable in both selected and unselected states.
- Large currency values must fit without overflowing the card.
- Cards that are not clickable must not look clickable.
- Card hover/active effects must be subtle and consistent.
- Avoid nested card styling unless the inner card is a repeated item or a framed tool.

### REQ-4: Stabilize Dashboard Charts

- Dashboard charts must not render blank because of missing container dimensions.
- Chart containers must have explicit responsive sizing constraints.
- Time-series charts must keep period/range controls readable and usable.
- Distribution charts must not show time range controls.
- Pie/donut chart layout must keep:
  - chart body
  - center label
  - fixed legend
  - separator line
  - tooltip
  from overlapping each other.
- Pie/donut tooltips must remain within a safe chart area and avoid covering the legend, sidebar, or neighboring cards.
- Bar chart hover state must not show the default white, rectangular cursor.
- Chart hover state should use the app's glassmorphism concept where appropriate.
- Chart colors must use `frontend/styles/tokens.ts`.

### REQ-5: Standardize Forms, Selects, And Modals

- Prefer existing shadcn primitives for:
  - `Dialog`
  - `Button`
  - `Input`
  - `Select`
  - `Textarea`
  - `Checkbox`
  - `Switch`
  - `Tabs`
  - `DropdownMenu`
- Native `select` may remain only where replacing it would add too much scope, but it must have readable foreground/background in both themes.
- Modal/dialog implementations should have:
  - consistent spacing
  - accessible title/description
  - keyboard-friendly focus behavior
  - clear primary/secondary actions
  - readable error states
- Form controls must not use old color styling that conflicts with the new theme.

### REQ-6: Improve Route-Level UX Consistency

- Main app routes should share a predictable structure:
  - page title
  - primary action
  - optional filters/search
  - content list/grid/table
  - loading state
  - empty state
  - error state
- Empty states should explain what is missing and provide the next useful action when possible.
- Error states should be visible, concise, and not look like ordinary empty states.
- CRUD routes must keep important actions easy to find.
- User-created names, notes, category names, account names, debt names, and savings names must not be translated.

### REQ-7: Improve Auth Screen Consistency

- Login and registration screens must match the same visual concept as the authenticated app.
- Remove old standalone `zinc`/`emerald` visual style from auth forms.
- Inputs, buttons, links, dividers, and error messages must use the shared theme.
- Auth forms must remain simple and focused; do not turn them into marketing landing pages.

### REQ-8: Improve Responsive Behavior

- Dashboard, chart cards, tables, modals, sidebar, and account popup must be usable on mobile and desktop.
- Text must not overflow buttons, cards, tabs, or chart controls.
- Chart controls must wrap cleanly on narrow widths.
- Pie/donut legends must not crush the chart on smaller screens.
- Floating AI assistant must not block primary actions or important content on common mobile sizes.

### REQ-9: Preserve Existing Functional Behavior

- Do not change backend API contracts.
- Do not add migrations.
- Do not add new backend routes.
- Do not change authentication behavior.
- Do not change Gemini model configuration.
- Do not manually edit `frontend/src/routeTree.gen.ts`.
- Dashboard totals and chart data must continue to use existing hooks/data sources unless a later approved design explicitly changes them.
- Existing user workflows must continue to work:
  - sign in/sign up
  - add/edit/delete transactions
  - manage accounts
  - manage budgets
  - manage categories
  - manage debts
  - manage savings
  - use settings/help/notifications
  - use AI transaction assistant

### REQ-10: Maintain i18n Quality

- All new visible labels, descriptions, empty states, and button text must use i18n keys.
- English and Vietnamese locale files must stay synchronized.
- No user-generated data should be translated.
- Currency and date formatting must use existing locale formatting helpers.

### REQ-11: Add Practical Visual Regression Checks

- Add or document repeatable checks for common UI regressions:
  - dashboard chart renders non-empty
  - pie chart tooltip does not overflow obvious boundaries
  - selected metric card is readable
  - dropdown/select text is readable
  - modal content fits mobile viewport
  - light mode and dark mode have readable contrast
- Verification may use manual checks first, but the design should identify where automated Playwright screenshots are valuable.

## Out Of Scope

- Backend API changes.
- Database migrations.
- New billing provider integration.
- New authentication model.
- Rebuilding the entire app navigation model.
- Replacing Recharts with another chart library unless specifically approved later.
- Redesigning business logic or financial calculations.
- Adding new product features unrelated to UI/UX consistency.
- Fixing analytics backend contracts unless approved as a separate analytics task.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User opens dashboard in dark mode | Metric cards, chart card, budget overview, sidebar, and AI widget feel visually consistent. |
| User opens dashboard in light mode | Background, cards, text, controls, and charts remain readable and intentional. |
| User selects a dashboard metric card | Selected card clearly changes state without text overflow. |
| User hovers pie/donut chart | Tooltip stays within a safe chart area and does not cover legend/sidebar/neighboring cards. |
| User hovers bar chart | No default white rectangular cursor appears; hover feedback matches app style. |
| User opens CRUD modals | Dialogs look consistent, are keyboard-friendly, and use shared controls. |
| User opens dropdown/select controls | Text and background have readable contrast in both themes. |
| User opens auth pages | Login/register screens match the app's visual concept. |
| User views routes on mobile | Main content remains usable without broken overlap or unreadable controls. |
| Developer searches for old colors | Hard-coded legacy colors are reduced or justified. |
| Developer switches language | New UI copy appears in both English and Vietnamese. |

## Verification

Required baseline verification:

```powershell
cd frontend; npm run build
git diff --check
```

Recommended UI consistency searches:

```powershell
rg -n "zinc|emerald|sky|amber|rose|#[0-9a-fA-F]{3,8}|rgba\(" frontend/components frontend/src frontend/styles
rg -n "Coming Soon|TODO|stub" frontend/src/routes frontend/components
rg -n "<select|<dialog|fixed inset-0" frontend/components frontend/src/routes
```

Recommended manual QA routes:

- `/sign-in`
- `/sign-up`
- `/`
- `/transactions`
- `/accounts`
- `/budgets`
- `/categories`
- `/debts`
- `/savings`
- `/analytics`
- `/settings`
- `/settings/notifications`
- `/help`

Recommended viewport checks:

- Desktop: `1440x900`
- Desktop wide: `1920x1080`
- Tablet: `768x1024`
- Mobile: `390x844`

## Notes For Later Design

- The design should decide whether to introduce wrapper components such as:
  - `AppCard`
  - `InteractiveCard`
  - `StatCard`
  - `ChartCard`
  - `PageHeader`
  - `EmptyState`
  - `FormDialog`
- The design should identify which components can be migrated safely first.
- The tasks should be incremental and avoid one large all-app rewrite.
