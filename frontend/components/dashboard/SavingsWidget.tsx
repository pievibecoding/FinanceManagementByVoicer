import { useSavings } from '@/hooks/useSavings'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

export function SavingsWidget() {
  const { t } = useTranslation()
  const { totalSaved, nearestGoal, isLoading } = useSavings()
  const { formatCurrency, formatDate } = useLocaleFormat()

  if (isLoading) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm animate-pulse h-24" />
    )
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm">
      <h3 className="text-white/60 text-xs uppercase mb-2">{t('dashboard.totalSaved')}</h3>
      <p className="text-white text-xl font-bold tabular-nums">{formatCurrency(totalSaved)}</p>
      {nearestGoal && (
        <div className="mt-2 text-xs text-white/40">
          <span>{t('dashboard.nearestGoal')}: {nearestGoal.name}</span>
          {nearestGoal.target_date && (
            <span className="ml-2">({formatDate(nearestGoal.target_date)})</span>
          )}
        </div>
      )}
    </div>
  )
}
