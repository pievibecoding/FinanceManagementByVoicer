import { createFileRoute } from '@tanstack/react-router'
import { useSavings } from '@/hooks/useSavings'
import type { Savings } from '@/types'

export const Route = createFileRoute('/_authenticated/savings/')({
  component: SavingsPage,
})

function SavingsPage() {
  const { savings, isLoading, isError } = useSavings()

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Mục tiêu tiết kiệm</h1>
        <div className="text-white/40 text-sm">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Mục tiêu tiết kiệm</h1>
        <div className="bg-[#dd9787]/10 border border-[#dd9787]/30 rounded-xl p-4 text-[#dd9787] text-sm">
          Không thể tải dữ liệu. Kiểm tra kết nối backend.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Mục tiêu tiết kiệm</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savings.length === 0 ? (
          <div className="col-span-full text-center text-white/40 py-8">
            Chưa có mục tiêu tiết kiệm nào
          </div>
        ) : (
          savings.map((s: Savings) => {
            const progress = (s.current_balance / s.target_amount) * 100
            return (
              <div key={s.savings_id} className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4">
                <h3 className="text-white font-semibold mb-2">{s.name}</h3>
                {s.category && <p className="text-white/60 text-sm mb-3">{s.category}</p>}
                
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/60 mb-1">
                    <span>Tiến độ</span>
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-[#74d3ae] h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Đã tiết kiệm:</span>
                    <span className="text-white font-medium">{fmt(s.current_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Mục tiêu:</span>
                    <span className="text-white">{fmt(s.target_amount)}</span>
                  </div>
                  {s.target_date && (
                    <div className="flex justify-between">
                      <span className="text-white/60">Ngày mục tiêu:</span>
                      <span className="text-white/70">{new Date(s.target_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className={`px-2 py-1 rounded text-xs ${
                    s.status === 'active' ? 'bg-[#74d3ae]/20 text-[#74d3ae]' :
                    s.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-[#dd9787]/20 text-[#dd9787]'
                  }`}>
                    {s.status === 'active' ? 'Đang thực hiện' :
                     s.status === 'completed' ? 'Đã hoàn thành' : 'Tạm dừng'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
