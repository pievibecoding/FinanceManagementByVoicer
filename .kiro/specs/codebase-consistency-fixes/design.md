# Design Document: Codebase Consistency Fixes

## Overview

Technical design for 5 frontend consistency bugs in Finance Management by Voicer. All changes are surgical and confined to 4 existing files — no new files, no new dependencies, no backend changes.

The bugs are independent and can be fixed in isolation, though Bugs 1 and 3 share `AIChatWidget.tsx` and should be addressed together.

---

## Glossary

| Term | Meaning |
|---|---|
| `parsed` | Raw `ParsedData` object returned by AI / Gemini parse — reflects what the AI parsed from user input |
| `draft` | `AiDraftForm` object representing the user-edited form state — may differ from `parsed` if user changed fields |
| `synced` | Result of calling `syncParsedFromDraft(parsed, draft)` — a `ParsedData` view reflecting the user's current edits |
| `inner_transfer` | Internal account-to-account money movement; stored with `source_account_id` + `destination_account_id`, `type='neutral'` |
| `opType` | Shorthand for `operation_type` — determines which confirmation flow runs in `confirmEntry` |
| `debt_disbursement` | AI operation type for creating a new debt or loan (canonical name; `new_debt` is legacy) |

---

## Bug Details

### Bug 1 (CRITICAL): `confirmEntry` reads `parsed` instead of `draft` for debt operations

**File:** `frontend/components/dashboard/AIChatWidget.tsx`
**Function:** `confirmEntry(id, parsed, draft?)`

`confirmEntry` receives `parsed` (raw AI data) and optional `draft` (user-edited form). For `inner_transfer` and savings operations the code calls `syncParsedFromDraft()` to merge the user's edits back into a `ParsedData`-shaped object before saving. For `debt_disbursement` and `debt_payment` this merge step is missing — the code reads directly from `parsed`, so any field the user changed in the draft form (amount, account, debt selection, note) is silently discarded.

`syncParsedFromDraft()` already exists in the same component and handles both debt kinds:
- `debt_disbursement`: maps `draft.debt_name`, `draft.debt_type`, `draft.lender`, `draft.debtor`, `draft.amount`, `draft.account_id`, `draft.note`
- `debt_payment`: maps `draft.debt_id`, `draft.amount`, `draft.account_id`, `draft.note`, `draft.transaction_date`, `draft.transaction_time`

---

### Bug 2 (HIGH): `accountBalanceAtDate()` misses `inner_transfer`

**File:** `frontend/components/dashboard/DynamicChart.tsx`
**Function:** `accountBalanceAtDate(account, transactions, dateKey)`

Current implementation:

```typescript
function accountBalanceAtDate(account, transactions, dateKey) {
  const accountId = normalizeId(account.account_id)
  return transactions.reduce((balance, tx) => {
    if (normalizeId(tx.account_id) !== accountId) return balance  // ← exits early for inner_transfer
    if (dateKeyFromTransaction(tx) > dateKey) return balance
    const direction = cashDirectionForTransaction(tx)
    if (direction === 'in') return balance + tx.amount
    if (direction === 'out') return balance - tx.amount
    return balance  // 'neutral' → inner_transfer skipped
  }, account.initial_balance)
}
```

`inner_transfer` rows have `type='neutral'`, so `cashDirectionForTransaction` returns `'neutral'`, hitting the final fallback. Worse, they store the affected accounts in `source_account_id` / `destination_account_id` — not in `tx.account_id` — so the early `tx.account_id !== accountId` guard also exits before the type check even runs.

---

### Bug 3 (MEDIUM): Legacy `opType === 'new_debt'` still present

**File:** `frontend/components/dashboard/AIChatWidget.tsx`

After the rename `new_debt` → `debt_disbursement`, conditions were temporarily widened to `opType === 'debt_disbursement' || opType === 'new_debt'`. The `|| opType === 'new_debt'` half was never removed. There are 6 compound occurrences and 1 standalone `if (opType === 'new_debt')` in `cardContent()`.

`AIChatWidget.tsx` only operates on freshly parsed AI drafts, never on values read from the database, so backward compatibility for stored data is not a concern here.

---

### Bug 4 (MEDIUM): `invalidateQueries(['dashboard'])` is a no-op

**File:** `frontend/hooks/useAccounts.ts`

All four mutations (`useAddAccount`, `useUpdateAccount`, `useDeleteAccount`, `useTransferBetweenAccounts`) call `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` in `onSuccess`. No `useQuery` anywhere in the codebase uses the key `['dashboard']`. Dashboard metrics are composed by `useDashboard.ts` from individual hooks (`['accounts']`, `['transactions']`, etc.), none of which use `['dashboard']` as their query key. The invalidation calls are dead code.

---

### Bug 5 (LOW): 3 i18n keys missing in `en/common.json`

**File:** `frontend/src/i18n/locales/en/common.json`

`vi/common.json` has three keys under `dashboard` that are absent from `en/common.json`:

| Key | VI value |
|---|---|
| `dashboard.budgetTitle` | `"Ngân sách"` |
| `dashboard.noBudgetForMonth` | `"Không có ngân sách nào cho {{month}}."` |
| `dashboard.budgetLoadError` | `"Không thể tải dữ liệu ngân sách cho tháng đã chọn."` |

When the user switches to English, `react-i18next` falls back to displaying the raw key strings instead of translated text.

---

## Hypothesized Root Cause

| Bug | Root Cause |
|---|---|
| 1 | Copy-paste inconsistency: savings and inner_transfer branches were updated to call `syncParsedFromDraft` but the debt branches were written earlier or updated separately and the sync step was not added |
| 2 | `accountBalanceAtDate` was written before `inner_transfer` was introduced as a transaction type; the function was never updated to handle the new `source_account_id`/`destination_account_id` storage pattern |
| 3 | Incomplete cleanup after the `new_debt` → `debt_disbursement` rename; the old string was kept as a fallback and never removed |
| 4 | Defensive invalidation added speculatively (`['dashboard']` key may have existed at some point or was added by mistake); never cleaned up when the query key was removed |
| 5 | New i18n keys were added to `vi/common.json` without a corresponding pass through `en/common.json` |

---

## Expected Behavior

### Bug 1 fix

When the user edits a `debt_disbursement` or `debt_payment` draft and confirms, `confirmEntry` SHALL read the user-edited values (from `draft` via `syncParsedFromDraft`) rather than the original AI values (from `parsed`). When no draft exists or the user has not edited the draft, behavior is unchanged.

### Bug 2 fix

`accountBalanceAtDate()` SHALL correctly subtract `tx.amount` when the account is the `source_account_id` of an `inner_transfer`, and add `tx.amount` when it is the `destination_account_id`. Income and expense transactions SHALL continue to be handled as before.

### Bug 3 fix

All runtime condition checks for debt disbursement in `AIChatWidget.tsx` SHALL use only `opType === 'debt_disbursement'`. The string `'new_debt'` SHALL not appear in any condition branch in this file.

### Bug 4 fix

`onSuccess` callbacks in `useAccounts.ts` SHALL only invalidate query keys that have corresponding `useQuery` registrations in the codebase. The `['dashboard']` invalidation SHALL be removed from all four mutations.

### Bug 5 fix

When the app language is English, `t('dashboard.budgetTitle')` SHALL render `"Budget"`, `t('dashboard.noBudgetForMonth', { month })` SHALL render `"No budget for {{month}}."` with the month interpolated, and `t('dashboard.budgetLoadError')` SHALL render `"Could not load budget data for the selected month."`.

---

## Fix Implementation

### Fix 1 — Add `synced` variable to `confirmEntry` (AIChatWidget.tsx)

At the top of `confirmEntry`, immediately after the `opType` assignment, add one line:

```typescript
const confirmEntry = async (id: string, parsed: ParsedData, draft?: AiDraftForm) => {
  const opType = parsed.operation_type ?? 'transaction'
  const synced = draft ? syncParsedFromDraft(parsed, draft) : parsed
  // ...
```

In the `debt_disbursement` branch, replace all `parsed.*` reads with `synced.*`:

```typescript
} else if (opType === 'debt_disbursement') {
  const today = new Date()
  const dateStr = synced.transaction_date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${currentInputTime()}`
  await debtsApi.createDebt({
    name: synced.debt_name || synced.note || t('debts.new'),
    debt_type: (synced.debt_type as 'debt' | 'loan') ?? 'debt',
    lender: synced.lender || null,
    debtor: synced.debtor || null,
    principal: synced.amount,
    account_id: Number(synced.account_id),
    transaction_date: dateStr,
    note: synced.note || null,
  })
```

In the `debt_payment` branch, replace all `parsed.*` reads with `synced.*`:

```typescript
} else if (opType === 'debt_payment') {
  const today = new Date()
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`
  const paymentDate = synced.transaction_date || dateStr
  await debtsApi.createPayment(Number(synced.debt_id), {
    amount_paid: synced.amount,
    payment_date: paymentDate,
    account_id: Number(synced.account_id),
    note: synced.note || synced.debt_name || t('debts.payment'),
  })
```

**Scope:** Add 1 line + replace `parsed.*` with `synced.*` in the 2 debt branches only. Do not touch `inner_transfer`, savings, or standard transaction branches.

**Regression guard:** `synced` equals `parsed` when `draft` is undefined, so the no-edit path is identical to before.

---

### Fix 2 — Rewrite `accountBalanceAtDate()` (DynamicChart.tsx)

Replace the entire function body:

```typescript
function accountBalanceAtDate(
  account: Account,
  transactions: Transaction[],
  dateKey: string
) {
  const accountId = normalizeId(account.account_id)
  return transactions.reduce((balance, tx) => {
    if (dateKeyFromTransaction(tx) > dateKey) return balance
    const opType = operationTypeForTransaction(tx)
    if (opType === 'inner_transfer') {
      if (normalizeId(tx.source_account_id) === accountId) return balance - tx.amount
      if (normalizeId(tx.destination_account_id) === accountId) return balance + tx.amount
      return balance
    }
    if (normalizeId(tx.account_id) !== accountId) return balance
    if (opType === 'income') return balance + tx.amount
    if (opType === 'expense') return balance - tx.amount
    return balance
  }, account.initial_balance)
}
```

Key changes from current code:
1. Date filter moved before `accountId` check — required because `inner_transfer` rows don't use `tx.account_id`
2. `operationTypeForTransaction(tx)` replaces `cashDirectionForTransaction(tx)` — handles `inner_transfer` correctly
3. `inner_transfer` handled first via `source_account_id`/`destination_account_id`
4. `account_id` guard applies only to non-transfer transactions

Verify `operationTypeForTransaction` is imported at the top of `DynamicChart.tsx`. If it is already imported via `lib/transaction-types.ts`, no import change is needed; otherwise add it.

**Regression guard:** For `income` and `expense`, `operationTypeForTransaction(tx)` returns the same result as the previous `cashDirectionForTransaction` path. Accounts with no `inner_transfer` history are unaffected.

---

### Fix 3 — Remove `|| opType === 'new_debt'` (AIChatWidget.tsx)

7 locations in `AIChatWidget.tsx`, all simple string replacements:

| Location | Before | After |
|---|---|---|
| `buildDraft()` | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `confirmEntry()` | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `renderParsedCard()` header title | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `renderParsedCard()` chip | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `renderParsedCard()` color (×2) | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `renderParsedCard()` flow text | `opType === 'debt_disbursement' \|\| opType === 'new_debt'` | `opType === 'debt_disbursement'` |
| `cardContent()` | `opType === 'new_debt'` | `opType === 'debt_disbursement'` |

`lib/transaction-types.ts` is NOT modified — that file preserves DB backward compatibility.

---

### Fix 4 — Remove dead `['dashboard']` invalidations (useAccounts.ts)

Remove one line from each of 4 `onSuccess` callbacks:

```typescript
// DELETE this line from useAddAccount, useUpdateAccount, useDeleteAccount, useTransferBetweenAccounts:
queryClient.invalidateQueries({ queryKey: ['dashboard'] });
```

Final state of each `onSuccess`:

**`useAddAccount` / `useUpdateAccount` / `useDeleteAccount`:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
},
```

**`useTransferBetweenAccounts`:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['accounts'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
},
```

---

### Fix 5 — Add 3 missing keys to `en/common.json`

In the `"dashboard"` section of `frontend/src/i18n/locales/en/common.json`, add after the existing `"noBudgetSetup"` key (to mirror the order in `vi/common.json`):

```json
"budgetTitle": "Budget",
"noBudgetForMonth": "No budget for {{month}}.",
"budgetLoadError": "Could not load budget data for the selected month."
```

`vi/common.json` is NOT modified.

---

## Correctness Properties

### Property 1: Draft sync completeness

For any `debt_disbursement` or `debt_payment` confirm where a draft exists, the values sent to the API must equal the draft field values, not the original `parsed` values.

**Validates: Requirements 2.1, 2.2**

### Property 2: Balance conservation for inner_transfer

For any account A that sends amount X to account B via `inner_transfer`, `accountBalanceAtDate(A, ...)` must decrease by X and `accountBalanceAtDate(B, ...)` must increase by X. The sum across all accounts remains unchanged.

**Validates: Requirements 2.3**

### Property 3: No new_debt in AIChatWidget runtime logic

No runtime condition in `AIChatWidget.tsx` evaluates `opType === 'new_debt'`. The UI render paths for debt disbursement are reached solely via `opType === 'debt_disbursement'`.

**Validates: Requirements 2.4**

### Property 4: Query key existence

Every `invalidateQueries` call in `useAccounts.ts` references a query key that has at least one corresponding `useQuery` registration in the codebase.

**Validates: Requirements 2.5, 2.6**

### Property 5: i18n key parity

`budgetTitle`, `noBudgetForMonth`, and `budgetLoadError` exist under `dashboard` in both `en/common.json` and `vi/common.json`.

**Validates: Requirements 2.7, 2.8, 2.9**

---

## Testing Strategy

### Build verification (mandatory)

```powershell
cd frontend; npm run build
```

Must complete with zero TypeScript errors.

### Spot checks via ripgrep

```powershell
# Bug 3: no legacy string remains in widget
rg "new_debt" frontend/components/dashboard/AIChatWidget.tsx
# → zero matches expected

# Bug 4: no dead dashboard invalidation
rg "queryKey.*dashboard" frontend/hooks/useAccounts.ts
# → zero matches expected

# Bug 5: keys present in EN locale
rg "budgetTitle|noBudgetForMonth|budgetLoadError" frontend/src/i18n/locales/en/common.json
# → 3 matches expected
```

### Manual smoke tests

- **Bug 1**: In AI chat, parse a debt (e.g. "vay 5 triệu từ Ngân hàng A"), change the amount to a different value in the draft form, confirm → verify the saved debt uses the edited amount, not the AI-parsed amount.
- **Bug 2**: Add an account-to-account transfer, then check the asset-fluctuation chart — the source account balance should decrease and the destination account balance should increase on the chart.
- **Bug 5**: Switch app language to English → open dashboard → Budget Overview section should show "Budget" as the heading, not the raw key string.

---

## Change Summary

| Bug | File | Change type | Approximate lines changed |
|---|---|---|---|
| 1 | `frontend/components/dashboard/AIChatWidget.tsx` | Add 1 line + replace `parsed.*` → `synced.*` in 2 branches | ~15 |
| 2 | `frontend/components/dashboard/DynamicChart.tsx` | Replace `accountBalanceAtDate` function body | ~14 |
| 3 | `frontend/components/dashboard/AIChatWidget.tsx` | Remove `\|\| opType === 'new_debt'` from 7 locations | ~7 |
| 4 | `frontend/hooks/useAccounts.ts` | Remove 4 dead `invalidateQueries` calls | 4 |
| 5 | `frontend/src/i18n/locales/en/common.json` | Add 3 JSON keys | 3 |

No new files. No new dependencies. No backend changes.
