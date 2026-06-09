import { useDebts } from '@/hooks/useDebts'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

export function DebtWidget() {
  const { t } = useTranslation()
  const { totalDebt, nextPayment, isLoading } = useDebts()
  const { formatCurrency, formatDate } = useLocaleFormat()

  if (isLoading) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm animate-pulse h-24" />
    )
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm">
      <h3 className="text-white/60 text-xs uppercase mb-2">{t('dashboard.debtDue')}</h3>
      <p className="text-white text-xl font-bold tabular-nums">{formatCurrency(totalDebt)}</p>
      {nextPayment && (
        <div className="mt-2 text-xs text-white/40">
          <span>{t('dashboard.nextPayment')}: {formatCurrency(nextPayment.outstanding_balance || 0)}</span>
          {nextPayment.due_date && (
            <span className="ml-2">({formatDate(nextPayment.due_date)})</span>
          )}
        </div>
      )}
    </div>
  )
}
