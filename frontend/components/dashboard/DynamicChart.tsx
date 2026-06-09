import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import type { Transaction, Account } from '@/api/dashboard'
import type { Category } from '@/api/categories'
import type { SavingsGoal } from '@/api/savings'
import type { Debt } from '@/api/debts'
import { chartColors, categoryColors, accountChartColors, palette } from '@/styles/tokens'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

interface DynamicChartProps {
  chartType: 'asset-fluctuation' | 'expense-allocation' | 'account-distribution' | 'income-expense' | 'savings-breakdown' | 'debt-breakdown' | 'monthly-income-breakdown' | 'net-savings-trend'
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  expenseByCategory: Record<number, number>
  monthlyNetWorth: Record<string, number>
  savings?: SavingsGoal[]
  debts?: Debt[]
}

type TimeRange = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all'

const TIME_RANGES: { key: TimeRange; labelKey: string }[] = [
  { key: '1d', labelKey: 'dashboard.ranges.oneDay' },
  { key: '1w', labelKey: 'dashboard.ranges.oneWeek' },
  { key: '1m', labelKey: 'dashboard.ranges.oneMonth' },
  { key: '3m', labelKey: 'dashboard.ranges.threeMonths' },
  { key: '6m', labelKey: 'dashboard.ranges.sixMonths' },
  { key: '1y', labelKey: 'dashboard.ranges.oneYear' },
  { key: 'all', labelKey: 'dashboard.ranges.all' },
]

const ACCOUNT_COLORS: Record<string, string> = accountChartColors

const CATEGORY_COLORS = [...categoryColors]

function formatMonth(month: string) {
  const [year, monthNum] = month.split('-')
  return `T${monthNum}/${year.slice(2)}`
}

function getStartDate(range: TimeRange): Date {
  const now = new Date()
  switch (range) {
    case '1d': return new Date(now.getTime() - 1 * 86400000)
    case '1w': return new Date(now.getTime() - 7 * 86400000)
    case '1m': return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case '3m': return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case 'all': return new Date(0)
  }
}

export function DynamicChart({
  chartType,
  transactions,
  accounts,
  categories,
  expenseByCategory,
  monthlyNetWorth,
  savings = [],
  debts = [],
}: DynamicChartProps) {
  const { t } = useTranslation()
  const [timeRange, setTimeRange] = useState<TimeRange>('1m')
  const { formatCurrency, formatCompactNumber } = useLocaleFormat()

  const startDate = getStartDate(timeRange)

  // Filter transactions based on time range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.transaction_date)
      return txDate >= startDate
    })
  }, [transactions, startDate])

  // Filter monthly net worth based on time range
  const filteredMonthlyNetWorth = useMemo(() => {
    const result: Record<string, number> = {}
    Object.entries(monthlyNetWorth).forEach(([month, value]) => {
      const monthDate = new Date(month + '-01')
      if (monthDate >= startDate) {
        result[month] = value
      }
    })
    return result
  }, [monthlyNetWorth, startDate])

  // Filter expense by category based on time range
  const filteredExpenseByCategory = useMemo(() => {
    const result: Record<number, number> = {}
    filteredTransactions.forEach(tx => {
      if (tx.type === 'expense') {
        const catId = Number(tx.category_id)
        result[catId] = (result[catId] ?? 0) + tx.amount
      }
    })
    return result
  }, [filteredTransactions])

  // Asset Fluctuation Chart (Line chart)
  const assetFluctuationData = useMemo(() => {
    return Object.entries(filteredMonthlyNetWorth)
      .map(([month, value]) => ({ name: formatMonth(month), value: value || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredMonthlyNetWorth])

  // Expense Allocation Chart (Donut chart)
  const expenseAllocationData = useMemo(() => {
    return Object.entries(filteredExpenseByCategory)
      .map(([catId, amount]) => {
        const cat = categories.find(c => String(c.category_id) === catId)
        return {
          name: cat?.category_name || t('categories.fallbackWithId', { id: catId }),
          value: amount || 0,
        }
      })
      .filter(item => item.value > 0)
  }, [filteredExpenseByCategory, categories])

  // Account Distribution Chart (Donut chart)
  const accountDistributionData = useMemo(() => {
    return accounts.map(acc => {
      let balance = acc.initial_balance
      filteredTransactions.forEach(tx => {
        if (tx.account_id !== acc.account_id) return
        if (tx.type === 'income') balance += tx.amount
        else balance -= tx.amount
      })
      return {
        name: acc.account_name,
        value: balance,
        accountType: acc.account_type,
      }
    }).filter(acc => acc.value !== 0)
  }, [accounts, filteredTransactions])

  // Income Expense Chart (Bar chart)
  const incomeExpenseData = useMemo(() => {
    const income = filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    const expense = filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    return [
      { name: t('types.income'), value: income, fill: chartColors.income },
      { name: t('types.expense'), value: expense, fill: chartColors.expense },
    ]
  }, [filteredTransactions, t])

  const renderChart = () => {
    switch (chartType) {
      case 'asset-fluctuation':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={assetFluctuationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
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
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const value = payload[0].value as number
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-muted-foreground mb-1">{payload[0].payload.name}</p>
                      <p className="text-primary font-medium">{formatCurrency(value)}</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={chartColors.income}
                strokeWidth={2}
                dot={{ fill: chartColors.income, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'expense-allocation':
        if (expenseAllocationData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('dashboard.noExpenseDataThisMonth')}
            </div>
          )
        }
        const totalExpense = expenseAllocationData.reduce((sum, item) => sum + item.value, 0)
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={expenseAllocationData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={2} dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                  if (midAngle === undefined) return null
                  const RADIAN = Math.PI / 180
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const percent = ((value / totalExpense) * 100).toFixed(0)
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight={500}>
                      {percent}%
                    </text>
                  )
                }}
                labelLine={false}
              >
                {expenseAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const percent = ((payload[0].value as number / totalExpense) * 100).toFixed(1)
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-foreground font-medium">{payload[0].payload.name}</p>
                      <p className="text-muted-foreground">{formatCurrency(payload[0].value as number)} ({percent}%)</p>
                    </div>
                  )
                }}
              />
              <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'account-distribution':
        if (accountDistributionData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('accounts.emptyShort')}
            </div>
          )
        }
        const totalBalance = accountDistributionData.reduce((sum, item) => sum + item.value, 0)
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={accountDistributionData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={2} dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                  if (midAngle === undefined) return null
                  const RADIAN = Math.PI / 180
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const percent = ((value / totalBalance) * 100).toFixed(0)
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight={500}>
                      {percent}%
                    </text>
                  )
                }}
                labelLine={false}
              >
                {accountDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ACCOUNT_COLORS[entry.accountType] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const value = payload[0].value as number
                  const percent = ((value / totalBalance) * 100).toFixed(1)
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-foreground font-medium">{payload[0].payload.name}</p>
                      <p className="text-muted-foreground">{formatCurrency(value)} ({percent}%)</p>
                    </div>
                  )
                }}
              />
              <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'savings-breakdown': {
        const activeSavings = savings.filter(s => s.status !== 'cancelled')
        if (activeSavings.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              {t('savingsPage.emptyShort')}
            </div>
          )
        }
        const savingsData = activeSavings.map(s => ({ name: s.name, value: s.current_balance, target: s.target_amount }))
        const totalSaved = savingsData.reduce((sum, s) => sum + s.value, 0)
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={savingsData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" labelLine={false}
                label={({ cx, cy, midAngle = 0, innerRadius, outerRadius, value }) => {
                  if (!value || !totalSaved) return null
                  const RADIAN = Math.PI / 180
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={500}>{((value / totalSaved) * 100).toFixed(0)}%</text>
                }}
              >
                {savingsData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
              </Pie>
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload
                const pct = totalSaved > 0 ? ((item.value / totalSaved) * 100).toFixed(1) : '0'
                const progress = item.target > 0 ? ((item.value / item.target) * 100).toFixed(0) : '0'
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
                    <p className="text-foreground font-medium">{item.name}</p>
                    <p className="text-primary">{formatCurrency(item.value)} ({t('dashboard.percentTotal', { percent: pct })})</p>
                    <p className="text-muted-foreground">{t('savingsPage.goal')}: {formatCurrency(item.target)} ({t('dashboard.percentAchieved', { percent: progress })})</p>
                  </div>
                )
              }} />
              <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )
      }

      case 'debt-breakdown': {
        const myDebts = debts.filter(d => d.status === 'active' && d.debt_type === 'debt')
        const myLoans = debts.filter(d => d.status === 'active' && d.debt_type === 'loan')
        if (myDebts.length === 0 && myLoans.length === 0) {
          return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('dashboard.noActiveDebtsLoans')}</div>
        }
        const myDebtData = myDebts.map(d => ({ name: d.lender || d.name, value: d.outstanding_balance }))
        const myLoanData = myLoans.map(d => ({ name: d.debtor || d.name, value: d.outstanding_balance }))
        const totalDebt = myDebtData.reduce((s, d) => s + d.value, 0)
        const totalLoan = myLoanData.reduce((s, d) => s + d.value, 0)

        const MiniDonut = ({ data, total, title, color }: { data: {name:string;value:number}[]; total:number; title:string; color:string }) => (
          <div className="flex-1 flex flex-col min-w-0">
            <p className="text-muted-foreground text-xs text-center mb-0.5">{title}</p>
            <p className="text-center text-sm font-bold mb-1" style={{ color }}>{formatCurrency(total)}</p>
            {data.length === 0
              ? <div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-xs">{t('common.none')}</div>
              : <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value" labelLine={false}
                      label={({ cx, cy, midAngle = 0, innerRadius, outerRadius, value }) => {
                        if (!value || !total) return null
                        const R = Math.PI / 180
                        const r = innerRadius + (outerRadius - innerRadius) * 0.5
                        const x = cx + r * Math.cos(-midAngle * R)
                        const y = cy + r * Math.sin(-midAngle * R)
                        return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={500}>{((value/total)*100).toFixed(0)}%</text>
                      }}
                    >
                      {data.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0].payload
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl space-y-0.5">
                          <p className="text-foreground font-medium">{item.name}</p>
                          <p style={{ color }}>{formatCurrency(item.value)} ({total > 0 ? ((item.value/total)*100).toFixed(1) : 0}%)</p>
                        </div>
                      )
                    }} />
                    <Legend formatter={(v) => <span className="text-[10px] text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
            }
          </div>
        )

        return (
          <div className="flex gap-3 h-full">
            <MiniDonut data={myDebtData} total={totalDebt} title={t('debts.myDebts')} color={palette.destructive} />
            <div className="w-px bg-border self-stretch" />
            <MiniDonut data={myLoanData} total={totalLoan} title={t('debts.myLoans')} color={palette.primary} />
          </div>
        )
      }

      case 'monthly-income-breakdown': {
        const monthlyIncome: Record<string, number> = {}
        transactions.filter(tx => tx.type === 'income' && new Date(tx.transaction_date) >= startDate)
          .forEach(tx => {
            const m = tx.transaction_date.slice(0, 7)
            monthlyIncome[m] = (monthlyIncome[m] ?? 0) + tx.amount
          })
        const incomeData = Object.entries(monthlyIncome).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ name: formatMonth(month), value }))
        if (incomeData.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">{t('dashboard.noIncomeInPeriod')}</div>
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,107,250,0.10)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCompactNumber(Number(value))} tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                    <p className="text-muted-foreground mb-0.5">{payload[0].payload.name}</p>
                    <p className="text-primary font-medium">{formatCurrency(payload[0].value as number)}</p>
                  </div>
                )
              }} />
              <Bar dataKey="value" fill={chartColors.income} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )
      }

      case 'income-expense':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpenseData} barGap={2} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,107,250,0.10)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => formatCompactNumber(Number(value))} tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                      {payload.map((p: any) => (
                        <p key={p.name} style={{ color: p.fill }} className="font-medium">
                          {p.name}: {formatCurrency(p.value)}
                        </p>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const getChartTitle = () => {
    switch (chartType) {
      case 'asset-fluctuation': return t('dashboard.charts.assetFluctuation')
      case 'expense-allocation': return t('dashboard.charts.expenseAllocation')
      case 'account-distribution': return t('dashboard.charts.accountDistribution')
      case 'income-expense': return t('dashboard.charts.incomeExpense')
      case 'savings-breakdown': return t('dashboard.charts.savingsBreakdown')
      case 'debt-breakdown': return t('dashboard.charts.debtBreakdown')
      case 'monthly-income-breakdown': return t('dashboard.charts.monthlyIncomeBreakdown')
      default: return ''
    }
  }

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-5 backdrop-blur-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-foreground font-semibold text-sm">{getChartTitle()}</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                timeRange === r.key
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {renderChart()}
      </div>
    </div>
  )
}
