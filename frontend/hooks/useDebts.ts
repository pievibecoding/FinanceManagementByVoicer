import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { debtsApi } from '@/api/debts'

export function useDebts() {
  const query = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtsApi.getDebts(),
  })

  const debts = query.data ?? []
  const totalDebt = debts
    .filter(d => d.debt_type === 'debt' && d.status === 'active')
    .reduce((sum, d) => sum + d.outstanding_balance, 0)
  const totalLoan = debts
    .filter(d => d.debt_type === 'loan' && d.status === 'active')
    .reduce((sum, d) => sum + d.outstanding_balance, 0)
  const nextPayment = debts
    .filter(d => d.debt_type === 'debt' && d.status === 'active' && d.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0] ?? null

  return { ...query, debts, totalDebt, totalLoan, nextPayment }
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: debtsApi.createDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ debtId, data }: { debtId: number; data: Parameters<typeof debtsApi.updateDebt>[1] }) =>
      debtsApi.updateDebt(debtId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: debtsApi.deleteDebt,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDebtPayments(debtId: number) {
  return useQuery({
    queryKey: ['debt-payments', debtId],
    queryFn: () => debtsApi.getPayments(debtId),
    enabled: debtId > 0,
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ debtId, data }: { debtId: number; data: Parameters<typeof debtsApi.createPayment>[1] }) =>
      debtsApi.createPayment(debtId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['debt-payments', vars.debtId] })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ debtId, paymentId }: { debtId: number; paymentId: number }) =>
      debtsApi.deletePayment(debtId, paymentId),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['debt-payments', vars.debtId] })
    },
  })
}
