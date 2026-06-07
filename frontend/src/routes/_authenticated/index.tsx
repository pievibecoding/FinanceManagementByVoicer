import { createFileRoute } from '@tanstack/react-router'
import { Outlet } from '@tanstack/react-router'
import { useDashboardMetrics } from '@/hooks/useDashboard'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { BudgetCard } from '@/components/dashboard/BudgetCard'
import { TransactionListItem } from '@/components/dashboard/TransactionListItem'
import { AccountCard } from '@/components/dashboard/AccountCard'
import { QuickActions } from '@/components/dashboard/QuickActions'

export const Route = createFileRoute('/_authenticated/')({
  component: () => {
    const { data, isLoading, isError } = useDashboardMetrics()

    if (isLoading) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Dashboard</h1>
          <div className="text-white/60">Loading...</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-white">Dashboard</h1>
          <div className="text-[#dd9787]">Error loading dashboard data</div>
        </div>
      )
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('vi-VN').format(amount)
    }

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <QuickActions />
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Balance"
            value={`${formatCurrency(data.totalBalance)} VND`}
            icon="💰"
          />
          <MetricCard
            title="Monthly Income"
            value={`${formatCurrency(data.monthlyIncome)} VND`}
            icon="📈"
            positive={true}
          />
          <MetricCard
            title="Monthly Expenses"
            value={`${formatCurrency(data.monthlyExpenses)} VND`}
            icon="📉"
            positive={false}
          />
          <MetricCard
            title="Net Savings"
            value={`${formatCurrency(data.netSavings)} VND`}
            icon="💵"
            positive={data.netSavings >= 0}
          />
        </div>

        {/* Budget Overview */}
        {data.budgets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Budget Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.budgets.slice(0, 3).map((budget) => (
                <BudgetCard
                  key={budget.budget_id}
                  category={`Category ${budget.category_id}`}
                  limit={budget.amount_limit}
                  spent={budget.amount_limit * 0.6} // Placeholder - will calculate from transactions
                  remaining={budget.amount_limit * 0.4}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
          {data.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {data.recentTransactions.map((transaction) => (
                <TransactionListItem
                  key={transaction.transaction_id}
                  transaction={transaction}
                  onClick={() => {}}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 text-white/60">
              No transactions yet
            </div>
          )}
        </div>

        {/* Account Summary */}
        {data.accounts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Account Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.accounts.map((account) => (
                <AccountCard
                  key={account.account_id}
                  account={account}
                  onClick={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        <Outlet />
      </div>
    )
  },
})
