# Implementation Plan

## Overview

5 independent frontend bugs fixed in priority order (CRITICAL → HIGH → MEDIUM → LOW). Each fix is surgical and confined to one file. Tasks 1–2 (exploration and preservation tests) run on unfixed code before any implementation begins.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2"] },
    { "wave": 2, "tasks": ["3"] },
    { "wave": 3, "tasks": ["4"] },
    { "wave": 4, "tasks": ["5", "6", "7"] },
    { "wave": 5, "tasks": ["8"] }
  ]
}
```

## Tasks

- [x] 1. Write bug condition exploration tests (BEFORE implementing any fix)
  - **Property 1: Bug Condition** - Debt Draft Sync Missing + inner_transfer Balance Skipped
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: Tests encode expected behavior — they will validate fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate Bug 1 and Bug 2 exist

  **Bug 1 — `confirmEntry` reads `parsed` instead of `draft` (debt operations):**
  - Bug Condition: `isBugCondition(entry)` = entry has `opType === 'debt_disbursement'` OR `opType === 'debt_payment'` AND a `draft` with fields different from `parsed`
  - Write a unit test (or manual trace) that calls/simulates `confirmEntry(id, parsed, draft)` where `draft.amount` differs from `parsed.amount` for `debt_disbursement`
  - Assert the API call receives `draft.amount`, not `parsed.amount`
  - Run on UNFIXED code → **EXPECTED OUTCOME: FAILS** (API receives `parsed.amount` instead of `draft.amount`)
  - Document counterexample: `confirmEntry(id, { operation_type: 'debt_disbursement', amount: 100000, ... }, { kind: 'debt_disbursement', amount: 200000, ... })` → `debtsApi.createDebt` called with `principal: 100000` instead of `200000`
  - Repeat for `debt_payment`: assert `debtsApi.createPayment` receives `draft.debt_id`, not `parsed.debt_id` (which may be `null`)

  **Bug 2 — `accountBalanceAtDate()` misses `inner_transfer`:**
  - Bug Condition: `isBugCondition(tx)` = `tx.transaction_type === 'inner_transfer'`
  - Write a unit test for `accountBalanceAtDate(account, [innerTransferTx], dateKey)` where account is the `destination_account_id`
  - Assert the returned balance equals `account.initial_balance + tx.amount`
  - Run on UNFIXED code → **EXPECTED OUTCOME: FAILS** (returns `initial_balance` unchanged because `inner_transfer` is skipped)
  - Document counterexample: `accountBalanceAtDate({ account_id: 2, initial_balance: 1000000 }, [{ transaction_type: 'inner_transfer', source_account_id: 1, destination_account_id: 2, amount: 500000 }], '2024-01-15')` → returns `1000000` instead of `1500000`

  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - Non-Debt Confirm Flows + Non-inner_transfer Balance Calculation
  - **IMPORTANT**: Follow observation-first methodology — observe on UNFIXED code first
  - **EXPECTED OUTCOME**: Tests PASS on unfixed code (confirms baseline to preserve)

  **Preservation for Bug 1 — Existing confirm flows must not regress:**
  - Non-bug condition: `¬isBugCondition(entry)` = `opType` is `inner_transfer`, `savings_contribution`, `savings_withdrawal`, `new_savings`, or standard `transaction`
  - Observe: `confirmEntry` with `opType === 'inner_transfer'` calls `accountsApi.transferBetweenAccounts` with `draft` values (already correct in unfixed code)
  - Observe: `confirmEntry` with `opType === 'savings_contribution'` calls the correct savings API with synced draft values
  - Write tests asserting these paths still use `draft`-sourced values after the fix
  - Verify tests PASS on UNFIXED code

  **Preservation for Bug 2 — Income and expense balances must not regress:**
  - Non-bug condition: `¬isBugCondition(tx)` = `tx.transaction_type === 'income'` OR `tx.transaction_type === 'expense'`
  - Observe: `accountBalanceAtDate({ account_id: 1, initial_balance: 500000 }, [{ account_id: 1, transaction_type: 'income', amount: 100000 }], '2024-01-15')` → returns `600000`
  - Observe: `accountBalanceAtDate({ account_id: 1, initial_balance: 500000 }, [{ account_id: 1, transaction_type: 'expense', amount: 50000 }], '2024-01-15')` → returns `450000`
  - Write property-based test: for all income/expense transactions matching `account_id`, balance changes by ±amount
  - Verify tests PASS on UNFIXED code

  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix Bug 1 (CRITICAL) — `confirmEntry` reads `parsed` instead of `draft` for debt operations

  - [x] 3.1 Add `synced` variable to `confirmEntry` in `AIChatWidget.tsx`
    - Locate `confirmEntry` function; immediately after `const opType = parsed.operation_type ?? 'transaction'`, add:
      `const synced = draft ? syncParsedFromDraft(parsed, draft) : parsed`
    - In the `debt_disbursement` branch: replace all `parsed.debt_name`, `parsed.debt_type`, `parsed.lender`, `parsed.debtor`, `parsed.amount`, `parsed.account_id`, `parsed.note`, `parsed.transaction_date` reads with `synced.*`
    - In the `debt_payment` branch: replace all `parsed.debt_id`, `parsed.amount`, `parsed.account_id`, `parsed.note`, `parsed.transaction_date` reads with `synced.*`
    - Do NOT touch `inner_transfer`, `savings_*`, or standard `transaction` branches — those already use `draft`/`parsed` correctly
    - _Bug_Condition: isBugCondition = opType is 'debt_disbursement' or 'debt_payment' AND draft exists with edited fields_
    - _Expected_Behavior: debtsApi.createDebt/createPayment receives user-edited values from draft, not original AI-parsed values_
    - _Preservation: synced === parsed when draft is undefined, so no-edit path is identical to before_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Verify Bug 1 exploration test now passes
    - **Property 1: Expected Behavior** - Debt Draft Sync (debt_disbursement / debt_payment)
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run the `debt_disbursement` and `debt_payment` exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms `synced.*` is used, not `parsed.*`)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Debt Confirm Flows
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation tests for `inner_transfer`, `savings_contribution`, `savings_withdrawal`, and `transaction` confirm paths
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in other confirm flows)

- [x] 4. Fix Bug 2 (HIGH) — `accountBalanceAtDate()` misses `inner_transfer` in `DynamicChart.tsx`

  - [x] 4.1 Rewrite the body of `accountBalanceAtDate()` in `DynamicChart.tsx`
    - Replace the entire function body with the following logic:
      1. Move the date filter (`dateKeyFromTransaction(tx) > dateKey → return balance`) BEFORE the `account_id` check — required because `inner_transfer` rows don't use `tx.account_id`
      2. Use `operationTypeForTransaction(tx)` to detect `'inner_transfer'`
      3. For `inner_transfer`: subtract `tx.amount` if `normalizeId(tx.source_account_id) === accountId`; add `tx.amount` if `normalizeId(tx.destination_account_id) === accountId`; otherwise no-op
      4. For non-transfer: apply the `tx.account_id !== accountId` guard, then handle `'income'` (+) and `'expense'` (-) as before
    - Verify `operationTypeForTransaction` is already imported from `@/lib/transaction-types` (it is — confirmed in file)
    - Do NOT touch `cashDirectionForTransaction` usage elsewhere in the file
    - _Bug_Condition: isBugCondition = tx.transaction_type === 'inner_transfer' matching the account via source/destination id_
    - _Expected_Behavior: source account balance decreases by tx.amount; destination account balance increases by tx.amount_
    - _Preservation: income/expense transactions continue to be handled identically; accounts with no inner_transfer are unaffected_
    - _Requirements: 2.3_

  - [x] 4.2 Verify Bug 2 exploration test now passes
    - **Property 1: Expected Behavior** - inner_transfer Balance Calculation
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - Run the `accountBalanceAtDate` `inner_transfer` exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (source balance decreases, destination balance increases)
    - _Requirements: 2.3_

  - [x] 4.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Income and Expense Balance Calculation
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation tests for income/expense account balance logic
    - **EXPECTED OUTCOME**: Tests PASS (no regressions for income/expense balance paths)

- [x] 5. Fix Bug 3 (MEDIUM) — Remove legacy `opType === 'new_debt'` from `AIChatWidget.tsx`

  - [x] 5.1 Remove all 7 occurrences of `|| opType === 'new_debt'` and standalone `opType === 'new_debt'` in `AIChatWidget.tsx`
    - In `buildDraft()`: change `opType === 'debt_disbursement' || opType === 'new_debt'` → `opType === 'debt_disbursement'`
    - In `confirmEntry()`: change `opType === 'debt_disbursement' || opType === 'new_debt'` → `opType === 'debt_disbursement'`
    - In `renderParsedCard()` header title condition: same replacement
    - In `renderParsedCard()` chip condition: same replacement
    - In `renderParsedCard()` color condition (×2 if present): same replacement
    - In `renderParsedCard()` flow text condition: same replacement
    - In `cardContent()`: change standalone `if (opType === 'new_debt')` → `if (opType === 'debt_disbursement')`
    - Do NOT modify `lib/transaction-types.ts` — that file preserves DB backward compatibility for stored records
    - _Bug_Condition: isBugCondition = any runtime condition in AIChatWidget.tsx evaluates opType === 'new_debt'_
    - _Expected_Behavior: all debt disbursement UI paths reachable only via opType === 'debt_disbursement'_
    - _Preservation: lib/transaction-types.ts unchanged; AI parse for debt_disbursement continues to work (Requirement 3.8, 3.9)_
    - _Requirements: 2.4, 3.8, 3.9_

  - [x] 5.2 Spot-check: confirm `new_debt` no longer appears in `AIChatWidget.tsx`
    - Run: `rg "new_debt" frontend/components/dashboard/AIChatWidget.tsx`
    - **EXPECTED OUTCOME**: zero matches

- [x] 6. Fix Bug 4 (MEDIUM) — Remove dead `invalidateQueries(['dashboard'])` from `useAccounts.ts`

  - [x] 6.1 Delete the `queryClient.invalidateQueries({ queryKey: ['dashboard'] })` line from all 4 mutation `onSuccess` callbacks in `useAccounts.ts`
    - Remove from `useAddAccount.onSuccess` — keep the `['accounts']` invalidation
    - Remove from `useUpdateAccount.onSuccess` — keep the `['accounts']` invalidation
    - Remove from `useDeleteAccount.onSuccess` — keep the `['accounts']` invalidation
    - Remove from `useTransferBetweenAccounts.onSuccess` — keep `['accounts']` and `['transactions']` invalidations
    - Confirm no `useQuery` anywhere in the codebase uses key `['dashboard']` (useDashboard.ts composes from individual hooks with their own keys)
    - _Bug_Condition: isBugCondition = invalidateQueries references a queryKey with no corresponding useQuery_
    - _Expected_Behavior: every invalidateQueries call references only existing query keys_
    - _Preservation: ['accounts'] and ['transactions'] invalidations kept intact (Requirements 3.10, 3.11)_
    - _Requirements: 2.5, 2.6, 3.10, 3.11_

  - [x] 6.2 Spot-check: confirm `['dashboard']` query key no longer appears in `useAccounts.ts`
    - Run: `rg "queryKey.*dashboard" frontend/hooks/useAccounts.ts`
    - **EXPECTED OUTCOME**: zero matches

- [x] 7. Fix Bug 5 (LOW) — Add 3 missing i18n keys to `en/common.json`

  - [x] 7.1 Add 3 missing keys under the `"dashboard"` section in `frontend/src/i18n/locales/en/common.json`
    - Insert after the existing `"noBudgetSetup"` key (to match the order in `vi/common.json`):
      ```json
      "budgetTitle": "Budget",
      "noBudgetForMonth": "No budget for {{month}}.",
      "budgetLoadError": "Could not load budget data for the selected month."
      ```
    - Do NOT modify `vi/common.json`
    - _Bug_Condition: isBugCondition = t('dashboard.budgetTitle') / t('dashboard.noBudgetForMonth') / t('dashboard.budgetLoadError') called with lang='en'_
    - _Expected_Behavior: each key resolves to its English string instead of the raw key_
    - _Preservation: vi/common.json untouched; all other existing EN keys unchanged (Requirements 3.12, 3.13)_
    - _Requirements: 2.7, 2.8, 2.9, 3.12, 3.13_

  - [x] 7.2 Spot-check: confirm all 3 keys now exist in `en/common.json`
    - Run: `rg "budgetTitle|noBudgetForMonth|budgetLoadError" frontend/src/i18n/locales/en/common.json`
    - **EXPECTED OUTCOME**: 3 matches

- [x] 8. Checkpoint — Build verification and full spot-check

  - [x] 8.1 Run TypeScript build and confirm zero errors
    - Run: `cd frontend; npm run build`
    - **EXPECTED OUTCOME**: build completes with zero TypeScript errors
    - Fix any type errors introduced before marking complete

  - [x] 8.2 Run all spot-check ripgrep commands
    - `rg "new_debt" frontend/components/dashboard/AIChatWidget.tsx` → 0 matches
    - `rg "queryKey.*dashboard" frontend/hooks/useAccounts.ts` → 0 matches
    - `rg "budgetTitle|noBudgetForMonth|budgetLoadError" frontend/src/i18n/locales/en/common.json` → 3 matches
    - Report results; all three must pass

  - [x] 8.3 Confirm all property-based and preservation tests pass (post-fix)
    - Re-run Bug 1 exploration test (task 3.2) → PASS
    - Re-run Bug 2 exploration test (task 4.2) → PASS
    - Re-run all preservation tests (tasks 3.3, 4.3) → PASS
    - Ensure all tests pass; ask the user if questions arise.

## Notes

- All 5 bugs are frontend-only. No backend changes.
- Bugs 1 and 3 both touch `AIChatWidget.tsx` and should be addressed together in the same editing session to avoid merge conflicts.
- Bug 2 requires updating `accountBalanceAtDate()` in `DynamicChart.tsx`; `operationTypeForTransaction` is already imported.
- `lib/transaction-types.ts` must NOT be modified — it preserves DB backward compatibility for stored `new_debt` records.
- The mandatory verification after all fixes: `cd frontend; npm run build` with zero TS errors.
- Spot-check ripgrep commands are listed in task 8.2 and also individually in tasks 5.2, 6.2, and 7.2.
