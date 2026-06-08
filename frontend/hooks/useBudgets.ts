import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsApi, type Budget } from '@/api/budgets';

export function useBudgets(month?: string) {
  return useQuery({
    queryKey: ['budgets', month],
    queryFn: () => budgetsApi.getBudgets(month),
  });
}

export function useUpsertBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, amountLimit, month }: { categoryId: number; amountLimit: number; month?: string }) =>
      budgetsApi.upsertBudget(categoryId, amountLimit, month),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.month] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, month }: { categoryId: number; month?: string }) =>
      budgetsApi.deleteBudget(categoryId, month),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', variables.month] });
    },
  });
}
