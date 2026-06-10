import type { Transaction } from '@/api/dashboard'
import type { Budget } from '@/api/budgets'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { AppCard } from '@/components/common'
import { budgetMeterColors } from '@/styles/tokens'

interface Category {
  category_id: number | string
  category_name: string
}

interface BudgetOverviewProps {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[]
}

export function BudgetOverview({ budgets, categories, transactions }: BudgetOverviewProps) {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()

  const currentMonth = new Date().toISOString().slice(0, 7)

  // Calculate spending per category this month (expense only)
  const spendingMap: Record<number, number> = {}
  transactions.forEach(tx => {
    if (tx.type !== 'expense') return
    if (!tx.transaction_date.startsWith(currentMonth)) return
    const catId = Number(tx.category_id)
    spendingMap[catId] = (spendingMap[catId] ?? 0) + tx.amount
  })

  // Build items: only categories that have a budget AND have been spent this month
  const items = budgets
    .map(b => {
      const budgetCategoryId = String(b.category_id)
      const cat = categories.find(c => String(c.category_id) === budgetCategoryId)
      const spent = spendingMap[b.category_id] ?? 0
      return { ...b, category_name: cat?.category_name ?? t('categories.fallbackWithId', { id: b.category_id }), spent }
    })
    .filter(item => item.spent > 0 || item.amount_limit > 0)
    .sort((a, b) => b.spent / b.amount_limit - a.spent / a.amount_limit)

  if (items.length === 0) {
    return (
      <AppCard className="rounded-[var(--radius)] p-5">
        <h3 className="text-foreground font-semibold text-sm mb-2">{t('dashboard.currentMonthBudget')}</h3>
        <p className="text-muted-foreground text-sm">{t('dashboard.noBudgetSetup')}</p>
      </AppCard>
    )
  }

  return (
    <AppCard className="rounded-[var(--radius)] p-5">
      <h3 className="text-foreground font-semibold text-sm mb-4">{t('dashboard.currentMonthBudget')}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map(item => {
          const rawPct = item.amount_limit > 0 ? (item.spent / item.amount_limit) * 100 : 0
          const pct = Math.min(rawPct, 100)
          const over = item.spent > item.amount_limit
          const meterColor = rawPct > 100
            ? budgetMeterColors.danger
            : rawPct >= 70
              ? budgetMeterColors.warning
              : budgetMeterColors.safe

          return (
            <AppCard key={item.budget_id} className="rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-foreground text-xs font-medium truncate max-w-[70%]">
                  {item.category_name}
                </span>
                <span className="text-xs font-bold" style={{ color: meterColor }}>
                  {over ? t('budgets.overLimit') : `${pct.toFixed(0)}%`}
                </span>
              </div>
              <div className="w-full bg-border/40 rounded-full h-1.5 mb-2">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: meterColor,
                    boxShadow: `0 0 12px ${meterColor}66`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{formatCurrency(item.spent)}</span>
                <span>{formatCurrency(item.amount_limit)}</span>
              </div>
            </AppCard>
          )
        })}
      </div>
    </AppCard>
  )
}
