import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';

export { useAccounts, useTransactions, useBudgets } from '@/hooks/useAccounts';

// Re-export from dedicated hooks so dashboard can use them
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';

export function useDashboardMetrics() {
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const budgetsQuery = useBudgets();

  const isLoading = accountsQuery.isLoading || transactionsQuery.isLoading || budgetsQuery.isLoading;
  const isError = accountsQuery.isError || transactionsQuery.isError || budgetsQuery.isError;

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  // Compute real current balance per account
  const totalBalance = accounts.reduce((sum, acc) => {
    let balance = acc.initial_balance;
    transactions.forEach(tx => {
      if (tx.account_id !== acc.account_id) return;
      if (tx.type === 'income') balance += tx.amount;
      else balance -= tx.amount; // expense + investment
    });
    return sum + balance;
  }, 0);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTx = transactions.filter(tx => tx.transaction_date.startsWith(currentMonth));

  const monthlyIncome = thisMonthTx
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpenses = thisMonthTx
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = monthlyIncome - monthlyExpenses;

  return {
    data: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netSavings,
      accounts,
      transactions,
      budgets: budgetsQuery.data ?? [],
    },
    isLoading,
    isError,
  };
}
