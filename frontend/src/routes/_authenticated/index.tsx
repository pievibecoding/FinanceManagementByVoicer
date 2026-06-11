import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { useCategories } from '@/hooks/useCategories'
import { useDebts } from '@/hooks/useDebts'
import { useSavings } from '@/hooks/useSavings'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { DynamicChart } from '@/components/dashboard/DynamicChart'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { AIChatWidget } from '@/components/dashboard/AIChatWidget'
import { AppCard } from '@/components/common'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

function getCurrentMonthKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { formatCurrency } = useLocaleFormat()
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(getCurrentMonthKey)
  const { data, isLoading, isError, isBudgetLoading, isBudgetError } = useDashboardMetrics(selectedBudgetMonth)
  const { data: categories = [] } = useCategories()
  const { debts = [] } = useDebts()
  const { savings = [] } = useSavings()
  const [selectedMetric, setSelectedMetric] = useState('net-worth')

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
        <h1 className="text-2xl font-bold mb-4 text-foreground">{t('dashboard.title')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <AppCard key={i} className="h-28 rounded-[var(--radius)] p-6 animate-pulse" />
          ))}
        </div>
        <div className="text-muted-foreground text-sm">{t('dashboard.loading')}</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-foreground">{t('dashboard.title')}</h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
          {t('dashboard.loadError')}
        </div>
      </div>
    )
  }

  // Map categories to the shape BudgetOverview needs while preserving API ID shape.
  const budgetCategories = categories.map(c => ({
    category_id: c.category_id,
    category_name: c.category_name,
  }))

  const isNegativeSavings = data.netSavings < 0
  const handleBudgetCardClick = ({ categoryId, month }: { categoryId: string; month: string }) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const lastDay = new Date(year, monthNumber, 0).getDate()
    navigate({
      to: '/transactions',
      search: {
        categories: categoryId,
        start: `${month}-01`,
        end: `${month}-${String(lastDay).padStart(2, '0')}`,
      },
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 flex flex-col gap-5" style={{ minHeight: '100%' }}>
        {/* Page title */}
        <h1 className="text-xl font-bold text-foreground shrink-0">{t('dashboard.title')}</h1>

        {/* Row 1 — Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
          <MetricCard
            title={t('dashboard.netWorth')}
            value={formatCurrency(data.netWorth)}
            icon="💰"
            positive={data.netWorth >= 0}
            onClick={() => setSelectedMetric('net-worth')}
            selected={selectedMetric === 'net-worth'}
          />
          <MetricCard
            title={t('dashboard.totalBalance')}
            value={formatCurrency(data.totalBalance)}
            icon="🏦"
            positive={data.totalBalance >= 0}
            onClick={() => setSelectedMetric('total-balance')}
            selected={selectedMetric === 'total-balance'}
          />
          <MetricCard
            title={t('dashboard.monthlyIncome')}
            value={formatCurrency(data.monthlyIncome)}
            icon="📈"
            positive={true}
            onClick={() => setSelectedMetric('monthly-income')}
            selected={selectedMetric === 'monthly-income'}
          />
          <MetricCard
            title={t('dashboard.monthlyExpense')}
            value={formatCurrency(data.monthlyExpenses)}
            icon="📉"
            positive={false}
            onClick={() => setSelectedMetric('monthly-expense')}
            selected={selectedMetric === 'monthly-expense'}
          />
          <MetricCard
            title={t('dashboard.totalDebt')}
            value={formatCurrency(data.totalDebt)}
            icon="💳"
            positive={false}
            onClick={() => setSelectedMetric('total-debt')}
            selected={selectedMetric === 'total-debt'}
          />
          <MetricCard
            title={t('dashboard.totalSaved')}
            value={formatCurrency(data.totalSaved)}
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
            selectedMonth={selectedBudgetMonth}
            onSelectedMonthChange={setSelectedBudgetMonth}
            isLoading={isBudgetLoading}
            isError={isBudgetError}
            onBudgetCardClick={handleBudgetCardClick}
          />
        </div>
      </div>

      {/* AI Chat floating widget */}
      <AIChatWidget />
    </div>
  )
}
