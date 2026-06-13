# Implementation Plan: finance-logic-refactor

## Overview

This plan converts the six correctness gaps identified in the design into discrete coding steps. Each task builds on prior tasks and ends with all components wired together. The implementation uses Python (Flask/Hypothesis) for the backend and TypeScript (React/fast-check) for the frontend.

Execution order:
1. DB migrations (no behavior change, safe first step)
2. Backend atomicity refactors (accounts, transactions, debts, savings)
3. Frontend type/hook updates
4. Frontend component simplifications
5. Property-based and unit tests throughout

---

## Tasks

- [x] 1. Add DB migrations for new schema columns
  - In `backend/database.py`, add `_add_transfer_pair_id_column(db)`: use `_migration_applied` guard, `ALTER TABLE Transaction_Fact ADD COLUMN transfer_pair_id TEXT`, then `_mark_migration_done`.
  - In `backend/database.py`, add `_add_account_current_balance(db)`: use guard, `ALTER TABLE Account_Dim ADD COLUMN current_balance INTEGER NOT NULL DEFAULT 0`, then run the recompute UPDATE via `initial_balance + COALESCE(SUM(CASE WHEN type IN ('income','transfer_in') THEN amount WHEN type IN ('expense','transfer_out') THEN -amount ELSE 0 END), 0)` from `Transaction_Fact WHERE is_deleted=0`.
  - Call both new migration functions at the end of `initialize_db()`.
  - _Requirements: 1.3, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 1.1 Add `transfer_pair_id` migration
    - Implement `_add_transfer_pair_id_column` per the design spec.
    - _Requirements: 1.3, 6.1_

  - [x] 1.2 Add `current_balance` migration
    - Implement `_add_account_current_balance` per the design spec, including the immediate recompute UPDATE.
    - _Requirements: 4.1, 4.2, 6.2_

  - [ ]* 1.3 Write unit tests for migration idempotency
    - In `backend/tests/test_migrations.py`, verify that running `initialize_db()` twice does not raise errors and that `current_balance` values match the expected recomputed totals for seed data.
    - _Requirements: 6.3, 6.4_

- [x] 2. Implement `POST /api/accounts/transfer` (atomic transfer pair)
  - In `backend/routes/accounts.py`, add the `transfer_between_accounts()` route under `@accounts_bp.route("/api/accounts/transfer", methods=["POST"])`.
  - Import `libsql_client` and `time`.
  - Validate `from_account_id`, `to_account_id`, `amount`, `date` in request body; return 400 on missing fields.
  - Verify both accounts exist and belong to `g.user_id`; return 404 if not.
  - Return 400 if `from_account_id == to_account_id`.
  - Generate `transfer_pair_id = f"pair-{int(time.time() * 1000)}"`.
  - Generate two transaction IDs `tx-{ts}` and `tx-{ts+1}`.
  - Use `db.batch()` with 4 statements: INSERT `transfer_out`, INSERT `transfer_in`, UPDATE `current_balance -= amount` for from_account, UPDATE `current_balance += amount` for to_account.
  - Return `{message, transfer_pair_id, out_transaction_id, in_transaction_id}`.
  - _Requirements: 1.1, 1.4, 1.6, 1.7_

  - [ ]* 2.1 Write property test for transfer pair atomicity (Property 1)
    - **Property 1: Transfer pair atomicity**
    - **Validates: Requirements 1.1, 1.4**
    - In `backend/tests/test_transfer_property.py`, use Hypothesis to generate random `(from_account_id, to_account_id, amount ∈ [1, 10_000_000], date)` and assert that after a successful transfer, exactly two `Transaction_Fact` rows share the `transfer_pair_id`, one is `transfer_out` on `from_account`, and one is `transfer_in` on `to_account`, both with the exact `amount`.

  - [ ]* 2.2 Write property test for transfer pair ID format (Property 3)
    - **Property 3: Transfer pair ID format**
    - **Validates: Requirements 1.4**
    - In `backend/tests/test_transfer_property.py`, assert that for any transfer creation, the resulting `transfer_pair_id` matches `^pair-\d+$`.

  - [ ]* 2.3 Write unit tests for transfer endpoint
    - In `backend/tests/test_accounts.py`, cover: happy path transfer, 400 for same-account, 404 for unknown account, 400 for missing fields, 400 for amount ≤ 0.
    - _Requirements: 1.6, 1.7_

- [x] 3. Update `create_transaction()` and `delete_transaction()` for `current_balance` and transfer pair
  - In `backend/routes/transactions.py`, update `create_transaction()`:
    - Compute `delta = int(amount) if tx_type in ('income','transfer_in') else -int(amount)`.
    - Replace the single `db.execute(INSERT ...)` with a `db.batch([INSERT Transaction_Fact, UPDATE Account_Dim current_balance += delta])`.
    - Split rows are still inserted individually after the batch (they do not affect balance directly).
  - Update `delete_transaction()`:
    - Fetch `type, amount, account_id, transfer_pair_id` from the row before deleting.
    - If `transfer_pair_id` is set, fetch the paired transaction. If the pair exists, `db.batch()` soft-deletes both rows and reverses both accounts' `current_balance`. If the pair is already deleted, fall through to single-delete.
    - If no `transfer_pair_id`, use a helper `_delete_single_transaction(db, transaction_id, account_id, delta, user_id)` that batches: DELETE split rows, soft-delete parent, reverse `current_balance`.
  - _Requirements: 1.2, 1.5, 4.3, 4.4, 6.7_

  - [x] 3.1 Update `create_transaction()` to batch INSERT + balance update
    - _Requirements: 4.3_

  - [x] 3.2 Add `_delete_single_transaction()` helper and update `delete_transaction()` with transfer pair awareness
    - _Requirements: 1.2, 1.5, 4.4, 6.7_

  - [ ]* 3.3 Write property test for account balance invariant after insert (Property 10)
    - **Property 10: Account balance invariant after transaction insert**
    - **Validates: Requirements 4.3**
    - In `backend/tests/test_balance_property.py`, use Hypothesis to generate `(account, tx_type ∈ {income,expense,transfer_in,transfer_out}, amount ∈ [1, 10M])` and assert `current_balance` changes by exactly +A or -A.

  - [ ]* 3.4 Write property test for balance round-trip after delete (Property 11)
    - **Property 11: Account balance round-trip after transaction delete**
    - **Validates: Requirements 4.4, 6.7**
    - In `backend/tests/test_balance_property.py`, create then delete a transaction for random inputs and assert `current_balance` is restored to its pre-creation value.

  - [ ]* 3.5 Write property test for transfer pair deletion symmetry (Property 2)
    - **Property 2: Transfer pair deletion symmetry**
    - **Validates: Requirements 1.2**
    - In `backend/tests/test_transfer_property.py`, for a created transfer pair, delete either the `transfer_out` or `transfer_in` side (randomized), and assert both rows have `is_deleted=1`.

  - [ ]* 3.6 Write unit test for legacy transfer delete (no pair)
    - In `backend/tests/test_transactions.py`, verify that deleting a `transfer_in` or `transfer_out` transaction that has no `transfer_pair_id` deletes only that single row.
    - _Requirements: 1.5_

- [x] 4. Update account create/update for `current_balance`
  - In `backend/routes/accounts.py`, update `create_account()`:
    - Add `current_balance` field to the INSERT: `current_balance = initial_balance`.
  - Update `update_account()`:
    - When `initial_balance` is in the update payload, use `db.batch()` with two statements: the regular SET update and a follow-up `UPDATE Account_Dim SET current_balance = ? + COALESCE((SELECT SUM(CASE ...) FROM Transaction_Fact WHERE account_id=? AND is_deleted=0), 0) WHERE account_id=? AND user_id=?`.
    - When `initial_balance` is NOT in payload, keep the existing single `db.execute()`.
  - _Requirements: 4.9, 4.10_

  - [ ]* 4.1 Write property test for new account initial balance (Property 12)
    - **Property 12: New account initial balance**
    - **Validates: Requirements 4.9**
    - In `backend/tests/test_accounts_property.py`, use Hypothesis with `initial_balance ∈ [0, 100_000_000]` and assert that `GET /api/accounts` returns the account with `current_balance == initial_balance`.

  - [ ]* 4.2 Write property test for balance recalculation after initial_balance update (Property 13)
    - **Property 13: Account balance recalculation after initial_balance update**
    - **Validates: Requirements 4.10**
    - In `backend/tests/test_accounts_property.py`, create an account with some transactions, then update `initial_balance`, and assert `current_balance == new_initial_balance + Σ(transaction contributions)`.

- [x] 5. Checkpoint — backend migrations and account/transaction balance wiring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Refactor `create_debt_payment()` to atomic batch
  - In `backend/routes/debts.py`, update `create_debt_payment()` to accept `account_id` (int, optional) and `note` (str, optional) from the request body.
  - Resolve `transfer_category_id` by querying `Category_Dim WHERE user_id=? AND category_name='Khác' LIMIT 1`, falling back to the first category, returning 400 if none exist.
  - **When `account_id` is provided**: generate `transaction_id = f"tx-{int(time.time() * 1000)}"`. Build a `db.batch()` with 5 statements: INSERT `Transaction_Fact` (type='transfer_out' for debt, 'transfer_in' for loan), INSERT `Debt_Payment_Fact` (with the new `transaction_id`), UPDATE `Debt_Dim.outstanding_balance -= amount_paid`, UPDATE `Account_Dim.current_balance` (delta based on transfer type), UPDATE `Debt_Dim status='settled'` WHERE `outstanding_balance <= 0 AND status != 'settled'`.
  - **When `account_id` is absent**: `db.batch()` with 3 statements: INSERT `Debt_Payment_Fact` (transaction_id=NULL), UPDATE `outstanding_balance`, UPDATE status.
  - Retrieve `payment_id` via `SELECT MAX(payment_id) FROM Debt_Payment_Fact WHERE debt_id=?`.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.7_

  - [ ]* 6.1 Write property test for debt payment atomicity (Property 4)
    - **Property 4: Debt payment atomicity**
    - **Validates: Requirements 2.1, 2.3, 6.5**
    - In `backend/tests/test_debt_property.py`, use Hypothesis to generate `(debt, amount ∈ [1, outstanding], account_id)` and assert the three post-conditions simultaneously: payment row has valid `transaction_id`, `outstanding_balance` decreased by `amount_paid`, account `current_balance` updated correctly.

  - [ ]* 6.2 Write property test for debt payment without account (Property 5)
    - **Property 5: Debt payment transaction-free**
    - **Validates: Requirements 2.5**
    - In `backend/tests/test_debt_property.py`, call payment without `account_id` and assert `transaction_id = NULL`, no new `Transaction_Fact` row, and `outstanding_balance` still decreases.

  - [ ]* 6.3 Write property test for debt auto-settle (Property 6)
    - **Property 6: Debt auto-settle threshold**
    - **Validates: Requirements 2.7**
    - In `backend/tests/test_debt_property.py`, generate `(balance B ∈ [1, 10M], payment P ∈ [1, 2B])`, assert status becomes 'settled' iff `P ≥ B`, otherwise unchanged.

  - [ ]* 6.4 Write unit tests for debt payment endpoint
    - In `backend/tests/test_debts.py`, cover: payment with `account_id` creates linked transaction, payment without `account_id` creates no transaction, settle-on-zero balance.
    - _Requirements: 2.1, 2.4, 2.5, 2.7_

- [x] 7. Refactor `delete_debt_payment()` to atomic batch
  - In `backend/routes/debts.py`, update `delete_debt_payment()`:
    - Fetch `amount_paid, transaction_id` from `Debt_Payment_Fact`.
    - Build base `stmts`: DELETE the payment row, UPDATE `outstanding_balance += amount_paid` and reopen status if settled.
    - If `linked_tx_id` is set, fetch `type, amount, account_id` from `Transaction_Fact`. Compute `balance_reversal` (add back for `transfer_out`, subtract for `transfer_in`). Append soft-delete of linked transaction and reversal of `Account_Dim.current_balance` to `stmts`.
    - Execute all statements as a single `db.batch()`.
  - _Requirements: 6.5_

  - [ ]* 7.1 Write property test for debt payment delete round-trip (Property 15)
    - **Property 15: Debt payment delete round-trip**
    - **Validates: Requirements 6.5**
    - In `backend/tests/test_debt_property.py`, for random inputs create a payment (with `account_id`), then delete it, and assert `outstanding_balance = B`, linked `Transaction_Fact.is_deleted = 1`, and account `current_balance` restored.

- [x] 8. Refactor `create_savings_contribution()` to atomic batch
  - In `backend/routes/savings.py`, update `create_savings_contribution()` to accept `account_id` (int, optional) and `note` (str, optional).
  - Resolve `transfer_category_id` using the same "Khác" fallback pattern as in Task 6.
  - **When `account_id` is provided**: generate `transaction_id`. Build `db.batch()` with 5 statements: INSERT `Transaction_Fact` (type='transfer_out'), INSERT `Savings_Contribution_Fact` (with `transaction_id`), UPDATE `Savings_Dim.current_balance += amount`, UPDATE `Account_Dim.current_balance -= amount`, UPDATE `Savings_Dim status='completed'` WHERE `current_balance >= target_amount AND status='active'`.
  - **When `account_id` is absent**: `db.batch()` with 3 statements: INSERT `Savings_Contribution_Fact` (transaction_id=NULL), UPDATE `current_balance`, UPDATE status.
  - Remove the old two-step non-atomic INSERT + UPDATE + auto-complete logic.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7_

  - [ ]* 8.1 Write property test for savings contribution atomicity (Property 7)
    - **Property 7: Savings contribution atomicity**
    - **Validates: Requirements 3.1, 3.3, 6.6**
    - In `backend/tests/test_savings_property.py`, use Hypothesis to generate `(savings goal, amount ∈ [1, 10M], account_id)` and assert: contribution row has valid `transaction_id` pointing to a `transfer_out`, `Savings_Dim.current_balance` increased by `amount`, account `current_balance` decreased by `amount`.

  - [ ]* 8.2 Write property test for savings contribution without account (Property 8)
    - **Property 8: Savings contribution transaction-free**
    - **Validates: Requirements 3.5**
    - In `backend/tests/test_savings_property.py`, call contribution without `account_id` and assert `transaction_id = NULL`, no new `Transaction_Fact` row, `current_balance` still increases.

  - [ ]* 8.3 Write property test for savings auto-complete (Property 9)
    - **Property 9: Savings auto-complete threshold**
    - **Validates: Requirements 3.7**
    - In `backend/tests/test_savings_property.py`, generate `(current_balance C, target_amount T ∈ [1, 10M], contribution A ∈ [1, 2T])`, assert status becomes 'completed' iff `C + A >= T`, otherwise unchanged.

  - [ ]* 8.4 Write unit tests for savings contribution endpoint
    - In `backend/tests/test_savings.py`, cover: contribution with `account_id` creates `transfer_out` transaction, contribution without `account_id` creates no transaction, auto-complete on target reached.
    - _Requirements: 3.1, 3.4, 3.5, 3.7_

- [x] 9. Refactor `delete_savings_contribution()` to atomic batch
  - In `backend/routes/savings.py`, update `delete_savings_contribution()`:
    - Fetch `amount, transaction_id` from `Savings_Contribution_Fact`.
    - Build base `stmts`: DELETE the contribution row, UPDATE `Savings_Dim current_balance = MAX(0, current_balance - amount)` and revert status if completed.
    - If `linked_tx_id` exists, fetch `type, amount, account_id` from `Transaction_Fact`. `balance_reversal = tx_amount` (always `transfer_out`, so add back). Append soft-delete of linked tx and reversal of account `current_balance`.
    - Execute all as a single `db.batch()`.
  - _Requirements: 6.6_

  - [ ]* 9.1 Write property test for savings contribution delete round-trip (Property 16)
    - **Property 16: Savings contribution delete round-trip**
    - **Validates: Requirements 6.6**
    - In `backend/tests/test_savings_property.py`, for random inputs create a contribution (with `account_id`), then delete it, and assert `current_balance = C`, linked `Transaction_Fact.is_deleted = 1`, account `current_balance` restored.

- [x] 10. Checkpoint — backend atomicity complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 11. Update frontend types and API wrappers
  - In `frontend/api/dashboard.ts`, add `current_balance: number` to the `Account` interface.
  - In `frontend/api/accounts.ts`, add `transferBetweenAccounts(payload)` to `accountsApi` calling `POST /api/accounts/transfer`.
  - In `frontend/api/debts.ts`, update `createPayment` signature to accept `account_id?: number` and `note?: string` (keep `transaction_id?: string` for backward compat).
  - In `frontend/api/savings.ts`, update `createContribution` signature to accept `account_id?: number` and `note?: string` (keep `transaction_id?: string` for backward compat).
  - _Requirements: 2.6, 3.6, 4.5_

  - [x] 11.1 Add `current_balance` to `Account` interface in `api/dashboard.ts`
    - _Requirements: 4.5_

  - [x] 11.2 Add `transferBetweenAccounts` to `accountsApi` in `api/accounts.ts`
    - _Requirements: 1.6_

  - [x] 11.3 Update `createPayment` signature in `api/debts.ts`
    - _Requirements: 2.6_

  - [x] 11.4 Update `createContribution` signature in `api/savings.ts`
    - _Requirements: 3.6_

- [x] 12. Update frontend hooks
  - In `frontend/hooks/useAccounts.ts`, add `useTransferBetweenAccounts()` mutation that calls `accountsApi.transferBetweenAccounts` and invalidates `['accounts']` and `['transactions']` on success.
  - In `frontend/hooks/useDebts.ts`, update `totalDebt` filter from `status === 'active'` to `status === 'active' || status === 'overdue'`. Also update `totalLoan` and `nextPayment` filters for consistency if applicable.
  - _Requirements: 2.6, 3.6, 5.1, 5.4, 5.5_

  - [x] 12.1 Add `useTransferBetweenAccounts` mutation to `hooks/useAccounts.ts`
    - _Requirements: 1.6_

  - [x] 12.2 Fix `totalDebt` filter in `hooks/useDebts.ts` to include `'overdue'`
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ]* 12.3 Write property test for unified totalDebt filter (Property 14)
    - **Property 14: Unified totalDebt filter**
    - **Validates: Requirements 5.1, 5.2**
    - In `frontend/hooks/useDebts.property.test.ts`, use fast-check to generate a random array of debts with varying `debt_type` ('debt'|'loan') and `status` ('active'|'overdue'|'settled'|'cancelled') values, and assert that `totalDebt` equals `Σ outstanding_balance WHERE debt_type='debt' AND status IN ('active','overdue')`.

  - [ ]* 12.4 Write unit tests for `useDebts` hook
    - In `frontend/hooks/useDebts.test.ts`, verify: `totalDebt` includes `'overdue'` debts, excludes `'settled'` and `'cancelled'` debts, excludes `debt_type='loan'` records.
    - _Requirements: 5.1, 5.4, 5.5_

- [x] 13. Simplify frontend components to use `current_balance`
  - In `frontend/components/dashboard/AccountsSummary.tsx`:
    - Remove `transactions` from `AccountsSummaryProps`.
    - Remove the `computeBalance()` helper function.
    - Remove the `normalizeId()` helper (no longer used here).
    - Replace `computeBalance(acc, transactions)` with `acc.current_balance` directly.
  - In `frontend/hooks/useDashboard.ts`:
    - Replace the transaction-iteration `totalBalance` reducer with `accounts.reduce((sum, acc) => sum + acc.current_balance, 0)`.
    - Remove the `normalizeId` import/usage from the `totalBalance` computation only (keep it if used elsewhere in the file).
  - In `frontend/components/dashboard/DynamicChart.tsx`:
    - In `accountDistributionData`, replace `currentAccountBalance(account, transactions)` with `account.current_balance`.
    - Remove `transactions` from the `useMemo` dependency array for `accountDistributionData`.
    - Update `debtOffset` to use `status === 'active' || status === 'overdue'` filter on `debt_type === 'debt'` (to match `useDebts`).
  - _Requirements: 4.6, 4.7, 4.8, 5.2, 5.3_

  - [x] 13.1 Simplify `AccountsSummary.tsx` to use `acc.current_balance`
    - _Requirements: 4.6_

  - [x] 13.2 Simplify `useDashboard.ts` `totalBalance` computation
    - _Requirements: 4.7_

  - [x] 13.3 Update `DynamicChart.tsx` `accountDistributionData` and `debtOffset`
    - _Requirements: 4.8, 5.2, 5.3_

  - [ ]* 13.4 Write unit test for `AccountsSummary` uses `current_balance`
    - In `frontend/components/dashboard/AccountsSummary.test.tsx`, verify that the component renders `account.current_balance` directly without a `transactions` prop.
    - _Requirements: 4.6_

- [x] 14. Refactor `AIChatWidget.tsx` debt payment and savings contribution flows
  - In `frontend/components/dashboard/AIChatWidget.tsx`, update the `confirmEntry` function:
    - **Debt payment path** (`opType === 'debt_payment'`): Replace the two-step `createTransferTransaction` + `debtsApi.createPayment` calls with a single `debtsApi.createPayment(matched.debt_id, { amount_paid, payment_date, account_id: accountId, note })`. Add `queryClient.invalidateQueries({ queryKey: ['transactions'] })` and `queryClient.invalidateQueries({ queryKey: ['accounts'] })` on success.
    - **Savings contribution path** (`opType === 'savings_contribution'`): Replace the two-step `createTransferTransaction` + `savingsApi.createContribution` calls with a single `savingsApi.createContribution(savingsId, { amount, contribution_date: contributionDate, account_id: accountId, note })`. Add `queryClient.invalidateQueries({ queryKey: ['transactions'] })` and `queryClient.invalidateQueries({ queryKey: ['accounts'] })` on success.
    - The `createTransferTransaction` helper function MUST remain — it is still used by the `new_debt` path.
    - Update the `DebtPaymentDraftForm` and `SavingsContributionDraftForm` interfaces if any field changes are needed.
  - _Requirements: 2.6, 3.6_

  - [ ]* 14.1 Write unit test for AIChatWidget debt payment single-call flow
    - In `frontend/components/dashboard/AIChatWidget.test.tsx`, mock `debtsApi.createPayment` and verify it is called with `account_id` in the payload and that `createTransferTransaction` is NOT called for debt payments.
    - _Requirements: 2.6_

  - [ ]* 14.2 Write unit test for AIChatWidget savings contribution single-call flow
    - In `frontend/components/dashboard/AIChatWidget.test.tsx`, mock `savingsApi.createContribution` and verify it is called with `account_id` and that `createTransferTransaction` is NOT called for savings contributions.
    - _Requirements: 3.6_

- [ ] 15. Final checkpoint — full stack integration
  - Ensure all backend Python tests pass (`pytest backend/tests/`).
  - Ensure frontend builds successfully (`cd frontend && npm run build`).
  - Ensure all frontend tests pass.
  - Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery.
- Each task references specific requirements for traceability.
- **Critical constraint**: `libsql_client` in HTTP mode does not support `BEGIN`/`COMMIT`. Use `db.batch([stmt1, stmt2, ...])` for every multi-statement operation that requires atomicity.
- **Transfer category resolution**: Both debt payment and savings contribution endpoints need a `category_id`. Resolve via `SELECT category_id FROM Category_Dim WHERE user_id=? AND category_name='Khác' LIMIT 1`, falling back to first category.
- Checkpoints validate incremental progress across backend and frontend layers.
- Property tests (Hypothesis for Python, fast-check for TypeScript) validate universal behaviors across many generated inputs.
- Unit tests validate specific examples and edge cases.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5", "3.6", "4.1", "4.2"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["7.1"] },
    { "id": 6, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "id": 9, "tasks": ["12.1", "12.2"] },
    { "id": 10, "tasks": ["12.3", "12.4", "13.1", "13.2", "13.3"] },
    { "id": 11, "tasks": ["13.4", "14.1", "14.2"] }
  ]
}
```
