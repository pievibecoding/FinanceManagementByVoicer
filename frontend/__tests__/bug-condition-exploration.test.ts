/**
 * Bug Condition Exploration Tests — Task 1
 *
 * These tests MUST FAIL on unfixed code.
 * Failure confirms the bugs exist. DO NOT fix the code yet.
 *
 * Bug 1: confirmEntry reads `parsed` instead of `draft` for debt operations
 * Bug 2: accountBalanceAtDate() misses inner_transfer transactions
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi } from 'vitest'
import { cashDirectionForTransaction, operationTypeForTransaction } from '../lib/transaction-types'

// ---------------------------------------------------------------------------
// Helpers replicated verbatim from source (so tests are self-contained)
// ---------------------------------------------------------------------------

function normalizeId(value: string | number | null | undefined): string {
  return value == null ? '' : String(value)
}

function dateKeyFromTransaction(tx: { transaction_date: string }): string {
  return tx.transaction_date.slice(0, 10)
}

/**
 * BUGGY accountBalanceAtDate — exact copy of the unfixed code in DynamicChart.tsx.
 * Bug: inner_transfer rows have type='neutral' → cashDirectionForTransaction returns 'neutral'
 *      AND they use source_account_id / destination_account_id, not account_id,
 *      so the first guard always exits early for inner_transfer.
 */
function accountBalanceAtDate_BUGGY(
  account: { account_id: number; initial_balance: number },
  transactions: Array<{
    transaction_id: string
    transaction_date: string
    account_id: number
    type: string
    transaction_type?: string | null
    amount: number
    source_account_id?: number | null
    destination_account_id?: number | null
  }>,
  dateKey: string
): number {
  const accountId = normalizeId(account.account_id)
  return transactions.reduce((balance, tx) => {
    // BUG: inner_transfer stores accounts in source/destination fields, not account_id.
    //      account_id on inner_transfer rows is typically null/undefined, so this guard
    //      always exits early — the tx is never counted.
    if (normalizeId(tx.account_id) !== accountId) return balance
    if (dateKeyFromTransaction(tx) > dateKey) return balance
    const direction = cashDirectionForTransaction(tx)
    if (direction === 'in') return balance + tx.amount
    if (direction === 'out') return balance - tx.amount
    return balance
  }, account.initial_balance)
}

// ---------------------------------------------------------------------------
// syncParsedFromDraft — verbatim from AIChatWidget.tsx (debt_disbursement branch)
// Used to show what SHOULD happen but currently doesn't in confirmEntry.
// ---------------------------------------------------------------------------

interface ParsedData {
  valid?: boolean
  operation_type?: string
  debt_id?: number | null
  amount: number
  type?: string
  account_id?: number | null
  note?: string
  transaction_date?: string
  debt_name?: string
  debt_type?: string
  lender?: string
  debtor?: string
}

interface NewDebtDraftForm {
  kind: 'debt_disbursement'
  debt_name: string
  debt_type: 'debt' | 'loan'
  lender: string
  debtor: string
  amount: number | ''
  account_id: number | ''
  note: string
}

interface DebtPaymentDraftForm {
  kind: 'debt_payment'
  debt_id: number | ''
  debt_name: string
  lender: string
  debtor: string
  amount: number | ''
  account_id: number | ''
  transaction_date: string
  transaction_time: string
  note: string
}

type AiDraftForm = NewDebtDraftForm | DebtPaymentDraftForm

function syncParsedFromDraft_debtDisbursement(
  parsed: ParsedData,
  draft: NewDebtDraftForm
): ParsedData {
  return {
    ...parsed,
    operation_type: 'debt_disbursement',
    debt_name: draft.debt_name,
    debt_type: draft.debt_type,
    lender: draft.lender,
    debtor: draft.debtor,
    amount: Number(draft.amount),
    account_id: draft.account_id === '' ? null : Number(draft.account_id),
    note: draft.note,
  }
}

function syncParsedFromDraft_debtPayment(
  parsed: ParsedData,
  draft: DebtPaymentDraftForm
): ParsedData {
  return {
    ...parsed,
    operation_type: 'debt_payment',
    debt_id: draft.debt_id === '' ? null : Number(draft.debt_id),
    amount: Number(draft.amount),
    account_id: draft.account_id === '' ? null : Number(draft.account_id),
    note: draft.note,
    transaction_date: `${draft.transaction_date} ${draft.transaction_time}`,
  }
}

/**
 * Simulates what confirmEntry ACTUALLY does (buggy): reads from `parsed` directly.
 * Returns the principal value that would be passed to debtsApi.createDebt.
 */
function confirmEntry_debtDisbursement_BUGGY(
  parsed: ParsedData,
  _draft: NewDebtDraftForm
): { principal: number; account_id: number } {
  // BUG: ignores draft entirely, reads from parsed
  return {
    principal: parsed.amount,           // BUG: should be draft.amount
    account_id: Number(parsed.account_id), // BUG: should be Number(draft.account_id)
  }
}

/**
 * Simulates what confirmEntry ACTUALLY does (buggy): reads from `parsed` for debt_payment.
 * Returns the debt_id and amount_paid that would be passed to debtsApi.createPayment.
 */
function confirmEntry_debtPayment_BUGGY(
  parsed: ParsedData,
  _draft: DebtPaymentDraftForm
): { debt_id: number | null; amount_paid: number } {
  // BUG: ignores draft entirely, reads from parsed
  return {
    debt_id: parsed.debt_id ?? null,  // BUG: should be Number(draft.debt_id)
    amount_paid: parsed.amount,        // BUG: should be Number(draft.amount)
  }
}

// ---------------------------------------------------------------------------
// BUG 1 TESTS — Expected to FAIL on unfixed code
// ---------------------------------------------------------------------------

describe('Bug 1 — confirmEntry reads parsed instead of draft for debt operations', () => {
  /**
   * Bug Condition: opType === 'debt_disbursement' AND draft.amount !== parsed.amount
   *
   * Counterexample:
   *   parsed = { operation_type: 'debt_disbursement', amount: 100000, account_id: 1, ... }
   *   draft  = { kind: 'debt_disbursement', amount: 200000, account_id: 2, ... }
   *
   * Expected: debtsApi.createDebt receives principal: 200000 (draft value)
   * Actual:   debtsApi.createDebt receives principal: 100000 (parsed value) ← BUG
   */
  it('debt_disbursement: API should receive draft.amount (200000), not parsed.amount (100000)', () => {
    const parsed: ParsedData = {
      operation_type: 'debt_disbursement',
      amount: 100000,          // AI-parsed amount
      account_id: 1,
      debt_name: 'AI parsed debt',
      debt_type: 'debt',
      lender: 'Bank A',
      debtor: '',
      note: '',
    }

    const draft: NewDebtDraftForm = {
      kind: 'debt_disbursement',
      amount: 200000,          // User-edited amount — differs from parsed
      account_id: 2,           // User-edited account — differs from parsed
      debt_name: 'User edited debt name',
      debt_type: 'debt',
      lender: 'Bank A',
      debtor: '',
      note: 'user note',
    }

    // What the FIXED code should send to the API (draft values):
    const expectedApiCall = {
      principal: Number(draft.amount),       // 200000
      account_id: Number(draft.account_id),  // 2
    }

    // What the BUGGY code actually sends (parsed values):
    const actualApiCall = confirmEntry_debtDisbursement_BUGGY(parsed, draft)

    // This assertion FAILS on unfixed code:
    // actualApiCall.principal === 100000, but we expect 200000
    expect(actualApiCall.principal).toBe(expectedApiCall.principal)
    expect(actualApiCall.account_id).toBe(expectedApiCall.account_id)
  })

  /**
   * Bug Condition: opType === 'debt_payment' AND draft.debt_id !== null while parsed.debt_id === null
   *
   * Counterexample:
   *   parsed = { operation_type: 'debt_payment', debt_id: null, amount: 50000, ... }
   *   draft  = { kind: 'debt_payment', debt_id: 7, amount: 75000, ... }
   *
   * Expected: debtsApi.createPayment(7, { amount_paid: 75000, ... })
   * Actual:   debtsApi.createPayment(null, { amount_paid: 50000, ... }) ← BUG
   */
  it('debt_payment: API should receive draft.debt_id (7) not parsed.debt_id (null)', () => {
    const parsed: ParsedData = {
      operation_type: 'debt_payment',
      debt_id: null,    // AI could not resolve the debt
      amount: 50000,
      account_id: 1,
      note: '',
    }

    const draft: DebtPaymentDraftForm = {
      kind: 'debt_payment',
      debt_id: 7,       // User selected the correct debt in the UI
      amount: 75000,    // User corrected the amount too
      account_id: 3,
      debt_name: 'Loan from Bank B',
      lender: 'Bank B',
      debtor: '',
      transaction_date: '2024-01-15',
      transaction_time: '10:00:00',
      note: 'payment note',
    }

    // What the FIXED code should send to the API (draft values):
    const expectedDebtId = Number(draft.debt_id)  // 7
    const expectedAmount = Number(draft.amount)    // 75000

    // What the BUGGY code actually sends (parsed values):
    const actualApiCall = confirmEntry_debtPayment_BUGGY(parsed, draft)

    // These assertions FAIL on unfixed code:
    // actualApiCall.debt_id === null, but we expect 7
    // actualApiCall.amount_paid === 50000, but we expect 75000
    expect(actualApiCall.debt_id).toBe(expectedDebtId)
    expect(actualApiCall.amount_paid).toBe(expectedAmount)
  })

  /**
   * Additional verification: syncParsedFromDraft correctly merges draft → parsed.
   * This confirms the fix will work: calling syncParsedFromDraft before reading values
   * would produce the correct result.
   */
  it('syncParsedFromDraft produces correct synced values that match draft (not parsed)', () => {
    const parsed: ParsedData = {
      operation_type: 'debt_disbursement',
      amount: 100000,
      account_id: 1,
      debt_name: 'Original AI debt',
      debt_type: 'debt',
      lender: 'Lender A',
      debtor: '',
      note: 'original',
    }

    const draft: NewDebtDraftForm = {
      kind: 'debt_disbursement',
      amount: 200000,
      account_id: 2,
      debt_name: 'User edited name',
      debt_type: 'loan',
      lender: 'Lender B',
      debtor: 'Borrower X',
      note: 'edited note',
    }

    const synced = syncParsedFromDraft_debtDisbursement(parsed, draft)

    // The synced object should reflect draft values, not parsed values
    expect(synced.amount).toBe(200000)
    expect(synced.account_id).toBe(2)
    expect(synced.debt_name).toBe('User edited name')
    expect(synced.debt_type).toBe('loan')
    expect(synced.lender).toBe('Lender B')
    expect(synced.note).toBe('edited note')
  })
})

// ---------------------------------------------------------------------------
// BUG 2 TESTS — Expected to FAIL on unfixed code
// ---------------------------------------------------------------------------

describe('Bug 2 — accountBalanceAtDate() misses inner_transfer', () => {
  /**
   * Bug Condition: tx.transaction_type === 'inner_transfer' AND
   *                account is destination_account_id of the transfer
   *
   * Counterexample:
   *   account = { account_id: 2, initial_balance: 1000000 }
   *   tx = {
   *     transaction_type: 'inner_transfer',
   *     type: 'neutral',
   *     account_id: 0,  ← inner_transfer rows don't use account_id
   *     source_account_id: 1,
   *     destination_account_id: 2,
   *     amount: 500000,
   *     transaction_date: '2024-01-15 10:00:00'
   *   }
   *   dateKey = '2024-01-15'
   *
   * Expected: 1000000 + 500000 = 1500000 (balance should increase by received amount)
   * Actual:   1000000 (inner_transfer ignored because account_id guard exits early) ← BUG
   */
  it('destination account balance should increase by inner_transfer amount', () => {
    const account = { account_id: 2, initial_balance: 1_000_000 }

    const innerTransferTx = {
      transaction_id: 'tx-001',
      transaction_date: '2024-01-15 10:00:00',
      account_id: 0 as number,       // inner_transfer rows don't use account_id
      type: 'neutral',               // this causes cashDirectionForTransaction → 'neutral'
      transaction_type: 'inner_transfer',
      amount: 500_000,
      source_account_id: 1,
      destination_account_id: 2,
    }

    const dateKey = '2024-01-15'

    // Expected: 1000000 + 500000 = 1500000
    const expectedBalance = account.initial_balance + innerTransferTx.amount

    // BUGGY implementation — exits early because account_id (0) !== '2'
    const actualBalance = accountBalanceAtDate_BUGGY(account, [innerTransferTx], dateKey)

    // This assertion FAILS on unfixed code:
    // actualBalance === 1000000 (initial_balance unchanged), but we expect 1500000
    expect(actualBalance).toBe(expectedBalance)
  })

  /**
   * Bug Condition: account is source_account_id of the inner_transfer
   * Expected: balance decreases by the transferred amount
   * Actual: balance unchanged (inner_transfer ignored) ← BUG
   */
  it('source account balance should decrease by inner_transfer amount', () => {
    const account = { account_id: 1, initial_balance: 2_000_000 }

    const innerTransferTx = {
      transaction_id: 'tx-002',
      transaction_date: '2024-01-15 10:00:00',
      account_id: 0 as number,
      type: 'neutral',
      transaction_type: 'inner_transfer',
      amount: 500_000,
      source_account_id: 1,
      destination_account_id: 2,
    }

    const dateKey = '2024-01-15'

    // Expected: 2000000 - 500000 = 1500000
    const expectedBalance = account.initial_balance - innerTransferTx.amount

    // BUGGY implementation
    const actualBalance = accountBalanceAtDate_BUGGY(account, [innerTransferTx], dateKey)

    // This assertion FAILS on unfixed code:
    // actualBalance === 2000000, but we expect 1500000
    expect(actualBalance).toBe(expectedBalance)
  })

  /**
   * Balance conservation: sum of all accounts should be preserved after inner_transfer.
   * With the bug: both account balances are unchanged → sum looks doubled.
   */
  it('sum of account balances is conserved after inner_transfer (no money created)', () => {
    const sourceAccount = { account_id: 1, initial_balance: 2_000_000 }
    const destAccount   = { account_id: 2, initial_balance: 1_000_000 }

    const innerTransferTx = {
      transaction_id: 'tx-003',
      transaction_date: '2024-01-15 10:00:00',
      account_id: 0 as number,
      type: 'neutral',
      transaction_type: 'inner_transfer',
      amount: 500_000,
      source_account_id: 1,
      destination_account_id: 2,
    }

    const dateKey = '2024-01-15'

    const sourceBalance = accountBalanceAtDate_BUGGY(sourceAccount, [innerTransferTx], dateKey)
    const destBalance   = accountBalanceAtDate_BUGGY(destAccount,   [innerTransferTx], dateKey)

    const totalInitial  = sourceAccount.initial_balance + destAccount.initial_balance
    const totalActual   = sourceBalance + destBalance

    // After an inner_transfer, total balance across both accounts must equal initial total.
    // BUGGY: both balances are unchanged (2000000 + 1000000 = 3000000 = totalInitial),
    //        which accidentally passes this assertion.
    // But individual balances are wrong — covered by tests above.
    expect(totalActual).toBe(totalInitial)

    // More importantly: the individual balances should show the movement:
    // source should be 1500000, dest should be 1500000
    expect(sourceBalance).toBe(1_500_000)  // FAILS on unfixed code (returns 2000000)
    expect(destBalance).toBe(1_500_000)    // FAILS on unfixed code (returns 1000000)
  })

  /**
   * Sanity check: operationTypeForTransaction correctly identifies inner_transfer.
   * This confirms the fix approach (using operationTypeForTransaction) is sound.
   */
  it('operationTypeForTransaction identifies inner_transfer correctly', () => {
    const innerTransferTx = {
      transaction_id: 'tx-004',
      transaction_date: '2024-01-15 10:00:00',
      account_id: 0,
      type: 'neutral',
      transaction_type: 'inner_transfer',
      amount: 500_000,
    }

    // This should pass (helper function already works correctly)
    expect(operationTypeForTransaction(innerTransferTx)).toBe('inner_transfer')

    // cashDirectionForTransaction returns 'neutral' for type='neutral' → BUG path
    expect(cashDirectionForTransaction(innerTransferTx)).toBe('neutral')
  })
})
