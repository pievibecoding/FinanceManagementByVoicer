import type { Account, Transaction } from '@/api/dashboard'

interface AccountsSummaryProps {
  accounts: Account[]
  transactions: Transaction[]
}

function computeBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.initial_balance
  transactions.forEach(tx => {
    if (tx.account_id !== account.account_id) return
    if (tx.type === 'income') balance += tx.amount
    else balance -= tx.amount // expense + investment both subtract
  })
  return balance
}

const ACCOUNT_ICONS: Record<string, string> = {
  'Bank': '🏦',
  'E-Wallet': '📱',
  'Investment': '📈',
  'Cash': '💵',
}

const ACCOUNT_COLORS: Record<string, string> = {
  'Bank': 'border-[#678d58]/60',
  'E-Wallet': 'border-[#74d3ae]/60',
  'Investment': 'border-sky-500/60',
  'Cash': 'border-amber-500/60',
}

export function AccountsSummary({ accounts, transactions }: AccountsSummaryProps) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-5 backdrop-blur-sm h-full">
      <h3 className="text-white font-semibold text-sm mb-4">Tài khoản</h3>

      {accounts.length === 0 ? (
        <p className="text-white/40 text-sm">Chưa có tài khoản nào.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map(acc => {
            const balance = computeBalance(acc, transactions)
            const isNegative = balance < 0
            return (
              <div
                key={acc.account_id}
                className={`flex items-center justify-between p-3 rounded-lg bg-white/4 border ${ACCOUNT_COLORS[acc.account_type] ?? 'border-white/10'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{ACCOUNT_ICONS[acc.account_type] ?? '📁'}</span>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{acc.account_name}</p>
                    <p className="text-white/40 text-xs">{acc.account_type}</p>
                  </div>
                </div>
                <p className={`text-sm font-bold tabular-nums ${isNegative ? 'text-[#dd9787]' : 'text-white'}`}>
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
