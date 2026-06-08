import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { Transaction } from '@/api/dashboard'

interface IncomeExpenseChartProps {
  transactions: Transaction[]
}

type RangeKey = '7d' | '30d' | '3m' | '6m' | '12m' | 'ytd'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '7d',  label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '3m',  label: '3 tháng' },
  { key: '6m',  label: '6 tháng' },
  { key: '12m', label: '12 tháng' },
  { key: 'ytd', label: 'Năm nay' },
]

function formatVND(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.fill }} className="font-medium">
          {p.name === 'income' ? 'Thu' : 'Chi'}: {new Intl.NumberFormat('vi-VN').format(p.value)}đ
        </p>
      ))}
    </div>
  )
}

export function IncomeExpenseChart({ transactions }: IncomeExpenseChartProps) {
  const [range, setRange] = useState<RangeKey>('6m')

  const chartData = useMemo(
    () => buildChartData(transactions, range),
    [transactions, range]
  )

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-5 backdrop-blur-sm h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Thu chi</h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                range === r.key
                  ? 'bg-[#74d3ae]/20 text-[#74d3ae] border border-[#74d3ae]/40'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barGap={2} barSize={range === '7d' || range === '30d' ? 6 : 14}>
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Legend
            formatter={(v) => (
              <span className="text-xs text-white/50">{v === 'income' ? 'Thu nhập' : 'Chi tiêu'}</span>
            )}
          />
          <Bar dataKey="income" fill="#74d3ae" radius={[3, 3, 0, 0]} name="income" />
          <Bar dataKey="expense" fill="#dd9787" radius={[3, 3, 0, 0]} name="expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
