import { useQuery } from '@tanstack/react-query'
import { getDebts } from '@/api/debts'
import type { Debt } from '@/types'

export function useDebts() {
  const query = useQuery({
    queryKey: ['debts'],
    queryFn: getDebts,
  })

  const debts = query.data ?? []
  
  // Compute total debt (excluding paid_off status)
  const totalDebt = debts
    .filter(d => d.status !== 'paid_off')
    .reduce((sum, d) => sum + d.outstanding_balance, 0)

  // Find next payment due (debt with earliest due_date that's not paid_off)
  const nextPayment = debts
    .filter(d => d.status !== 'paid_off' && d.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]

  return {
    debts,
    totalDebt,
    nextPayment,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
