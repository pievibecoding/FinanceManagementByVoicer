# Design: AI Chat Manual Edit

## Approach

Change the AI chat flow from "parse and save immediately" to "parse into a draft, let the user confirm or edit, then save".

The safest implementation is to keep Gemini parsing in `frontend/server.ts`, keep Flask as the only persistence API, and move standard transaction persistence to the explicit confirm action in the widget. This matches the user's mental model: the card is a draft until the user confirms it.

Standard transaction, debt, and savings drafts should get compact manual editors inside the AI card. Debt flows still retain their specialized picker behavior when a payment cannot be matched confidently. Savings contributions require a destination savings goal selector directly in the draft when the parser cannot resolve one.

## Interfaces

### Express

`POST /api/parse-transaction`

- Keep authentication and Gemini parsing.
- Return a structured draft payload.
- Do not persist a standard transaction.
- Do not auto-create account or payee records during parse.
- Preserve the invalid-input `422` behavior.
- Preserve `gemini-3.1-flash-lite`.

Draft payload should include both display names and resolved IDs where available:

```ts
interface ParsedFinanceDraft {
  valid: boolean
  rejection_reason?: string
  operation_type: 'transaction' | 'debt_payment' | 'savings_contribution' | 'new_debt' | 'new_savings'
  amount: number
  type?: 'income' | 'expense'
  category?: string
  category_id?: number | null
  account?: string
  account_id?: number | null
  account_is_new?: boolean
  note?: string
  transaction_date?: string
  payee_name?: string
  payee_id?: number | null
  location?: string
  debt_name?: string
  debt_type?: 'debt' | 'loan' | ''
  lender?: string
  debtor?: string
  savings_name?: string
  savings_id?: number | null
  target_amount?: number
}
```

### Frontend Widget

Add draft/edit state to `AIChatWidget`.

```ts
interface ChatEntry {
  id: string
  text: string
  parsed?: ParsedData
  confirmed?: boolean
  rejected?: boolean
  error?: string
}

interface TransactionDraftForm {
  transaction_date: string
  account_id: number | ''
  category_id: string
  amount: number | ''
  type: 'income' | 'expense'
  note: string
  location: string
}
```

The transaction editor should use existing hooks/data:

- `useAccounts()`
- `useCategories()`
- `useAddTransaction()` or `transactionsApi.addTransaction()`
- `TRANSACTION_TYPE_OPTIONS`
- `useLocaleFormat()`

### i18n

Add keys for:

- Draft validation messages
- Debt/savings draft labels

## Data Flow

### Standard Transaction

1. User submits natural language text or voice input.
2. Browser calls `POST /api/parse-transaction`.
3. Express calls Gemini and resolves known account/category/payee IDs where possible.
4. Express returns a draft without writing to Flask.
5. Widget renders the editable draft card.
6. User can:
   - Confirm: submit the draft to `POST /api/transactions`.
   - Change draft fields locally before confirming.
   - Cancel: mark the entry rejected without backend writes.
7. After save succeeds, invalidate `['transactions']` and `['accounts']`.

Transfer transaction types:

- `transfer_in` increases an account balance but is not income.
- `transfer_out` decreases an account balance but is not expense.
- Transaction filters/table may show both as `Transfer`.

### Debt And Savings

Debt/savings operation types should stay explicit and conservative:

- If a reliable match exists, confirm may create the relevant record/payment/contribution.
- If no reliable debt match exists, show the existing picker before saving.
- Each debt/savings draft type exposes the fields needed for the matching or create action before the user confirms.
- Savings contribution drafts use a required destination fund selector backed by `savings_id`; `savings_name` is only display text once matched or selected.
- Savings contributions create a `transfer_out` transaction from the selected source account and link its `transaction_id` to the contribution.
- Debt payments create `transfer_out` when the user pays, or `transfer_in` when the user receives repayment, and link the `transaction_id` to the payment.
- Borrowing creates `transfer_in`; lending creates `transfer_out`.

## Edge Cases

- Gemini returns a category/account display name but no matching ID:
  - The editor should require the user to choose an existing account/category before saving.
  - Do not auto-create during parse.
- Gemini marks `account_is_new`:
  - First pass should avoid creating the account silently.
  - The UI may show a warning and require the user to select an existing account, unless explicit account creation is implemented later.
- Amount is missing or zero:
  - Show validation and block confirm.
- Date has only a date part:
  - Normalize to `YYYY-MM-DD HH:MM:SS`, preserving parsed time when available or using current local time.
- User edits then cancels:
  - No backend writes.
- Save fails:
  - Keep the draft editable and show the error.
- Locale changes:
  - Static labels change; user-created data remains unchanged.

## Compatibility

- Existing transaction API remains `POST /api/transactions`.
- No database migration is required.
- Flask remains unchanged unless debt/savings confirm behavior needs a narrower endpoint later.
- The Express proxy catch-all remains after specific routes.
- Steering must be updated:
  - `.kiro/steering/ai-voice-rules.md`
  - `.kiro/steering/api-contract.md` if the parse endpoint contract is documented there.

## Recommended File Changes

- `frontend/server.ts`
  - Stop persisting standard transactions inside `/api/parse-transaction`.
  - Return resolved draft metadata.
- `frontend/components/dashboard/AIChatWidget.tsx`
  - Render AI results as editable draft cards.
  - Confirm standard transactions by posting the edited draft.
- `frontend/api/transactions.ts`
  - Reuse existing `addTransaction`; only adjust typing if needed.
- `frontend/hooks/useTransactions.ts`
  - Reuse existing `useAddTransaction`; only adjust typing if needed.
- `frontend/src/i18n/locales/en/common.json`
- `frontend/src/i18n/locales/vi/common.json`
- `.kiro/steering/ai-voice-rules.md`
- `.kiro/steering/api-contract.md`
