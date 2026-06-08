import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';

// useDashboardMetrics uses the SAME useTransactions hook as the transactions page.
// This ensures both share the same TanStack Query cache entry ['transactions'].
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

  // Compute expense by category for current month (for expense-allocation chart)
  const expenseByCategory: Record<number, number> = {};
  thisMonthTx.forEach(tx => {
    if (tx.type === 'expense') {
      const catId = Number(tx.category_id);
      expenseByCategory[catId] = (expenseByCategory[catId] ?? 0) + tx.amount;
    }
  });

  // Compute monthly net worth over time (for asset-fluctuation chart)
  const monthlyNetWorth: Record<string, number> = {};
  const months = new Set<string>();
  transactions.forEach(tx => {
    const month = tx.transaction_date.slice(0, 7);
    months.add(month);
  });

  // Sort months chronologically
  const sortedMonths = Array.from(months).sort();

  // Compute net worth for each month
  sortedMonths.forEach(month => {
    let netWorth = 0;
    accounts.forEach(acc => {
      let balance = acc.initial_balance;
      transactions.forEach(tx => {
        if (tx.account_id !== acc.account_id) return;
        if (tx.transaction_date.slice(0, 7) <= month) {
          if (tx.type === 'income') balance += tx.amount;
          else balance -= tx.amount;
        }
      });
      netWorth += balance;
    });
    monthlyNetWorth[month] = netWorth;
  });

  return {
    data: {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netSavings,
      accounts,
      transactions,
      budgets: budgetsQuery.data ?? [],
      expenseByCategory,
      monthlyNetWorth,
    },
    isLoading,
    isError,
  };
}
