import type { Account } from '@/api/dashboard'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { AppCard } from '@/components/common'
import { getAccountDisplayColor } from '@/lib/account-display'

interface AccountsSummaryProps {
  accounts: Account[]
}

const ACCOUNT_ICONS: Record<string, string> = {
  'Bank': '🏦',
  'E-Wallet': '📱',
  'Investment': '📈',
  'Cash': '💵',
}

export function AccountsSummary({ accounts }: AccountsSummaryProps) {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()

  return (
    <AppCard className="h-full rounded-[var(--radius)] p-5">
      <h3 className="text-foreground font-semibold text-sm mb-4">{t('accounts.title')}</h3>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('accounts.emptyShort')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((acc, index) => {
            const balance = acc.current_balance
            const isNegative = balance < 0
            const accountColor = getAccountDisplayColor(acc, index)
            return (
              <div
                key={acc.account_id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                style={{ borderColor: `${accountColor}99` }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid size-9 place-items-center rounded-full text-xl"
                    style={{ backgroundColor: `${accountColor}22`, color: accountColor }}
                  >
                    {ACCOUNT_ICONS[acc.account_type] ?? '📁'}
                  </span>
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
    </AppCard>
  )
}
