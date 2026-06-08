import { useQuery } from '@tanstack/react-query'
import { getSavings } from '@/api/savings'
import type { Savings } from '@/types'

export function useSavings() {
  const query = useQuery({
    queryKey: ['savings'],
    queryFn: getSavings,
  })

  const savings = query.data ?? []
  
  // Compute total saved (active savings only)
  const totalSaved = savings
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.current_balance, 0)

  // Find nearest goal deadline (active savings with target_date)
  const nearestGoal = savings
    .filter(s => s.status === 'active' && s.target_date)
    .sort((a, b) => new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime())[0]

  return {
    savings,
    totalSaved,
    nearestGoal,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  }
}
