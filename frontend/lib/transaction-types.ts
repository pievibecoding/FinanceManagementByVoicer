export const TRANSACTION_TYPE_OPTIONS = ['expense', 'income'] as const

export type TransactionTypeOption = (typeof TRANSACTION_TYPE_OPTIONS)[number]

export function isTransactionTypeOption(value: string): value is TransactionTypeOption {
  return TRANSACTION_TYPE_OPTIONS.includes(value as TransactionTypeOption)
}
