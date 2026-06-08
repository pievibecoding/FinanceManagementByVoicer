import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savingsApi } from '@/api/savings'

export function useSavings() {
  const query = useQuery({
    queryKey: ['savings'],
    queryFn: () => savingsApi.getSavings(),
  })

  const savings = query.data ?? []
  const totalSaved = savings
    .filter(s => s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.current_balance, 0)

  return { ...query, savings, totalSaved }
}

export function useCreateSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: savingsApi.createSavings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' }),
  })
}

export function useUpdateSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ savingsId, data }: { savingsId: number; data: Parameters<typeof savingsApi.updateSavings>[1] }) =>
      savingsApi.updateSavings(savingsId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  })
}

export function useDeleteSavings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: savingsApi.deleteSavings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['savings'] }),
  })
}

export function useSavingsContributions(savingsId: number) {
  return useQuery({
    queryKey: ['savings-contributions', savingsId],
    queryFn: () => savingsApi.getContributions(savingsId),
    enabled: savingsId > 0,
  })
}

export function useCreateContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ savingsId, data }: { savingsId: number; data: Parameters<typeof savingsApi.createContribution>[1] }) =>
      savingsApi.createContribution(savingsId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['savings-contributions', vars.savingsId] })
    },
  })
}

export function useDeleteContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ savingsId, contributionId }: { savingsId: number; contributionId: number }) =>
      savingsApi.deleteContribution(savingsId, contributionId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['savings-contributions', vars.savingsId] })
    },
  })
}
