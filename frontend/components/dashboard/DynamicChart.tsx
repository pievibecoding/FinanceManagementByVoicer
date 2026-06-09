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

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: '1d', label: '1 ngày' },
  { key: '1w', label: '1 tuần' },
  { key: '1m', label: '1 tháng' },
  { key: '3m', label: '3 tháng' },
  { key: '6m', label: '6 tháng' },
  { key: '1y', label: '1 năm' },
  { key: 'all', label: 'Tất cả' },
]

const ACCOUNT_COLORS: Record<string, string> = {
  'Bank':       '#5c9efa',
  'E-Wallet':   '#c86bfa',
  'Investment': '#ffd500',
  'Cash':       '#f59e0b',
}

const CATEGORY_COLORS = [
  '#c86bfa', '#ffd500', '#ff6b9d', '#5c9efa', '#f59e0b',
  '#34d399', '#fb923c', '#a78bfa', '#38bdf8', '#f472b6'
]

function formatVND(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

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
  const [timeRange, setTimeRange] = useState<TimeRange>('1m')
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

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
          name: cat?.category_name || `Danh mục ${catId}`,
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
      { name: 'Thu nhập', value: income, fill: '#c86bfa' },
      { name: 'Chi tiêu', value: expense, fill: '#ffd500' },
    ]
  }, [filteredTransactions])

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
                tickFormatter={formatVND}
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
                      <p className="text-primary font-medium">{fmt(value)}đ</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#c86bfa"
                strokeWidth={2}
                dot={{ fill: '#c86bfa', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'expense-allocation':
        if (expenseAllocationData.length === 0) {
          return (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Chưa có dữ liệu chi tiêu tháng này
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
                      <p className="text-muted-foreground">{fmt(payload[0].value as number)}đ ({percent}%)</p>
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
              Chưa có tài khoản nào
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
                      <p className="text-muted-foreground">{fmt(value)}đ ({percent}%)</p>
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
              Chưa có quỹ tiết kiệm nào
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
                    <p className="text-primary">{fmt(item.value)}đ ({pct}% tổng)</p>
                    <p className="text-muted-foreground">Mục tiêu: {fmt(item.target)}đ ({progress}% đạt)</p>
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
          return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Không có khoản nợ/vay đang hoạt động</div>
        }
        const myDebtData = myDebts.map(d => ({ name: d.lender || d.name, value: d.outstanding_balance }))
        const myLoanData = myLoans.map(d => ({ name: d.debtor || d.name, value: d.outstanding_balance }))
        const totalDebt = myDebtData.reduce((s, d) => s + d.value, 0)
        const totalLoan = myLoanData.reduce((s, d) => s + d.value, 0)

        const MiniDonut = ({ data, total, title, color }: { data: {name:string;value:number}[]; total:number; title:string; color:string }) => (
          <div className="flex-1 flex flex-col min-w-0">
            <p className="text-muted-foreground text-xs text-center mb-0.5">{title}</p>
            <p className="text-center text-sm font-bold mb-1" style={{ color }}>{fmt(total)}đ</p>
            {data.length === 0
              ? <div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-xs">Không có</div>
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
                          <p style={{ color }}>{fmt(item.value)}đ ({total > 0 ? ((item.value/total)*100).toFixed(1) : 0}%)</p>
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
            <MiniDonut data={myDebtData} total={totalDebt} title="Tôi đang nợ" color="#ff4d4d" />
            <div className="w-px bg-border self-stretch" />
            <MiniDonut data={myLoanData} total={totalLoan} title="Người nợ tôi" color="#c86bfa" />
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
        if (incomeData.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Chưa có thu nhập trong kỳ này</div>
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(200,107,250,0.10)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatVND} tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                    <p className="text-muted-foreground mb-0.5">{payload[0].payload.name}</p>
                    <p className="text-primary font-medium">{fmt(payload[0].value as number)}đ</p>
                  </div>
                )
              }} />
              <Bar dataKey="value" fill="#c86bfa" radius={[3, 3, 0, 0]} />
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
              <YAxis tickFormatter={formatVND} tick={{ fill: 'rgba(240,230,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                      {payload.map((p: any) => (
                        <p key={p.name} style={{ color: p.fill }} className="font-medium">
                          {p.name}: {fmt(p.value)}đ
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
      case 'asset-fluctuation': return 'Biến động tài sản'
      case 'expense-allocation': return 'Tỷ lệ phân bổ chi tiêu'
      case 'account-distribution': return 'Số dư theo tài khoản'
      case 'income-expense': return 'Thu chi'
      case 'savings-breakdown': return 'Phân bổ quỹ tiết kiệm'
      case 'debt-breakdown': return 'Tổng quan nợ/vay'
      case 'monthly-income-breakdown': return 'Thu nhập theo tháng'
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
              {r.label}
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
