import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, Transaction } from '@/api/transactions';

export function useTransactions(filters?: {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getTransactions(filters),
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
      splits?: Array<{ category_id: string; amount: number; note: string }>;
    }) => transactionsApi.addTransaction(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      };
    }) => transactionsApi.updateTransaction(transactionId, transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (transactionId: string) => transactionsApi.deleteTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
