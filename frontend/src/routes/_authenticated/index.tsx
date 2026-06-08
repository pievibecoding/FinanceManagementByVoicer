import { createFileRoute } from '@tanstack/react-router'
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useCategories } from '@/hooks/useCategories'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DynamicChart } from '@/components/dashboard/DynamicChart'
import { AccountsSummary } from '@/components/dashboard/AccountsSummary'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AIChatWidget } from '@/components/dashboard/AIChatWidget'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data, isLoading, isError } = useDashboardMetrics()
  const { data: categories = [] } = useCategories()
  const [selectedMetric, setSelectedMetric] = useState('net-worth')

  const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  const CHART_MAP: Record<string, string> = {
    'net-worth': 'asset-fluctuation',
    'total-balance': 'account-distribution',
    'monthly-income': 'income-expense',
    'monthly-expense': 'expense-allocation',
    'net-savings': 'income-expense',
    'total-debt': 'income-expense',
  }

  const selectedChart = (CHART_MAP[selectedMetric] || 'asset-fluctuation') as any

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/6 border border-white/18 rounded-[0.625rem] p-6 animate-pulse h-28" />
          ))}
        </div>
        <div className="text-white/40 text-sm">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Dashboard</h1>
        <div className="bg-[#dd9787]/10 border border-[#dd9787]/30 rounded-xl p-4 text-[#dd9787] text-sm">
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
    <div className="p-6 space-y-5">
      {/* Page title */}
      <h1 className="text-xl font-bold text-white">Dashboard</h1>

      {/* Row 1 — Metric cards (4 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng tài sản ròng"
          value={fmt(data.totalBalance)}
          icon="💰"
          positive={data.totalBalance >= 0}
          onClick={() => setSelectedMetric('net-worth')}
          selected={selectedMetric === 'net-worth'}
        />
        <MetricCard
          title="Tổng số dư hiện tại"
          value={fmt(data.totalBalance)}
          icon="�"
          positive={data.totalBalance >= 0}
          onClick={() => setSelectedMetric('total-balance')}
          selected={selectedMetric === 'total-balance'}
        />
        <MetricCard
          title="Thu nhập tháng"
          value={fmt(data.monthlyIncome)}
          icon="�"
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
      </div>

      {/* Row 2 — Chart (3 columns) + Metric cards (4th column) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3">
          <DynamicChart
            chartType={selectedChart}
            transactions={data.transactions}
            accounts={data.accounts}
            categories={categories}
            expenseByCategory={data.expenseByCategory}
            monthlyNetWorth={data.monthlyNetWorth}
          />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-5">
          <MetricCard
            title="Tiết kiệm ròng"
            value={fmt(data.netSavings)}
            icon={isNegativeSavings ? '🔴' : '💵'}
            positive={!isNegativeSavings}
            onClick={() => setSelectedMetric('net-savings')}
            selected={selectedMetric === 'net-savings'}
          />
          <MetricCard
            title="Tổng nợ"
            value="0đ"
            icon="📉"
            positive={false}
            onClick={() => setSelectedMetric('total-debt')}
            selected={selectedMetric === 'total-debt'}
          />
        </div>
      </div>

      {/* Row 3 — Budget */}
      <BudgetOverview
        budgets={data.budgets}
        categories={budgetCategories}
        transactions={data.transactions}
      />

      {/* AI Chat floating widget */}
      <AIChatWidget />
    </div>
  )
}
