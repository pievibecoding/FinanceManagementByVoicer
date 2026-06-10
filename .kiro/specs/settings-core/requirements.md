# Requirements: Settings Core Pages

## Goal

Replace empty Settings-related routes with useful, production-looking frontend pages for account/profile, notifications, help, and billing/upgrade entry points.

The feature should make the sidebar Settings group and account popup feel complete without adding backend persistence in v1.

## Current State

The following routes currently show only placeholder text:

- `/settings`
- `/settings/notifications`
- `/help`

The account popup includes these settings-related entries:

- Account -> `/settings`
- Billing -> `/settings`
- Notifications -> `/settings/notifications`
- Upgrade Pro -> currently present as a menu item without a useful destination/action

Available frontend state:

- Auth user data is available from `useAuth()`: user id, email, display name.
- Language switching already exists via `LanguageSubMenu`.
- Theme switching exists via `ThemeSwitch`.
- i18n files exist in English and Vietnamese.

Known constraints:

- Do not add backend routes.
- Do not modify database schema.
- Do not edit generated `routeTree.gen.ts`.
- Keep English and Vietnamese locale files synchronized.
- Match the existing dark purple/gold app theme and shadcn/Tailwind style.

## Requirements

- REQ-1: `/settings` must become a real Account/Profile settings page.
  - Show current user name, email, and user id.
  - Show a profile summary card with avatar fallback initials.
  - Show account status/plan as Personal Finance.
  - Show language settings using the existing language switcher behavior.
  - Show theme settings using the existing theme switch behavior.
  - Show a billing/plan section that explains billing is not active in v1.
  - Do not imply profile edits are saved to backend unless save behavior exists.

- REQ-2: `/settings/notifications` must become a real notification preferences page.
  - Show preference groups such as budget alerts, debt reminders, savings progress, monthly summary, and AI transaction confirmations.
  - Controls may be local-only in v1.
  - The page must clearly avoid claiming server delivery exists.
  - UI state should be usable during the session without throwing errors.

- REQ-3: `/help` must become a useful Help Center page.
  - Include searchable or scannable help sections for core workflows:
    - adding transactions
    - budgets
    - debts
    - savings
    - categories
    - dashboard charts
    - AI voice/text assistant
  - Include FAQ-style content.
  - Include support/contact placeholder text without pretending a real support backend exists.

- REQ-4: Account popup settings entries must route to meaningful destinations.
  - Account opens `/settings`.
  - Billing opens `/settings` and lands on or visually exposes the billing/plan section.
  - Notifications opens `/settings/notifications`.
  - Upgrade Pro must either route to the billing/plan section or show a clear non-destructive informational state.
  - No settings popup item should appear clickable but do nothing.

- REQ-5: The Settings sidebar group must remain coherent.
  - Profile, Notifications, Help Center, and Sign Out must keep their current navigation roles.
  - Labels must use i18n keys.
  - User-created names/emails must not be translated.

- REQ-6: UI must match the current app style.
  - Use existing `Card`, `Button`, `Switch`, `Tabs`, `DropdownMenu`, `Avatar`, and related UI primitives where appropriate.
  - Avoid landing-page/marketing layout.
  - Use dense, settings-style sections suitable for repeated account management.
  - No nested cards unless needed for repeated settings rows.

- REQ-7: The implementation must not add fake persistence that misleads users.
  - Local-only controls should be marked as local/session/demo preferences if they cannot be saved.
  - Do not add toast success messages saying settings were saved to the server.
  - Do not create API wrappers for endpoints that do not exist.

- REQ-8: i18n must be complete.
  - Add matching English and Vietnamese keys for all new labels, descriptions, section titles, empty states, and help content.
  - Remove or stop using old `Coming Soon` page text for these routes.

## Out Of Scope

- Backend profile update endpoint.
- Password change flow.
- Email change flow.
- Real notification delivery.
- Billing provider integration.
- Subscription checkout.
- Database migration.
- Analytics page repair.
- New authentication model.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User opens `/settings` | They see a complete profile/account settings page, not placeholder text. |
| User opens `/settings/notifications` | They see notification preference controls grouped by finance workflow. |
| User opens `/help` | They see useful help content for the current app features. |
| User clicks Account in account popup | Navigates to `/settings`. |
| User clicks Billing in account popup | Opens a meaningful billing/plan section instead of the same generic placeholder. |
| User clicks Upgrade Pro | Gets a clear plan/upgrade state without broken navigation. |
| User switches language | New settings/help/notification labels appear in the selected language. |
| No backend settings API exists | Pages still work without network errors or invented endpoints. |

## Verification

```powershell
cd frontend; npm run build
git diff --check
rg -n "Coming Soon|settingsComingSoon|notificationsComingSoon|helpComingSoon" frontend/src/routes frontend/components
rg -n "/api/settings|/api/profile|/api/billing|/api/notifications" frontend
```
