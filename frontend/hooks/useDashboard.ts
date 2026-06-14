import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useDebts } from '@/hooks/useDebts';
import { useSavings } from '@/hooks/useSavings';
import { cashDirectionForTransaction, operationTypeForTransaction } from '@/lib/transaction-types';

function normalizeId(value: string | number | null | undefined) {
  return value == null ? '' : String(value);
}

// useDashboardMetrics uses the SAME useTransactions hook as the transactions page.
// This ensures both share the same TanStack Query cache entry ['transactions'].
export function useDashboardMetrics(budgetMonth?: string) {
  const accountsQuery = useAccounts();
  const transactionsQuery = useTransactions();
  const budgetsQuery = useBudgets(budgetMonth);
  const { totalDebt, totalLoan } = useDebts();
  const { totalSaved } = useSavings();

  const isLoading = accountsQuery.isLoading || transactionsQuery.isLoading;
  const isError = accountsQuery.isError || transactionsQuery.isError;

  const accounts = accountsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.current_balance, 0);

  // Net worth = liquid accounts + savings + receivables - liabilities.
  const netWorth = totalBalance + totalSaved + totalLoan - totalDebt;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const thisMonthTx = transactions.filter(tx => tx.transaction_date.startsWith(currentMonth));

  const monthlyIncome = thisMonthTx
    .filter(tx => operationTypeForTransaction(tx) === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const monthlyExpenses = thisMonthTx
    .filter(tx => operationTypeForTransaction(tx) === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const netSavings = monthlyIncome - monthlyExpenses;

  // Compute expense by category for current month (for expense-allocation chart)
  const expenseByCategory: Record<number, number> = {};
  thisMonthTx.forEach(tx => {
    if (operationTypeForTransaction(tx) === 'expense') {
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
      const accountId = normalizeId(acc.account_id);
      transactions.forEach(tx => {
        if (normalizeId(tx.account_id) !== accountId) return;
        if (tx.transaction_date.slice(0, 7) <= month) {
          const direction = cashDirectionForTransaction(tx);
          if (direction === 'in') balance += tx.amount;
          if (direction === 'out') balance -= tx.amount;
        }
      });
      netWorth += balance;
    });
    monthlyNetWorth[month] = netWorth;
  });

  return {
    data: {
      totalBalance,
      netWorth,
      totalDebt,
      totalSaved,
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
    isBudgetLoading: budgetsQuery.isLoading,
    isBudgetError: budgetsQuery.isError,
  };
}
