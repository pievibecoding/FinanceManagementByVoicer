export const TRANSACTION_TYPE_OPTIONS = ['expense', 'income', 'transfer_in', 'transfer_out'] as const
export const STANDARD_TRANSACTION_TYPE_OPTIONS = ['expense', 'income'] as const

export type TransactionTypeOption = (typeof TRANSACTION_TYPE_OPTIONS)[number]
export type StandardTransactionTypeOption = (typeof STANDARD_TRANSACTION_TYPE_OPTIONS)[number]

export function isTransactionTypeOption(value: string): value is TransactionTypeOption {
  return TRANSACTION_TYPE_OPTIONS.includes(value as TransactionTypeOption)
}

export function isTransferTransactionType(value: string) {
  return value === 'transfer_in' || value === 'transfer_out'
}

export function isPositiveTransactionType(value: string) {
  return value === 'income' || value === 'transfer_in'
}

export function isNegativeTransactionType(value: string) {
  return value === 'expense' || value === 'transfer_out'
}
