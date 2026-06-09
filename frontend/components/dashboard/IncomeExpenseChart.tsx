import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Transaction } from '@/api/dashboard'
import { chartColors } from '@/styles/tokens'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

interface IncomeExpenseChartProps {
  transactions: Transaction[]
}

type RangeKey = '7d' | '30d' | '3m' | '6m' | '12m' | 'ytd'

const RANGES: { key: RangeKey; labelKey: string }[] = [
  { key: '7d',  labelKey: 'dashboard.ranges.sevenDays' },
  { key: '30d', labelKey: 'dashboard.ranges.thirtyDays' },
  { key: '3m',  labelKey: 'dashboard.ranges.threeMonths' },
  { key: '6m',  labelKey: 'dashboard.ranges.sixMonths' },
  { key: '12m', labelKey: 'dashboard.ranges.twelveMonths' },
  { key: 'ytd', labelKey: 'dashboard.ranges.yearToDate' },
]

function getStartDate(range: RangeKey): Date {
  const now = new Date()
  switch (range) {
    case '7d':  return new Date(now.getTime() - 7 * 86400000)
    case '30d': return new Date(now.getTime() - 30 * 86400000)
    case '3m':  return new Date(now.getFullYear(), now.getMonth() - 3, 1)
    case '6m':  return new Date(now.getFullYear(), now.getMonth() - 6, 1)
    case '12m': return new Date(now.getFullYear(), now.getMonth() - 12, 1)
    case 'ytd': return new Date(now.getFullYear(), 0, 1)
  }
}

function buildChartData(transactions: Transaction[], range: RangeKey) {
  const startDate = getStartDate(range)
  const now = new Date()

  // Filter transactions in range
  const inRange = transactions.filter(tx => {
    const d = new Date(tx.transaction_date)
    return d >= startDate && d <= now
  })

  const useDaily = range === '7d' || range === '30d'

  // Build bucket keys
  const buckets: Record<string, { income: number; expense: number }> = {}

  if (useDaily) {
    // One bucket per day
    for (let d = new Date(startDate); d <= now; d = new Date(d.getTime() + 86400000)) {
      const key = `${d.getDate()}/${d.getMonth() + 1}`
      buckets[key] = { income: 0, expense: 0 }
    }
    inRange.forEach(tx => {
      const d = new Date(tx.transaction_date)
      const key = `${d.getDate()}/${d.getMonth() + 1}`
      if (!buckets[key]) buckets[key] = { income: 0, expense: 0 }
      if (tx.type === 'income') buckets[key].income += tx.amount
      if (tx.type === 'expense') buckets[key].expense += tx.amount
    })
  } else {
    // One bucket per month
    let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (cur <= now) {
      const key = `T${cur.getMonth() + 1}/${String(cur.getFullYear()).slice(2)}`
      buckets[key] = { income: 0, expense: 0 }
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
    inRange.forEach(tx => {
      const d = new Date(tx.transaction_date)
      const key = `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`
      if (!buckets[key]) buckets[key] = { income: 0, expense: 0 }
      if (tx.type === 'income') buckets[key].income += tx.amount
      if (tx.type === 'expense') buckets[key].expense += tx.amount
    })
  }

  return Object.entries(buckets).map(([name, v]) => ({ name, ...v }))
}

const INCOME_COLOR = chartColors.income
const EXPENSE_COLOR = chartColors.expense

const CustomTooltip = ({ active, payload, label, incomeLabel, expenseLabel, formatCurrency }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-md">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span className="text-foreground font-semibold">
            {p.name === 'income' ? incomeLabel : expenseLabel}:
          </span>
          <span style={{ color: p.fill }} className="font-bold">
            {formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function IncomeExpenseChart({ transactions }: IncomeExpenseChartProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatCompactNumber } = useLocaleFormat()
  const [range, setRange] = useState<RangeKey>('6m')

  const chartData = useMemo(
    () => buildChartData(transactions, range),
    [transactions, range]
  )

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-foreground font-semibold text-sm">{t('dashboard.charts.incomeExpense')}</h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                range === r.key
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: INCOME_COLOR }} />
          {t('types.income')}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: EXPENSE_COLOR }} />
          {t('types.expense')}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} barGap={3} barCategoryGap="30%" barSize={range === '7d' || range === '30d' ? 5 : 16}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,107,250,0.10)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={38}
          />
          <Tooltip content={<CustomTooltip incomeLabel={t('types.income')} expenseLabel={t('types.expense')} formatCurrency={formatCurrency} />} cursor={{ fill: 'rgba(200,107,250,0.06)' }} />
          <Bar dataKey="income" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} name="income" />
          <Bar dataKey="expense" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} name="expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
