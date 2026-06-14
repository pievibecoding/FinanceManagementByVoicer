export const CASH_DIRECTION_OPTIONS = ['in', 'out', 'neutral'] as const
export const OPERATION_TYPE_OPTIONS = [
  'expense',
  'income',
  'inner_transfer',
] as const

export const TRANSACTION_TYPE_OPTIONS = CASH_DIRECTION_OPTIONS
export const STANDARD_TRANSACTION_TYPE_OPTIONS = ['expense', 'income'] as const
export const FILTER_TRANSACTION_TYPE_OPTIONS = OPERATION_TYPE_OPTIONS

export type CashDirectionOption = (typeof CASH_DIRECTION_OPTIONS)[number]
export type OperationTypeOption = (typeof OPERATION_TYPE_OPTIONS)[number]
export type TransactionTypeOption = CashDirectionOption
export type StandardTransactionTypeOption = (typeof STANDARD_TRANSACTION_TYPE_OPTIONS)[number]
export type FilterTransactionTypeOption = OperationTypeOption

export function isTransactionTypeOption(value: string): value is TransactionTypeOption {
  return CASH_DIRECTION_OPTIONS.includes(value as TransactionTypeOption)
}

export function isOperationTypeOption(value: string): value is OperationTypeOption {
  return OPERATION_TYPE_OPTIONS.includes(value as OperationTypeOption)
}

export function isFilterTransactionTypeOption(value: string): value is FilterTransactionTypeOption {
  return isOperationTypeOption(value)
}

export function operationTypeForTransaction(transaction: { type?: string; transaction_type?: string; operation_type?: string }) {
  if (transaction.transaction_type === 'account_transfer') return 'inner_transfer'
  if (transaction.transaction_type && isOperationTypeOption(transaction.transaction_type)) return transaction.transaction_type
  if (transaction.operation_type === 'account_transfer') return 'inner_transfer'
  if (transaction.operation_type && isOperationTypeOption(transaction.operation_type)) return transaction.operation_type
  if (transaction.type === 'income' || transaction.type === 'in') return 'income'
  if (transaction.type === 'expense' || transaction.type === 'out') return 'expense'
  if (transaction.type === 'transfer_in' || transaction.type === 'transfer_out' || transaction.type === 'neutral') return 'inner_transfer'
  return 'expense'
}

export function cashDirectionForTransaction(transaction: { type?: string }) {
  if (transaction.type === 'income' || transaction.type === 'transfer_in') return 'in'
  if (transaction.type === 'expense' || transaction.type === 'transfer_out') return 'out'
  if (transaction.type === 'in' || transaction.type === 'out' || transaction.type === 'neutral') return transaction.type
  return 'neutral'
}

export function isTransferTransactionType(value: string) {
  return value === 'transfer_in' || value === 'transfer_out' || value === 'account_transfer' || value === 'inner_transfer' || value === 'neutral'
}

export function matchesTransactionTypeFilter(transactionType: string, filterType: string, operationType?: string) {
  const normalized = operationTypeForTransaction({ type: transactionType, operation_type: operationType })
  return normalized === filterType
}

export function isPositiveTransactionType(value: string) {
  return value === 'income' || value === 'transfer_in' || value === 'in'
}

export function isNegativeTransactionType(value: string) {
  return value === 'expense' || value === 'transfer_out' || value === 'out'
}
