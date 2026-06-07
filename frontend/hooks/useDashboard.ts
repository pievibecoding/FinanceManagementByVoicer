import { useQuery } from '@tanstack/react-query';
import { dashboardApi, Account, Transaction, Budget } from '@/api/dashboard';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => dashboardApi.getAccounts(),
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => dashboardApi.getTransactions(),
  });
}

export function useBudgets(month?: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => dashboardApi.getBudgets(month),
  });
}

export function useDashboardMetrics() {
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const budgetsQuery = useBudgets();

  const isLoading = accountsQuery.isLoading || transactionsQuery.isLoading || budgetsQuery.isLoading;
  const isError = accountsQuery.isError || transactionsQuery.isError || budgetsQuery.isError;

  // Calculate total balance
  const totalBalance = accountsQuery.data?.reduce((sum, acc) => sum + acc.initial_balance, 0) || 0;

  // Calculate current month income and expenses
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthTransactions = transactionsQuery.data?.filter(
    (tx) => tx.transaction_date.startsWith(currentMonth)
  ) || [];

  const monthlyIncome = currentMonthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpenses = currentMonthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = monthlyIncome - monthlyExpenses;

  // Calculate budget status
  const activeBudgets = budgetsQuery.data || [];
  const budgetStatus = activeBudgets.length > 0 ? (activeBudgets.length / 10) * 100 : 0;

  return {
    data: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netSavings,
      budgetStatus,
      accounts: accountsQuery.data || [],
      recentTransactions: transactionsQuery.data?.slice(0, 10) || [],
      budgets: budgetsQuery.data || [],
    },
    isLoading,
    isError,
  };
}
