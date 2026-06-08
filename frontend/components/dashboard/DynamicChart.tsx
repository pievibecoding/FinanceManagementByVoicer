import { useMemo } from 'react'
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

export function DynamicChart({
  chartType,
  transactions,
  accounts,
  categories,
  expenseByCategory,
  monthlyNetWorth,
}: DynamicChartProps) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n)

  // Asset Fluctuation Chart (Line chart)
  const assetFluctuationData = useMemo(() => {
    return Object.entries(monthlyNetWorth)
      .map(([month, value]) => ({ name: formatMonth(month), value: value || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [monthlyNetWorth])

  // Expense Allocation Chart (Donut chart)
  const expenseAllocationData = useMemo(() => {
    return Object.entries(expenseByCategory)
      .map(([catId, amount]) => {
        const cat = categories.find(c => String(c.category_id) === catId)
        return {
          name: cat?.category_name || `Danh mục ${catId}`,
          value: amount || 0,
        }
      })
      .filter(item => item.value > 0)
  }, [expenseByCategory, categories])

  // Account Distribution Chart (Donut chart)
  const accountDistributionData = useMemo(() => {
    return accounts.map(acc => {
      let balance = acc.initial_balance
      transactions.forEach(tx => {
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
  }, [accounts, transactions])

  // Income Expense Chart (Bar chart)
  const incomeExpenseData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    const thisMonthTx = transactions.filter(tx => tx.transaction_date.startsWith(currentMonth))
    
    const income = thisMonthTx
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    const expense = thisMonthTx
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)
    
    return [
      { name: 'Thu nhập', value: income, fill: '#74d3ae' },
      { name: 'Chi tiêu', value: expense, fill: '#dd9787' },
    ]
  }, [transactions])

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
              >
                {expenseAllocationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-white font-medium">{payload[0].payload.name}</p>
                      <p className="text-white/60">{fmt(payload[0].value as number)}đ</p>
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
              >
                {accountDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ACCOUNT_COLORS[entry.accountType] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="text-white font-medium">{payload[0].payload.name}</p>
                      <p className="text-white/60">{fmt(payload[0].value as number)}đ</p>
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
      <h3 className="text-white font-semibold text-sm mb-4">{getChartTitle()}</h3>
      {renderChart()}
    </div>
  )
}
