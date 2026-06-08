import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics';

export function useAnalyticsOverview(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'overview', startDate, endDate],
    queryFn: () => analyticsApi.getOverview(startDate, endDate),
  });
}

export function useSpendingByCategory(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'spending-by-category', startDate, endDate],
    queryFn: () => analyticsApi.getSpendingByCategory(startDate, endDate),
  });
}

export function useIncomeVsExpense(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['analytics', 'income-vs-expense', startDate, endDate],
    queryFn: () => analyticsApi.getIncomeVsExpense(startDate, endDate),
  });
}

export function useMonthlyTrends(months: number = 12) {
  return useQuery({
    queryKey: ['analytics', 'monthly-trends', months],
    queryFn: () => analyticsApi.getMonthlyTrends(months),
  });
}
