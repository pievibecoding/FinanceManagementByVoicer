import { createFileRoute } from '@tanstack/react-router'
import { useDebts } from '@/hooks/useDebts'
import type { Debt } from '@/types'

export const Route = createFileRoute('/_authenticated/debts/')({
  component: DebtsPage,
})

function DebtsPage() {
  const { debts, isLoading, isError } = useDebts()

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Quản lý nợ</h1>
        <div className="text-white/40 text-sm">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4 text-white">Quản lý nợ</h1>
        <div className="bg-[#dd9787]/10 border border-[#dd9787]/30 rounded-xl p-4 text-[#dd9787] text-sm">
          Không thể tải dữ liệu. Kiểm tra kết nối backend.
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-white">Quản lý nợ</h1>
      
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th className="text-left text-white/60 text-xs uppercase px-4 py-3">Tên</th>
              <th className="text-left text-white/60 text-xs uppercase px-4 py-3">Loại</th>
              <th className="text-right text-white/60 text-xs uppercase px-4 py-3">Số nợ còn lại</th>
              <th className="text-right text-white/60 text-xs uppercase px-4 py-3">Lãi suất</th>
              <th className="text-right text-white/60 text-xs uppercase px-4 py-3">Trả tối thiểu</th>
              <th className="text-left text-white/60 text-xs uppercase px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {debts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-white/40 py-8">
                  Chưa có khoản nợ nào
                </td>
              </tr>
            ) : (
              debts.map((debt: Debt) => (
                <tr key={debt.debt_id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-white">{debt.name}</td>
                  <td className="px-4 py-3 text-white/70">{debt.debt_type}</td>
                  <td className="px-4 py-3 text-right text-white font-medium">{fmt(debt.outstanding_balance)}</td>
                  <td className="px-4 py-3 text-right text-white/70">
                    {debt.interest_rate ? `${debt.interest_rate}%` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-white/70">
                    {debt.minimum_payment ? fmt(debt.minimum_payment) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      debt.status === 'active' ? 'bg-[#74d3ae]/20 text-[#74d3ae]' :
                      debt.status === 'paid_off' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-[#dd9787]/20 text-[#dd9787]'
                    }`}>
                      {debt.status === 'active' ? 'Đang trả' :
                       debt.status === 'paid_off' ? 'Đã trả xong' : 'Mặc định'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
