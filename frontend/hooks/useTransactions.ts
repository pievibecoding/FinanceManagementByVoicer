import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi } from '@/api/transactions';
import type { Transaction } from '@/api/transactions';

// Always fetch ALL transactions — filtering is done client-side in the page component.
// Using a stable key ['transactions'] ensures invalidation always hits the right query.
export function useTransactions() {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getTransactions(),
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transaction: {
      transaction_date: string;
      account_id: number;
      category_id: string;
      amount: number;
      type: string;
      note: string;
      payee_id?: number;
      location?: string;
      splits?: Array<{ category_id: string; amount: number; note: string }>;
    }) => transactionsApi.addTransaction(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, transaction }: {
      transactionId: string;
      transaction: {
        transaction_date?: string;
        account_id?: number;
        category_id?: string;
        amount?: number;
        type?: string;
        note?: string;
        payee_id?: number;
        location?: string;
      };
    }) => transactionsApi.updateTransaction(transactionId, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => transactionsApi.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'], refetchType: 'all' });
    },
  });
}
