# Requirements: AI Chat Manual Edit

## Goal

Let users review and manually correct AI-generated finance entries before anything is persisted, so the AI chat widget stays fast while users retain control over financial data accuracy.

## Current State

- `frontend/components/dashboard/AIChatWidget.tsx` sends user text or voice input to `POST /api/parse-transaction`.
- `frontend/server.ts` handles `/api/parse-transaction` by calling Gemini, resolving account/category/payee data, and persisting some operation types through Flask REST APIs.
- The AI card in `AIChatWidget` should behave as an editable draft before saving.
- `confirmEntry()` mostly invalidates transaction/account queries for normal transactions, while debt and savings flows have additional picker behavior.
- `AddTransactionModal` and `EditTransactionModal` already define the fields and validation shape for manual transaction forms.
- Steering currently documents the old parser behavior where Express calls Gemini and then saves through Flask. This must be updated when the implementation changes.

## Requirements

- REQ-1: AI parsing must produce a user-editable draft instead of silently persisting a standard transaction.
- REQ-2: A standard transaction must be persisted only after the user confirms the editable draft.
- REQ-3: The AI draft card must expose clear actions for unresolved drafts:
  - Confirm
  - Cancel
- REQ-4: The initial AI card must render editable controls for the fields needed to create a standard transaction:
  - Amount
  - Type
  - Category
  - Account
  - Transaction date
  - Note
  - Location
- REQ-5: Manual edits must not trigger another Gemini request.
- REQ-6: Edited drafts must use existing account/category data where possible and submit through the existing transaction persistence path.
- REQ-7: The UI must validate required fields before saving:
  - Amount must be a positive number.
  - Account must be selected.
  - Category must be selected.
  - Type must be `income` or `expense`.
  - Date must be present.
- REQ-8: Cancelling a draft must not create a transaction, account, payee, debt, or savings record as a side effect.
- REQ-9: The implementation must provide manual edit mode for standard transactions, new debts, debt payments, new savings goals, and savings contributions.
- REQ-10: AI bill cards must show cash flow direction (`source → destination`) whenever the operation moves money through an account.
- REQ-11: Savings contributions, debt payments, borrowing, and lending operations must create `transfer_in` or `transfer_out` transactions when they affect an account balance.
- REQ-12: Transfer transactions must be visible in Transactions but excluded from income/expense summaries and expense allocation.
- REQ-13: Ambiguous debt matching must continue to use the existing picker pattern instead of silently choosing the wrong record.
- REQ-13a: Savings contributions must resolve to an existing destination savings goal by `savings_id`; if parsing cannot match one confidently, the draft must require the user to choose a destination fund before confirmation.
- REQ-14: New UI labels and validation messages must be translated in both English and Vietnamese locale files.
- REQ-15: The Gemini model name must remain `gemini-3.1-flash-lite`.
- REQ-16: `GEMINI_API_KEY` must remain server-side only.
- REQ-17: Flask remains the persistence boundary. The browser must not write directly to Turso.
- REQ-18: Query invalidation after saving must reuse existing query keys:
  - `['transactions']`
  - `['accounts']`
  - `['debts']`
  - `['savings']`
- REQ-19: Steering must be updated after implementation to describe the new parse-draft-confirm flow.

## Out Of Scope

- Replacing Gemini or changing the model.
- Adding voice recognition language switching.
- Building a full conversational correction loop such as "change that to MoMo" as a separate AI prompt.
- Redesigning the whole chat widget.
- Changing the Transactions route add/edit modal UX.
- Adding direct database writes from Express or the browser.

## Acceptance Criteria

| Scenario | Expected |
|---|---|
| User enters "nhan tien parttime 100k" | Widget shows an editable income draft and no transaction is saved yet |
| User presses Confirm on the draft | A transaction is created and dashboard/transaction data refreshes |
| User edits amount from 100,000 to 120,000 and confirms | The saved transaction amount is 120,000 |
| User changes account/category before confirming | The saved transaction uses the selected account/category IDs |
| User presses Cancel | No transaction is created and no new account/payee is auto-created |
| Gemini returns an invalid/non-finance response | The widget shows the existing error/rejection behavior |
| Debt payment has no reliable match | The existing debt picker appears before saving the debt payment |
| Savings contribution has no reliable match | The draft requires the user to select a destination fund before saving the contribution |
| User enters "chuyển 1tr tiền từ ocb sang quỹ mua xe" | Draft shows `OCB → quỹ mua xe`, confirm creates a linked `transfer_out`, and expense totals do not increase |
| User enters "tôi vay Hiền 500k vào tiền mặt" | Draft shows `Hiền → Tiền mặt`, confirm creates a `transfer_in`, and income totals do not increase |
| User enters "cho Nam mượn 1tr từ VCB" | Draft shows `VCB → Nam`, confirm creates a `transfer_out`, and expense totals do not increase |
| Locale is Vietnamese | New buttons/messages are Vietnamese |
| Locale is English | New buttons/messages are English |

## Verification

```powershell
cd frontend; npm run build
git diff --check
rg -n "gemini-3.1-flash-lite|parse-transaction|rec.lang" frontend/server.ts frontend/components
rg -n "NEEDS_TRANSLATION|TODO_TRANSLATION" frontend/src/i18n
```
