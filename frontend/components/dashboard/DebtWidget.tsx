import { useDebts } from '@/hooks/useDebts'

export function DebtWidget() {
  const { totalDebt, nextPayment, isLoading } = useDebts()

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  if (isLoading) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm animate-pulse h-24" />
    )
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm">
      <h3 className="text-white/60 text-xs uppercase mb-2">Nợ cần trả</h3>
      <p className="text-white text-xl font-bold tabular-nums">{fmt(totalDebt)}</p>
      {nextPayment && (
        <div className="mt-2 text-xs text-white/40">
          <span>Tiếp theo: {fmt(nextPayment.minimum_payment || 0)}</span>
          {nextPayment.due_date && (
            <span className="ml-2">({new Date(nextPayment.due_date).toLocaleDateString('vi-VN')})</span>
          )}
        </div>
      )}
    </div>
  )
}
