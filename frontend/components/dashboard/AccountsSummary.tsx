import type { Account, Transaction } from '@/api/dashboard'
import { accountBorderColors } from '@/styles/tokens'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

interface AccountsSummaryProps {
  accounts: Account[]
  transactions: Transaction[]
}

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

function computeBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initial_balance
  const accountId = normalizeId(account.account_id)
  transactions.forEach(tx => {
    if (normalizeId(tx.account_id) !== accountId) return
    if (tx.type === 'income') balance += tx.amount
    else balance -= tx.amount
  })
  return balance
}

const ACCOUNT_ICONS: Record<string, string> = {
  'Bank': '🏦',
  'E-Wallet': '📱',
  'Investment': '📈',
  'Cash': '💵',
}

const ACCOUNT_COLORS: Record<string, string> = accountBorderColors

export function AccountsSummary({ accounts, transactions }: AccountsSummaryProps) {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm h-full">
      <h3 className="text-foreground font-semibold text-sm mb-4">{t('accounts.title')}</h3>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('accounts.emptyShort')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map(acc => {
            const balance = computeBalance(acc, transactions)
            const isNegative = balance < 0
            return (
              <div
                key={acc.account_id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                style={{ borderColor: (ACCOUNT_COLORS[acc.account_type] ?? '') + '99' }}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{ACCOUNT_ICONS[acc.account_type] ?? '📁'}</span>
                  <div>
                    <p className="text-foreground text-sm font-medium leading-tight">{acc.account_name}</p>
                    <p className="text-muted-foreground text-xs">{acc.account_type}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold tabular-nums ${isNegative ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
