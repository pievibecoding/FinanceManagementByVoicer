import { createFileRoute } from '@tanstack/react-router'
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useCategories } from '@/hooks/useCategories'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart'
import { AccountsSummary } from '@/components/dashboard/AccountsSummary'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AIChatWidget } from '@/components/dashboard/AIChatWidget'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function DashboardPage() {
  const { data, isLoading, isError } = useDashboardMetrics()
  const { data: categories = [] } = useCategories()

  const fmt = (n: number) =>
    new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
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

      {/* Row 1 — Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tổng tài sản"
          value={fmt(data.totalBalance)}
          icon="💰"
          positive={data.totalBalance >= 0}
        />
        <MetricCard
          title="Thu nhập tháng"
          value={fmt(data.monthlyIncome)}
          icon="📈"
          positive={true}
        />
        <MetricCard
          title="Chi tiêu tháng"
          value={fmt(data.monthlyExpenses)}
          icon="📉"
          positive={false}
        />
        <MetricCard
          title="Tiết kiệm ròng"
          value={fmt(data.netSavings)}
          icon={isNegativeSavings ? '🔴' : '💵'}
          positive={!isNegativeSavings}
        />
      </div>

      {/* Row 2 — Chart + Accounts (7/5 split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <IncomeExpenseChart transactions={data.transactions} />
        </div>
        <div className="lg:col-span-5">
          <AccountsSummary
            accounts={data.accounts}
            transactions={data.transactions}
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
