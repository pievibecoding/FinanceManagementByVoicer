import type { Transaction } from '@/api/dashboard'
import type { Budget } from '@/api/budgets'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { AppCard } from '@/components/common'
import { operationTypeForTransaction } from '@/lib/transaction-types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { budgetMeterColors } from '@/styles/tokens'

interface Category {
  category_id: number | string
  category_name: string
}

interface BudgetOverviewProps {
  budgets: Budget[]
  categories: Category[]
  transactions: Transaction[]
  selectedMonth: string
  onSelectedMonthChange: (month: string) => void
  isLoading?: boolean
  isError?: boolean
  onBudgetCardClick?: (params: { categoryId: string; month: string }) => void
}

export function BudgetOverview({
  budgets,
  categories,
  transactions,
  selectedMonth,
  onSelectedMonthChange,
  isLoading = false,
  isError = false,
  onBudgetCardClick,
}: BudgetOverviewProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useLocaleFormat()

  // Calculate spending per category for the selected month (expense only)
  const spendingMap: Record<number, number> = {}
  transactions.forEach(tx => {
    if (operationTypeForTransaction(tx) !== 'expense') return
    if (!tx.transaction_date.startsWith(selectedMonth)) return
    const catId = Number(tx.category_id)
    spendingMap[catId] = (spendingMap[catId] ?? 0) + tx.amount
  })

  // Build items: only categories that have a budget or spending in the selected month.
  const items = budgets
    .map(b => {
      const budgetCategoryId = String(b.category_id)
      const cat = categories.find(c => String(c.category_id) === budgetCategoryId)
      const spent = spendingMap[b.category_id] ?? 0
      return { ...b, category_name: cat?.category_name ?? t('categories.fallbackWithId', { id: b.category_id }), spent }
    })
    .filter(item => item.spent > 0 || item.amount_limit > 0)
    .sort((a, b) => b.spent / b.amount_limit - a.spent / a.amount_limit)
  const selectedMonthLabel = formatDate(`${selectedMonth}-01T00:00:00`, {
    month: 'long',
    year: 'numeric',
  })

  if (isError || items.length === 0) {
    return (
      <AppCard className="rounded-[var(--radius)] p-5">
        <BudgetHeader
          selectedMonth={selectedMonth}
          onSelectedMonthChange={onSelectedMonthChange}
          transactions={transactions}
          budgets={budgets}
        />
        <p className="mt-4 text-muted-foreground text-sm">
          {isError
            ? t('dashboard.budgetLoadError')
            : isLoading
              ? t('common.loading')
              : t('dashboard.noBudgetForMonth', { month: selectedMonthLabel })}
        </p>
      </AppCard>
    )
  }

  return (
    <AppCard className="rounded-[var(--radius)] p-5">
      <BudgetHeader
        selectedMonth={selectedMonth}
        onSelectedMonthChange={onSelectedMonthChange}
        transactions={transactions}
        budgets={budgets}
        isLoading={isLoading}
      />
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
            <AppCard
              key={item.budget_id}
              interactive={!!onBudgetCardClick}
              role={onBudgetCardClick ? 'button' : undefined}
              tabIndex={onBudgetCardClick ? 0 : undefined}
              className="rounded-[var(--radius)] p-3"
              onClick={() => onBudgetCardClick?.({
                categoryId: String(item.category_id),
                month: selectedMonth,
              })}
              onKeyDown={(event) => {
                if (!onBudgetCardClick) return
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onBudgetCardClick({
                    categoryId: String(item.category_id),
                    month: selectedMonth,
                  })
                }
              }}
            >
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

function BudgetHeader({
  selectedMonth,
  onSelectedMonthChange,
  transactions,
  budgets,
  isLoading = false,
}: {
  selectedMonth: string
  onSelectedMonthChange: (month: string) => void
  transactions: Transaction[]
  budgets: Budget[]
  isLoading?: boolean
}) {
  const { t } = useTranslation()
  const { formatDate } = useLocaleFormat()
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-')
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from(
    new Set([
      ...transactions.map((tx) => Number(tx.transaction_date.slice(0, 4))),
      ...budgets.map((budget) => Number(budget.month.slice(0, 4))),
      2023,
      currentYear,
      currentYear + 1,
    ])
  )
    .filter((year) => Number.isFinite(year) && year >= 2020)
    .sort((a, b) => b - a)
  const monthOptions = Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0')
    return {
      value: month,
      label: formatDate(`${selectedYear}-${month}-01T00:00:00`, { month: 'long' }),
    }
  })
  const changeMonth = (month: string) => onSelectedMonthChange(`${selectedYear}-${month}`)
  const changeYear = (year: string) => onSelectedMonthChange(`${year}-${selectedMonthNumber}`)

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <h3 className="text-foreground font-semibold text-sm">{t('dashboard.budgetTitle')}</h3>
        {isLoading ? (
          <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
            {t('common.loading')}
          </span>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-1 text-xs text-muted-foreground sm:w-auto">
        <span>{t('budgets.selectMonth')}</span>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={selectedMonthNumber} onValueChange={changeMonth}>
            <SelectTrigger className="w-full min-w-32 bg-background sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={changeYear}>
            <SelectTrigger className="w-full min-w-24 bg-background sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
