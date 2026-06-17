# Tasks: AI Chat Manual Edit

## Implementation Tasks

- [x] 1. Refactor parse endpoint into draft-only behavior
  - Files/areas: `frontend/server.ts`
  - Details:
    - Keep Gemini parsing and auth.
    - Resolve account/category/payee IDs where available.
    - Stop creating standard transactions during parse.
    - Stop auto-creating accounts/payees during parse.
    - Preserve invalid-input `422`.
  - Verification:
    - `rg -n "parse-transaction|gemini-3.1-flash-lite|/api/transactions" frontend/server.ts`

- [x] 2. Add transaction draft state and validation
  - Files/areas: `frontend/components/dashboard/AIChatWidget.tsx`
  - Details:
    - Convert parsed standard transactions into local draft form state.
    - Validate amount, type, account, category, and date before save.
    - Keep validation local; do not call Gemini again.
  - Verification:
    - Manual test with a valid income prompt and an intentionally incomplete draft.

- [x] 3. Add compact editable draft UI to the AI card
  - Files/areas: `frontend/components/dashboard/AIChatWidget.tsx`
  - Details:
    - Render editable controls for amount, type, category, account, date, note, and location.
    - Show editable controls immediately instead of requiring a separate preview/edit step.
  - Verification:
    - Manual test editing each field before confirm.

- [x] 4. Save confirmed transaction drafts through existing transaction API
  - Files/areas: `frontend/components/dashboard/AIChatWidget.tsx`, `frontend/api/transactions.ts`, `frontend/hooks/useTransactions.ts`
  - Details:
    - Reuse `useAddTransaction()` or `transactionsApi.addTransaction()`.
    - Invalidate/refetch `['transactions']` and `['accounts']`.
    - Mark the chat entry confirmed only after save succeeds.
  - Verification:
    - Confirmed edited draft appears in Transactions route and dashboard totals refresh.

- [x] 5. Preserve debt and savings behavior
  - Files/areas: `frontend/components/dashboard/AIChatWidget.tsx`, `frontend/server.ts`
  - Details:
    - Keep debt/savings operation types parsed.
    - Preserve picker behavior when matching is ambiguous.
    - Avoid silent writes before explicit confirm/picker selection.
    - Allow manual edits for new debts, debt payments, new savings goals, and savings contributions.
  - Verification:
    - Manual test debt payment without a clear match.
    - Manual test savings contribution without a clear match.

- [x] 6. Add i18n labels and errors
  - Files/areas: `frontend/src/i18n/locales/en/common.json`, `frontend/src/i18n/locales/vi/common.json`
  - Details:
    - Add edit/apply/back/validation labels.
    - Keep locale files synchronized.
  - Verification:
    - `rg -n "NEEDS_TRANSLATION|TODO_TRANSLATION" frontend/src/i18n`

- [x] 7. Update steering after implementation
  - Files/areas: `.kiro/steering/ai-voice-rules.md`, `.kiro/steering/api-contract.md`
  - Details:
    - Document parse-draft-confirm flow.
    - Document that parse must not silently persist standard transactions.
  - Verification:
    - `rg -n "parse-draft|save data|parse-transaction" .kiro/steering`

## Final Verification

- [x] `cd frontend; npm run build`
- [x] `git diff --check`
- [x] `rg -n "gemini-3.1-flash-lite|parse-transaction|rec.lang" frontend/server.ts frontend/components`
- [x] `rg -n "NEEDS_TRANSLATION|TODO_TRANSLATION" frontend/src/i18n`
- [x] Manual hook `.kiro/manual-hooks/04-pre-commit-review.md` completed
