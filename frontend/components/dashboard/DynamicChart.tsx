import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { Transaction, Account } from '@/api/dashboard'
import type { Category } from '@/api/categories'
import type { SavingsGoal } from '@/api/savings'
import type { Debt } from '@/api/debts'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import {
  accountChartColors,
  categoryColors,
  chartInteractionColors,
  chartColors,
  palette,
} from '@/styles/tokens'
import { ChartCard } from '@/components/common'

type ChartType =
  | 'asset-fluctuation'
  | 'expense-allocation'
  | 'account-distribution'
  | 'income-expense'
  | 'savings-breakdown'
  | 'debt-breakdown'
  | 'monthly-income-breakdown'

interface DynamicChartProps {
  chartType: ChartType
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  savings?: SavingsGoal[]
  debts?: Debt[]
}

type ChartKind = 'time-series' | 'distribution' | 'current-state'
type TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom'
type DateRange = { start: string; end: string }

type SeriesPoint = {
  date: string
  label: string
  value?: number
  income?: number
  expense?: number
}

type DistributionPoint = {
  name: string
  value: number
  color: string
  detail?: string
  target?: number
}

type DonutTooltipState = {
  item: DistributionPoint
  total: number
  x: number
  y: number
}

type TimeBucket = 'day' | 'week' | 'month' | 'quarter' | 'year'
type TimeBucketSelection = 'auto' | TimeBucket

const TIME_RANGES: { key: TimeRange; labelKey: string }[] = [
  { key: '1d', labelKey: 'dashboard.ranges.oneDay' },
  { key: '1w', labelKey: 'dashboard.ranges.oneWeek' },
  { key: '1m', labelKey: 'dashboard.ranges.oneMonth' },
  { key: '3m', labelKey: 'dashboard.ranges.threeMonths' },
  { key: '6m', labelKey: 'dashboard.ranges.sixMonths' },
  { key: '1y', labelKey: 'dashboard.ranges.oneYear' },
  { key: 'all', labelKey: 'dashboard.ranges.all' },
  { key: 'custom', labelKey: 'dashboard.ranges.custom' },
]

const TIME_BUCKETS: { key: TimeBucketSelection; labelKey: string }[] = [
  { key: 'auto', labelKey: 'dashboard.periods.auto' },
  { key: 'day', labelKey: 'dashboard.periods.day' },
  { key: 'week', labelKey: 'dashboard.periods.week' },
  { key: 'month', labelKey: 'dashboard.periods.month' },
  { key: 'quarter', labelKey: 'dashboard.periods.quarter' },
  { key: 'year', labelKey: 'dashboard.periods.year' },
]

const CHART_META: Record<
  ChartType,
  {
    kind: ChartKind
    titleKey: string
    defaultRange?: TimeRange
    brush?: boolean
  }
> = {
  'asset-fluctuation': {
    kind: 'time-series',
    titleKey: 'dashboard.charts.assetFluctuation',
    defaultRange: '1m',
    brush: true,
  },
  'monthly-income-breakdown': {
    kind: 'time-series',
    titleKey: 'dashboard.charts.incomeOverTime',
    defaultRange: '3m',
    brush: true,
  },
  'income-expense': {
    kind: 'time-series',
    titleKey: 'dashboard.charts.incomeExpense',
    defaultRange: '1m',
    brush: true,
  },
  'expense-allocation': {
    kind: 'distribution',
    titleKey: 'dashboard.charts.expenseAllocation',
  },
  'account-distribution': {
    kind: 'current-state',
    titleKey: 'dashboard.charts.accountDistribution',
  },
  'savings-breakdown': {
    kind: 'current-state',
    titleKey: 'dashboard.charts.savingsBreakdown',
  },
  'debt-breakdown': {
    kind: 'current-state',
    titleKey: 'dashboard.charts.debtBreakdown',
  },
}

const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 10 }
const GRID_STROKE = 'var(--border)'
const DAY_MS = 86400000
const DISTRIBUTION_VISIBLE_LIMIT = 8

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value)
}

function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function dateKeyFromTransaction(tx: Transaction) {
  return tx.transaction_date.slice(0, 10)
}

function formatDateLabel(dateKey: string) {
  const [, month, day] = dateKey.split('-')
  return `${day}/${month}`
}

function getDaySpan(start: string, end: string) {
  return Math.max(0, Math.round((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / DAY_MS))
}

function getBucketForRange(start: string, end: string): TimeBucket {
  const span = getDaySpan(start, end)
  if (span <= 31) return 'day'
  if (span <= 180) return 'week'
  if (span <= 730) return 'month'
  return 'quarter'
}

function getBucketKey(dateKey: string, bucket: TimeBucket) {
  const date = parseDateKey(dateKey)
  if (bucket === 'day') return dateKey
  if (bucket === 'week') {
    const day = date.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    return toDateKey(addDays(date, mondayOffset))
  }
  if (bucket === 'month') {
    return `${dateKey.slice(0, 7)}-01`
  }
  if (bucket === 'year') {
    return `${dateKey.slice(0, 4)}-01-01`
  }

  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return toDateKey(new Date(date.getFullYear(), quarterStartMonth, 1))
}

function formatBucketLabel(bucketKey: string, bucket: TimeBucket) {
  if (bucket === 'day' || bucket === 'week') return formatDateLabel(bucketKey)
  const [year, month] = bucketKey.split('-')
  if (bucket === 'month') return `${month}/${year}`
  if (bucket === 'year') return year
  const quarter = Math.floor((Number(month) - 1) / 3) + 1
  return `Q${quarter}/${year}`
}

function getRangeStart(range: TimeRange, endDate: Date, transactions: Transaction[]) {
  switch (range) {
    case '1d':
      return addDays(endDate, -1)
    case '1w':
      return addDays(endDate, -7)
    case '1m':
      return new Date(endDate.getFullYear(), endDate.getMonth() - 1, endDate.getDate())
    case '3m':
      return new Date(endDate.getFullYear(), endDate.getMonth() - 3, endDate.getDate())
    case '6m':
      return new Date(endDate.getFullYear(), endDate.getMonth() - 6, endDate.getDate())
    case '1y':
      return new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate())
    case 'all': {
      const first = transactions
        .map((tx) => dateKeyFromTransaction(tx))
        .sort((a, b) => a.localeCompare(b))[0]
      return first ? parseDateKey(first) : addDays(endDate, -30)
    }
    case 'custom':
      return addDays(endDate, -30)
  }
}

function buildDateKeys(start: string, end: string) {
  const dates: string[] = []
  const startDate = parseDateKey(start)
  const endDate = parseDateKey(end)
  for (let current = startDate; current <= endDate; current = addDays(current, 1)) {
    dates.push(toDateKey(current))
  }
  return dates
}

function buildBucketKeys(start: string, end: string, bucket: TimeBucket) {
  const keys: string[] = []
  buildDateKeys(start, end).forEach((date) => {
    const bucketKey = getBucketKey(date, bucket)
    if (keys.at(-1) !== bucketKey) keys.push(bucketKey)
  })
  return keys
}

function clampDateRange(range: DateRange): DateRange {
  if (!range.start || !range.end) return range
  return range.start <= range.end ? range : { start: range.end, end: range.start }
}

function accountBalanceAtDate(
  account: Account,
  transactions: Transaction[],
  dateKey: string
) {
  const accountId = normalizeId(account.account_id)
  return transactions.reduce((balance, tx) => {
    if (normalizeId(tx.account_id) !== accountId) return balance
    if (dateKeyFromTransaction(tx) > dateKey) return balance
    return tx.type === 'income' ? balance + tx.amount : balance - tx.amount
  }, account.initial_balance)
}

function currentAccountBalance(account: Account, transactions: Transaction[]) {
  return accountBalanceAtDate(account, transactions, '9999-12-31')
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function getActiveSavings(savings: SavingsGoal[]) {
  return savings.filter((item) => item.status !== 'cancelled')
}

function getActiveDebts(debts: Debt[]) {
  return debts.filter((item) => item.status === 'active' || item.status === 'overdue')
}

function sortDistribution(data: DistributionPoint[]) {
  return [...data].sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
}

function groupDistribution(
  data: DistributionPoint[],
  limit: number,
  otherLabel: string
) {
  const sorted = sortDistribution(data)
  if (sorted.length <= limit) return sorted

  const visible = sorted.slice(0, limit - 1)
  const hidden = sorted.slice(limit - 1)
  const otherValue = hidden.reduce((sum, item) => sum + item.value, 0)
  if (otherValue <= 0) return visible

  return [
    ...visible,
    {
      name: otherLabel,
      value: otherValue,
      color: categoryColors[(limit - 1) % categoryColors.length],
      detail: otherLabel,
    },
  ]
}

export function DynamicChart({
  chartType,
  transactions,
  accounts,
  categories,
  savings = [],
  debts = [],
}: DynamicChartProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatCompactNumber, formatDate } = useLocaleFormat()
  const meta = CHART_META[chartType] ?? CHART_META['asset-fluctuation']
  const [timeRange, setTimeRange] = useState<TimeRange>(meta.defaultRange ?? '1m')
  const [timeBucketSelection, setTimeBucketSelection] =
    useState<TimeBucketSelection>('auto')
  const todayKey = toDateKey(new Date())
  const [customRange, setCustomRange] = useState<DateRange>({
    start: toDateKey(addDays(new Date(), -30)),
    end: todayKey,
  })
  const [donutTooltip, setDonutTooltip] = useState<DonutTooltipState | null>(null)

  const dateWindow = useMemo(() => {
    if (timeRange === 'custom') {
      return clampDateRange(customRange)
    }

    const end = parseDateKey(todayKey)
    const start = getRangeStart(timeRange, end, transactions)
    return { start: toDateKey(start), end: todayKey }
  }, [customRange, timeRange, todayKey, transactions])

  const timeBucket = useMemo(() => {
    if (timeBucketSelection !== 'auto') return timeBucketSelection
    return getBucketForRange(dateWindow.start, dateWindow.end)
  }, [dateWindow, timeBucketSelection])

  const activeSavings = useMemo(() => getActiveSavings(savings), [savings])
  const activeDebts = useMemo(() => getActiveDebts(debts), [debts])
  const savingsOffset = activeSavings.reduce((sum, item) => sum + item.current_balance, 0)
  const debtOffset = activeDebts
    .filter((item) => item.debt_type === 'debt')
    .reduce((sum, item) => sum + item.outstanding_balance, 0)

  const dailyNetWorthData = useMemo<SeriesPoint[]>(() => {
    return buildBucketKeys(dateWindow.start, dateWindow.end, timeBucket).map((bucketKey) => {
      const bucketEnd = buildDateKeys(dateWindow.start, dateWindow.end)
        .filter((date) => getBucketKey(date, timeBucket) === bucketKey)
        .at(-1) ?? bucketKey
      const accountTotal = accounts.reduce(
        (sum, account) => sum + accountBalanceAtDate(account, transactions, bucketEnd),
        0
      )
      return {
        date: bucketKey,
        label: formatBucketLabel(bucketKey, timeBucket),
        value: accountTotal + savingsOffset - debtOffset,
      }
    })
  }, [accounts, dateWindow, debtOffset, savingsOffset, timeBucket, transactions])

  const incomeOverTimeData = useMemo<SeriesPoint[]>(() => {
    const incomeByBucket = new Map<string, number>()
    transactions.forEach((tx) => {
      const date = dateKeyFromTransaction(tx)
      if (date < dateWindow.start || date > dateWindow.end) return
      if (tx.type !== 'income') return
      const bucketKey = getBucketKey(date, timeBucket)
      incomeByBucket.set(bucketKey, (incomeByBucket.get(bucketKey) ?? 0) + tx.amount)
    })

    return buildBucketKeys(dateWindow.start, dateWindow.end, timeBucket).map((bucketKey) => ({
      date: bucketKey,
      label: formatBucketLabel(bucketKey, timeBucket),
      value: incomeByBucket.get(bucketKey) ?? 0,
    }))
  }, [dateWindow, timeBucket, transactions])

  const incomeExpenseData = useMemo<SeriesPoint[]>(() => {
    const byBucket = new Map<string, { income: number; expense: number }>()
    transactions.forEach((tx) => {
      const date = dateKeyFromTransaction(tx)
      if (date < dateWindow.start || date > dateWindow.end) return
      const bucketKey = getBucketKey(date, timeBucket)
      const current = byBucket.get(bucketKey) ?? { income: 0, expense: 0 }
      if (tx.type === 'income') current.income += tx.amount
      if (tx.type === 'expense') current.expense += tx.amount
      byBucket.set(bucketKey, current)
    })

    return buildBucketKeys(dateWindow.start, dateWindow.end, timeBucket).map((bucketKey) => ({
      date: bucketKey,
      label: formatBucketLabel(bucketKey, timeBucket),
      income: byBucket.get(bucketKey)?.income ?? 0,
      expense: byBucket.get(bucketKey)?.expense ?? 0,
    }))
  }, [dateWindow, timeBucket, transactions])

  const expenseAllocationData = useMemo<DistributionPoint[]>(() => {
    const currentMonth = getCurrentMonth()
    const byCategory = new Map<string, number>()
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return
      if (!tx.transaction_date.startsWith(currentMonth)) return
      const categoryId = normalizeId(tx.category_id)
      byCategory.set(categoryId, (byCategory.get(categoryId) ?? 0) + tx.amount)
    })

    return groupDistribution(
      Array.from(byCategory.entries())
        .map(([categoryId, value], index) => {
          const category = categories.find((item) => normalizeId(item.category_id) === categoryId)
          return {
            name: category?.category_name || t('categories.fallbackWithId', { id: categoryId }),
            value,
            color: categoryColors[index % categoryColors.length],
          }
        })
        .filter((item) => item.value > 0),
      DISTRIBUTION_VISIBLE_LIMIT,
      t('dashboard.chartSummary.other')
    )
  }, [categories, t, transactions])

  const accountDistributionData = useMemo<DistributionPoint[]>(() => {
    return groupDistribution(
      accounts
        .map((account, index) => ({
          name: account.account_name,
          value: currentAccountBalance(account, transactions),
          color:
            accountChartColors[account.account_type] ||
            categoryColors[index % categoryColors.length],
          detail: account.account_type,
        }))
        .filter((item) => item.value !== 0),
      DISTRIBUTION_VISIBLE_LIMIT,
      t('dashboard.chartSummary.other')
    )
  }, [accounts, t, transactions])

  const savingsData = useMemo<DistributionPoint[]>(() => {
    return groupDistribution(
      activeSavings
        .map((item, index) => ({
          name: item.name,
          value: item.current_balance,
          target: item.target_amount,
          color: categoryColors[index % categoryColors.length],
        }))
        .filter((item) => item.value > 0),
      DISTRIBUTION_VISIBLE_LIMIT,
      t('dashboard.chartSummary.other')
    )
  }, [activeSavings, t])

  const debtData = useMemo(() => {
    const myDebts = activeDebts
      .filter((item) => item.debt_type === 'debt')
      .map((item, index) => ({
        name: item.lender || item.name,
        value: item.outstanding_balance,
        color: categoryColors[index % categoryColors.length],
        detail: t('dashboard.chartSummary.debtOwed'),
      }))
    const myLoans = activeDebts
      .filter((item) => item.debt_type === 'loan')
      .map((item, index) => ({
        name: item.debtor || item.name,
        value: item.outstanding_balance,
        color: categoryColors[(index + myDebts.length) % categoryColors.length],
        detail: t('dashboard.chartSummary.moneyLent'),
      }))

    return {
      myDebts: groupDistribution(myDebts, DISTRIBUTION_VISIBLE_LIMIT, t('dashboard.chartSummary.other')),
      myLoans: groupDistribution(myLoans, DISTRIBUTION_VISIBLE_LIMIT, t('dashboard.chartSummary.other')),
    }
  }, [activeDebts, t])

  const totalFor = (items: DistributionPoint[]) =>
    items.reduce((sum, item) => sum + item.value, 0)

  const title = t(meta.titleKey)
  const showRangeControls = meta.kind === 'time-series'
  const dateRangeLabel = `${formatDate(parseDateKey(dateWindow.start), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} - ${formatDate(parseDateKey(dateWindow.end), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })}`

  const renderTimeRangeControls = () => {
    if (!showRangeControls) return null

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="px-1 text-xs text-muted-foreground">
            {t('dashboard.chartControls.period')}
          </span>
          <div className="flex flex-wrap gap-1 rounded-md border border-border/70 bg-muted/20 p-1">
            {TIME_BUCKETS.map((bucket) => (
              <button
                key={bucket.key}
                onClick={() => setTimeBucketSelection(bucket.key)}
                className={`min-h-7 rounded px-2 text-xs font-medium transition-colors ${
                  timeBucketSelection === bucket.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {t(bucket.labelKey)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="px-1 text-xs text-muted-foreground">
            {t('dashboard.chartControls.range')}
          </span>
          <div className="flex flex-wrap gap-1 rounded-md border border-border/70 bg-muted/20 p-1">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                className={`min-h-7 rounded px-2 text-xs font-medium transition-colors ${
                  timeRange === range.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {t(range.labelKey)}
              </button>
            ))}
          </div>
        </div>
        {timeRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1 text-muted-foreground">
              {t('dashboard.chartControls.startDate')}
              <input
                type="date"
                value={customRange.start}
                max={customRange.end}
                onChange={(event) => {
                  if (!event.target.value) return
                  setCustomRange((current) =>
                    clampDateRange({ ...current, start: event.target.value })
                  )
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
              />
            </label>
            <label className="flex items-center gap-1 text-muted-foreground">
              {t('dashboard.chartControls.endDate')}
              <input
                type="date"
                value={customRange.end}
                min={customRange.start}
                max={todayKey}
                onChange={(event) => {
                  if (!event.target.value) return
                  setCustomRange((current) =>
                    clampDateRange({ ...current, end: event.target.value })
                  )
                }}
                className="h-8 rounded-md border border-border bg-background px-2 text-foreground"
              />
            </label>
          </div>
        )}
      </div>
    )
  }

  const renderSeriesTooltip = (
    active: boolean | undefined,
    payload: any[] | undefined,
    label: string | undefined
  ) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{label}</p>
        <div className="space-y-0.5">
          {payload.map((item) => (
            <p key={item.dataKey} style={{ color: item.color }} className="font-medium">
              {item.name}: {formatCurrency(Number(item.value ?? 0))}
            </p>
          ))}
        </div>
      </div>
    )
  }

  const renderBrush = (data: SeriesPoint[]) => {
    if (!meta.brush || data.length < 8) return null
    return (
      <Brush
        dataKey="label"
        height={18}
        travellerWidth={8}
        stroke={palette.primary}
        fill={chartInteractionColors.brushFill}
      />
    )
  }

  const renderEmptyState = (message: string) => (
    <div className="flex h-full min-h-[220px] items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/10 px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )

  const renderLegendList = (items: DistributionPoint[], total: number) => (
    <div className="flex min-w-0 flex-col justify-center gap-2 self-center">
      {items.map((item) => {
        const percent = total > 0 ? (item.value / total) * 100 : 0
        return (
          <div key={item.name} className="grid gap-1">
            <div className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="min-w-0 flex-1 truncate text-foreground">{item.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {percent.toFixed(0)}%
              </span>
            </div>
            <div className="ms-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span className="truncate">{item.detail ?? t('dashboard.chartSummary.value')}</span>
              <span className="shrink-0 tabular-nums">{formatCurrency(item.value)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderDonutTooltip = () => {
    if (!donutTooltip) return null

    const { item, total, x, y } = donutTooltip
    const percent = total > 0 ? (item.value / total) * 100 : 0
    const placeRight = x < 130
    const placeBottom = y < 130

    return (
      <div
        className={`pointer-events-none absolute z-20 w-52 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-xl ${
          placeRight ? 'left-3' : 'right-3'
        } ${placeBottom ? 'top-3' : 'bottom-3'}`}
      >
        <p className="font-medium text-foreground">{item.name}</p>
        <p className="text-muted-foreground">
          {formatCurrency(item.value)} ({percent.toFixed(1)}%)
        </p>
        {item.target ? (
          <p className="text-muted-foreground">
            {t('savingsPage.goal')}: {formatCurrency(item.target)}
          </p>
        ) : null}
      </div>
    )
  }

  const renderDonut = (
    items: DistributionPoint[],
    total: number,
    centerLabel: string,
    emptyMessage: string
  ) => {
    if (items.length === 0 || total <= 0) return renderEmptyState(emptyMessage)

    return (
      <div className="grid h-full min-h-[260px] grid-cols-1 items-center justify-center gap-y-4 lg:grid-cols-[minmax(200px,300px)_minmax(190px,250px)] lg:gap-x-12 xl:gap-x-20 2xl:gap-x-28">
        <div
          className="relative flex h-[260px] min-h-[240px] items-center justify-center overflow-hidden"
          onMouseLeave={() => setDonutTooltip(null)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 16, bottom: 10, left: 16 }}>
              <Pie
                data={items}
                dataKey="value"
                innerRadius="62%"
                outerRadius="84%"
                paddingAngle={2}
                stroke={chartInteractionColors.pieStroke}
                strokeWidth={2}
                onMouseMove={(item: DistributionPoint, _index: number, event: any) => {
                  setDonutTooltip({
                    item,
                    total,
                    x: Number(event?.offsetX ?? 130),
                    y: Number(event?.offsetY ?? 130),
                  })
                }}
                onMouseLeave={() => setDonutTooltip(null)}
              >
                {items.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {renderDonutTooltip()}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] uppercase text-muted-foreground">{centerLabel}</span>
            <span className="max-w-40 truncate text-lg font-bold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 self-center">
          <div className="hidden h-48 w-px bg-border/70 lg:block" />
          {renderLegendList(items, total)}
        </div>
      </div>
    )
  }

  const renderAssetChart = () => {
    if (accounts.length === 0) {
      return renderEmptyState(t('accounts.emptyShort'))
    }

    if (dailyNetWorthData.length === 0) {
      return renderEmptyState(t('dashboard.chartSummary.noDataInRange'))
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dailyNetWorthData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.35} />
              <stop offset="95%" stopColor={chartColors.income} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: chartInteractionColors.cursor }}
            content={({ active, payload, label }) =>
              renderSeriesTooltip(active, payload, label as string)
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            name={t('dashboard.netWorth')}
            stroke={chartColors.income}
            strokeWidth={2.5}
            fill="url(#assetGradient)"
            activeDot={{ r: 4 }}
          />
          {renderBrush(dailyNetWorthData)}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  const renderIncomeChart = () => {
    const hasIncome = incomeOverTimeData.some((item) => (item.value ?? 0) > 0)
    if (!hasIncome) return renderEmptyState(t('dashboard.noIncomeInPeriod'))

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={incomeOverTimeData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: chartInteractionColors.cursor }}
            content={({ active, payload, label }) =>
              renderSeriesTooltip(active, payload, label as string)
            }
          />
          <Bar dataKey="value" name={t('types.income')} fill={chartColors.income} radius={[4, 4, 0, 0]} />
          {renderBrush(incomeOverTimeData)}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderIncomeExpenseChart = () => {
    const hasData = incomeExpenseData.some(
      (item) => (item.income ?? 0) > 0 || (item.expense ?? 0) > 0
    )
    if (!hasData) return renderEmptyState(t('dashboard.chartSummary.noDataInRange'))

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={incomeExpenseData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(value) => formatCompactNumber(Number(value))}
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ fill: chartInteractionColors.cursor }}
            content={({ active, payload, label }) =>
              renderSeriesTooltip(active, payload, label as string)
            }
          />
          <Bar dataKey="income" name={t('types.income')} fill={chartColors.income} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name={t('types.expense')} fill={chartColors.expense} radius={[4, 4, 0, 0]} />
          {renderBrush(incomeExpenseData)}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderDebtChart = () => {
    const totalDebt = totalFor(debtData.myDebts)
    const totalLoan = totalFor(debtData.myLoans)
    if (totalDebt <= 0 && totalLoan <= 0) {
      return renderEmptyState(t('dashboard.noActiveDebtsLoans'))
    }

    return (
      <div className="grid h-full min-h-[260px] grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border/60 bg-muted/10 p-3">
          <p className="mb-1 text-xs text-muted-foreground">{t('debts.myDebts')}</p>
          {renderDonut(
            debtData.myDebts,
            totalDebt,
            t('dashboard.chartSummary.total'),
            t('debts.noDebts')
          )}
        </div>
        <div className="rounded-md border border-border/60 bg-muted/10 p-3">
          <p className="mb-1 text-xs text-muted-foreground">{t('debts.myLoans')}</p>
          {renderDonut(
            debtData.myLoans,
            totalLoan,
            t('dashboard.chartSummary.total'),
            t('debts.noLoans')
          )}
        </div>
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'asset-fluctuation':
        return renderAssetChart()
      case 'monthly-income-breakdown':
        return renderIncomeChart()
      case 'income-expense':
        return renderIncomeExpenseChart()
      case 'expense-allocation':
        return renderDonut(
          expenseAllocationData,
          totalFor(expenseAllocationData),
          t('dashboard.chartSummary.currentMonth'),
          t('dashboard.noExpenseDataThisMonth')
        )
      case 'account-distribution':
        return renderDonut(
          accountDistributionData,
          totalFor(accountDistributionData),
          t('dashboard.chartSummary.current'),
          t('accounts.emptyShort')
        )
      case 'savings-breakdown':
        return renderDonut(
          savingsData,
          totalFor(savingsData),
          t('dashboard.chartSummary.total'),
          t('savingsPage.emptyShort')
        )
      case 'debt-breakdown':
        return renderDebtChart()
      default:
        return null
    }
  }

  const summaryValue = (() => {
    switch (chartType) {
      case 'asset-fluctuation':
        return dailyNetWorthData.at(-1)?.value
      case 'monthly-income-breakdown':
        return incomeOverTimeData.reduce((sum, item) => sum + (item.value ?? 0), 0)
      case 'income-expense':
        return incomeExpenseData.reduce(
          (sum, item) => sum + (item.income ?? 0) - (item.expense ?? 0),
          0
        )
      case 'expense-allocation':
        return totalFor(expenseAllocationData)
      case 'account-distribution':
        return totalFor(accountDistributionData)
      case 'savings-breakdown':
        return totalFor(savingsData)
      case 'debt-breakdown':
        return undefined
      default:
        return undefined
    }
  })()

  const renderHeaderDetail = () => {
    if (chartType === 'asset-fluctuation') {
      return (
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          {t('dashboard.chartSummary.assetSnapshotNote')}
        </p>
      )
    }

    if (chartType === 'debt-breakdown') {
      return (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md border border-border/70 px-2 py-1 text-muted-foreground">
            {t('dashboard.chartSummary.debtOwed')}: {' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(totalFor(debtData.myDebts))}
            </span>
          </span>
          <span className="rounded-md border border-border/70 px-2 py-1 text-muted-foreground">
            {t('dashboard.chartSummary.moneyLent')}: {' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(totalFor(debtData.myLoans))}
            </span>
          </span>
        </div>
      )
    }

    if (showRangeControls) {
      return <p className="mt-1 text-xs text-muted-foreground">{dateRangeLabel}</p>
    }

    return null
  }

  return (
    <ChartCard>
      <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground">
              {meta.kind === 'time-series'
                ? t('dashboard.chartSummary.timeSeries')
                : t('dashboard.chartSummary.snapshot')}
            </span>
          </div>
          {typeof summaryValue === 'number' ? (
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {formatCurrency(summaryValue)}
            </p>
          ) : null}
          {renderHeaderDetail()}
        </div>
        {renderTimeRangeControls()}
      </div>
      <div className="min-h-0 flex-1">{renderChart()}</div>
    </ChartCard>
  )
}
