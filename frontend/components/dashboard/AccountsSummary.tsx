import type { Account, Transaction } from '@/api/dashboard'
import { accountBorderColors } from '@/styles/tokens'

interface AccountsSummaryProps {
  accounts: Account[]
  transactions: Transaction[]
}

function computeBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initial_balance
  transactions.forEach(tx => {
    if (tx.account_id !== account.account_id) return
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
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm h-full">
      <h3 className="text-foreground font-semibold text-sm mb-4">Tài khoản</h3>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có tài khoản nào.</p>
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
                  {fmt(balance)}đ
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
