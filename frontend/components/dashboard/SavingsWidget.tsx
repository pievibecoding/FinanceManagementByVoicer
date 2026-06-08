import { useSavings } from '@/hooks/useSavings'

export function SavingsWidget() {
  const { totalSaved, nearestGoal, isLoading } = useSavings()

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  if (isLoading) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm animate-pulse h-24" />
    )
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm">
      <h3 className="text-white/60 text-xs uppercase mb-2">Tiết kiệm</h3>
      <p className="text-white text-xl font-bold tabular-nums">{fmt(totalSaved)}</p>
      {nearestGoal && (
        <div className="mt-2 text-xs text-white/40">
          <span>Mục tiêu gần nhất: {nearestGoal.name}</span>
          {nearestGoal.target_date && (
            <span className="ml-2">({new Date(nearestGoal.target_date).toLocaleDateString('vi-VN')})</span>
          )}
        </div>
      )}
    </div>
  )
}
