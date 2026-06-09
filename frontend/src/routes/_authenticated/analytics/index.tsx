import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAnalyticsOverview, useSpendingByCategory, useIncomeVsExpense, useMonthlyTrends } from '@/hooks/useAnalytics'
import { AnalyticsOverview } from '@/components/analytics/AnalyticsOverview'
import { SpendingByCategory } from '@/components/analytics/SpendingByCategory'
import { IncomeVsExpense } from '@/components/analytics/IncomeVsExpense'
import { MonthlyTrends } from '@/components/analytics/MonthlyTrends'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/analytics/')({
  component: () => {
    const { t } = useTranslation()
    const [startDate, setStartDate] = useState<string>()
    const [endDate] = useState<string>()

    const { data: overview, isLoading: overviewLoading, isError: overviewError } = useAnalyticsOverview(startDate, endDate)
    const { data: spendingByCategory, isLoading: spendingLoading, isError: spendingError } = useSpendingByCategory(startDate, endDate)
    const { data: incomeVsExpense, isLoading: incomeLoading, isError: incomeError } = useIncomeVsExpense(startDate, endDate)
    const { data: monthlyTrends, isLoading: trendsLoading, isError: trendsError } = useMonthlyTrends(12)

    const isLoading = overviewLoading || spendingLoading || incomeLoading || trendsLoading
    const isError = overviewError || spendingError || incomeError || trendsError

    if (isLoading) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('analytics.title')}</h1>
          <div className="text-muted-foreground">{t('common.loading')}</div>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t('analytics.title')}</h1>
          <div className="text-destructive">{t('analytics.error')}</div>
        </div>
      )
    }

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">{t('analytics.title')}</h1>

        <div className="space-y-6">
          {overview && <AnalyticsOverview data={overview} />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {spendingByCategory && <SpendingByCategory data={spendingByCategory} />}
            {incomeVsExpense && <IncomeVsExpense data={incomeVsExpense} />}
          </div>

          {monthlyTrends && <MonthlyTrends data={monthlyTrends} />}
        </div>
      </div>
    )
  },
})
