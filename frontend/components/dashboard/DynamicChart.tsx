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

interface DynamicChartProps {
  chartType: 'asset-fluctuation' | 'expense-allocation' | 'account-distribution' | 'income-expense'
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  expenseByCategory: Record<number, number>
  monthlyNetWorth: Record<string, number>
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
  'Bank': '#678d58',
  'E-Wallet': '#74d3ae',
  'Investment': '#0ea5e9',
  'Cash': '#f59e0b',
}

const CATEGORY_COLORS = [
  '#74d3ae', '#678d58', '#dd9787', '#0ea5e9', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
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
      { name: 'Thu nhập', value: income, fill: '#74d3ae' },
      { name: 'Chi tiêu', value: expense, fill: '#dd9787' },
    ]
  }, [filteredTransactions])

  const renderChart = () => {
    switch (chartType) {
      case 'asset-fluctuation':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={assetFluctuationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatVND}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const value = payload[0].value as number
                  return (
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-white/60 mb-1">{payload[0].payload.name}</p>
                      <p className="text-[#74d3ae] font-medium">{fmt(value)}đ</p>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#74d3ae"
                strokeWidth={2}
                dot={{ fill: '#74d3ae', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'expense-allocation':
        if (expenseAllocationData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[260px] text-white/40 text-sm">
              Chưa có dữ liệu chi tiêu tháng này
            </div>
          )
        }
        const totalExpense = expenseAllocationData.reduce((sum, item) => sum + item.value, 0)
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={expenseAllocationData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                  if (midAngle === undefined) return null
                  const RADIAN = Math.PI / 180
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const percent = ((value / totalExpense) * 100).toFixed(0)
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                    >
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
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-white font-medium">{payload[0].payload.name}</p>
                      <p className="text-white/60">{fmt(payload[0].value as number)}đ ({percent}%)</p>
                    </div>
                  )
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-white/50">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'account-distribution':
        if (accountDistributionData.length === 0) {
          return (
            <div className="flex items-center justify-center h-[260px] text-white/40 text-sm">
              Chưa có tài khoản nào
            </div>
          )
        }
        const totalBalance = accountDistributionData.reduce((sum, item) => sum + item.value, 0)
        return (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={accountDistributionData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                  if (midAngle === undefined) return null
                  const RADIAN = Math.PI / 180
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                  const x = cx + radius * Math.cos(-midAngle * RADIAN)
                  const y = cy + radius * Math.sin(-midAngle * RADIAN)
                  const percent = ((value / totalBalance) * 100).toFixed(0)
                  return (
                    <text
                      x={x}
                      y={y}
                      fill="white"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                      fontSize={10}
                      fontWeight={500}
                    >
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
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-white font-medium">{payload[0].payload.name}</p>
                      <p className="text-white/60">{fmt(value)}đ ({percent}%)</p>
                    </div>
                  )
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-white/50">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'income-expense':
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={incomeExpenseData} barGap={2} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatVND}
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
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
      default: return ''
    }
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-5 backdrop-blur-sm h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">{getChartTitle()}</h3>
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setTimeRange(r.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                timeRange === r.key
                  ? 'bg-[#74d3ae]/20 text-[#74d3ae] border border-[#74d3ae]/40'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {renderChart()}
    </div>
  )
}
