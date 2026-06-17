import { createFileRoute } from '@tanstack/react-router'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AppCard } from '@/components/common'
import { chartColors, categoryColors, palette } from '@/styles/tokens'

export const Route = createFileRoute('/chart-lab')({
  component: ChartLabPage,
})

const distributionData = [
  { name: 'Bank', value: 48, amount: 48000000, color: categoryColors[0] },
  { name: 'Wallet', value: 22, amount: 22000000, color: categoryColors[1] },
  { name: 'Cash', value: 18, amount: 18000000, color: categoryColors[2] },
  { name: 'Savings', value: 12, amount: 12000000, color: categoryColors[3] },
]

const radialData = distributionData.map((item) => ({
  ...item,
  fill: item.color,
}))

const monthlyData = [
  { month: 'Jan', income: 42, expense: 25, balance: 17 },
  { month: 'Feb', income: 38, expense: 28, balance: 10 },
  { month: 'Mar', income: 47, expense: 31, balance: 16 },
  { month: 'Apr', income: 44, expense: 26, balance: 18 },
  { month: 'May', income: 51, expense: 34, balance: 17 },
  { month: 'Jun', income: 56, expense: 32, balance: 24 },
]

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }
const gridStroke = 'var(--border)'

function formatAmount(value: number) {
  return `${value.toLocaleString('vi-VN')} đ`
}

function ChartShell({
  title,
  note,
  children,
}: {
  title: string
  note: string
  children: React.ReactNode
}) {
  return (
    <AppCard className="flex min-h-[360px] flex-col gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </AppCard>
  )
}

function ChartLabTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-foreground">{label ?? payload[0]?.name}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey ?? item.name} className="font-medium" style={{ color: item.color }}>
          {item.name}: {item.value}
        </p>
      ))}
    </div>
  )
}

function ChartLabPage() {
  return (
    <main className="min-h-screen overflow-y-auto bg-background p-6 text-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Chart Lab - TEST ONLY</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Route tạm để thử chart Recharts. Sau khi chọn hướng chart xong thì xóa file
            <span className="font-mono"> frontend/src/routes/chart-lab.tsx</span>.
          </p>
        </div>

        <div>
          <h1 className="text-xl font-bold">Recharts Prototype Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Các mẫu dưới đây dùng data giả và token màu hiện tại của app.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ChartShell
            title="Rounded-ish Donut with Recharts Pie"
            note="Gần chart hiện tại nhất. Dễ thay thế, nhưng bo tròn sector bị giới hạn bởi Pie mặc định."
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={5}
                  cornerRadius={12}
                  stroke="var(--background)"
                  strokeWidth={4}
                >
                  {distributionData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartLabTooltip />} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="RadialBar Distribution"
            note="Cảm giác hiện đại, bo tròn tốt hơn, nhưng đọc tỷ trọng như donut truyền thống khó hơn."
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                data={radialData}
                innerRadius="24%"
                outerRadius="88%"
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  background={{ fill: 'var(--muted)' }}
                  cornerRadius={16}
                />
                <Tooltip content={<ChartLabTooltip />} />
                <Legend iconType="circle" />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Rounded Income vs Expense Bars"
            note="Ứng viên tốt cho income-expense hoặc monthly-income-breakdown."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartLabTooltip />} />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill={chartColors.income} radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill={chartColors.expense} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>

          <ChartShell
            title="Soft Area Trend"
            note="Ứng viên cho asset-fluctuation, nhìn nhẹ và hợp glass theme."
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
                <defs>
                  <linearGradient id="chartLabBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette.accent} stopOpacity={0.38} />
                    <stop offset="95%" stopColor={palette.accent} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartLabTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke={palette.accent}
                  strokeWidth={3}
                  fill="url(#chartLabBalance)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>
        </div>
      </div>
    </main>
  )
}
