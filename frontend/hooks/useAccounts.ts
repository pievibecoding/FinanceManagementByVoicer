import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, Account, TransferBetweenAccountsPayload } from '@/api/accounts';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAccounts(),
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (account: {
      account_name: string;
      account_type: string;
      initial_balance: number;
      currency: string;
      description?: string;
      color?: string;
    }) => accountsApi.addAccount(account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, account }: {
      accountId: number;
      account: {
        account_name?: string;
        account_type?: string;
        initial_balance?: number;
        currency?: string;
        description?: string;
        color?: string;
      };
    }) => accountsApi.updateAccount(accountId, account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accountId: number) => accountsApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useTransferBetweenAccounts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: TransferBetweenAccountsPayload) => accountsApi.transferBetweenAccounts(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
