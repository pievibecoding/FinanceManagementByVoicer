import { createFileRoute } from '@tanstack/react-router'
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useCategories } from '@/hooks/useCategories'
import { useDebts } from '@/hooks/useDebts'
import { useSavings } from '@/hooks/useSavings'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DynamicChart } from '@/components/dashboard/DynamicChart'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AIChatWidget } from '@/components/dashboard/AIChatWidget'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data, isLoading, isError } = useDashboardMetrics()
  const { data: categories = [] } = useCategories()
  const { debts = [] } = useDebts()
  const { savings = [] } = useSavings()
  const [selectedMetric, setSelectedMetric] = useState('net-worth')

  const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  const CHART_MAP: Record<string, string> = {
    'net-worth': 'asset-fluctuation',
    'total-balance': 'account-distribution',
    'monthly-income': 'monthly-income-breakdown',
    'monthly-expense': 'expense-allocation',
    'net-savings': 'savings-breakdown',
    'total-debt': 'debt-breakdown',
  }

  const selectedChart = (CHART_MAP[selectedMetric] || 'asset-fluctuation') as any

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-[var(--radius)] p-6 animate-pulse h-28" />
          ))}
        </div>
        <div className="text-muted-foreground text-sm">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Dashboard</h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
          Không thể tải dữ liệu. Kiểm tra kết nối backend.
        </div>
      </div>
    )
  }

  // Map categories to the shape BudgetOverview needs (category_id as number)
  const budgetCategories = categories.map(c => ({
    category_id: Number(c.category_id),
    category_name: c.category_name,
  }))

  const isNegativeSavings = data.netSavings < 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 flex flex-col gap-5" style={{ minHeight: '100%' }}>
        {/* Page title */}
        <h1 className="text-xl font-bold text-foreground shrink-0">Dashboard</h1>

        {/* Row 1 — Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
          <MetricCard
            title="Tổng tài sản ròng"
            value={fmt(data.netWorth)}
            icon="💰"
            positive={data.netWorth >= 0}
            onClick={() => setSelectedMetric('net-worth')}
            selected={selectedMetric === 'net-worth'}
          />
          <MetricCard
            title="Số dư hiện tại"
            value={fmt(data.totalBalance)}
            icon="🏦"
            positive={data.totalBalance >= 0}
            onClick={() => setSelectedMetric('total-balance')}
            selected={selectedMetric === 'total-balance'}
          />
          <MetricCard
            title="Thu nhập tháng"
            value={fmt(data.monthlyIncome)}
            icon="📈"
            positive={true}
            onClick={() => setSelectedMetric('monthly-income')}
            selected={selectedMetric === 'monthly-income'}
          />
          <MetricCard
            title="Chi tiêu tháng"
            value={fmt(data.monthlyExpenses)}
            icon="📉"
            positive={false}
            onClick={() => setSelectedMetric('monthly-expense')}
            selected={selectedMetric === 'monthly-expense'}
          />
          <MetricCard
            title="Nợ"
            value={fmt(data.totalDebt)}
            icon="💳"
            positive={false}
            onClick={() => setSelectedMetric('total-debt')}
            selected={selectedMetric === 'total-debt'}
          />
          <MetricCard
            title="Tiết kiệm"
            value={fmt(data.totalSaved)}
            icon="🐷"
            positive={true}
            onClick={() => setSelectedMetric('net-savings')}
            selected={selectedMetric === 'net-savings'}
          />
        </div>

        {/* Row 2 — Chart fills remaining viewport height above the fold */}
        {/* min-h ensures chart is always tall enough to fill screen before budget */}
        <div className="shrink-0" style={{ height: 'calc(100svh - 340px)', minHeight: '280px' }}>
          <DynamicChart
            chartType={selectedChart}
            transactions={data.transactions}
            accounts={data.accounts}
            categories={categories}
            expenseByCategory={data.expenseByCategory}
            monthlyNetWorth={data.monthlyNetWorth}
            savings={savings}
            debts={debts}
          />
        </div>

        {/* Row 3 — Budget (visible when scrolling down) */}
        <div className="shrink-0">
          <BudgetOverview
            budgets={data.budgets}
            categories={budgetCategories}
            transactions={data.transactions}
          />
        </div>
      </div>

      {/* AI Chat floating widget */}
      <AIChatWidget />
    </div>
  )
}
