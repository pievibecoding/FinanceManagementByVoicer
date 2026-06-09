import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle } from 'lucide-react'
import {
  useSavings,
  useCreateSavings,
  useUpdateSavings,
  useDeleteSavings,
  useSavingsContributions,
  useCreateContribution,
  useDeleteContribution,
} from '@/hooks/useSavings'
import type { SavingsGoal, SavingsContribution } from '@/api/savings'

export const Route = createFileRoute('/_authenticated/savings/')({
  component: SavingsPage,
})

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(goal: SavingsGoal): boolean {
  if (!goal.target_date || goal.status === 'completed') return false
  return new Date(goal.target_date) < new Date()
}

function progressColor(pct: number, status: string): string {
  if (status === 'completed') return 'bg-emerald-400'
  if (pct >= 80) return 'bg-amber-400'
  return 'bg-primary'
}

// ── Savings form modal ───────────────────────────────────────────────────────

interface SavingsFormModalProps {
  goal?: SavingsGoal
  onClose: () => void
}

function SavingsFormModal({ goal, onClose }: SavingsFormModalProps) {
  const isEdit = !!goal
  const createSavings = useCreateSavings()
  const updateSavings = useUpdateSavings()

  const [name, setName] = useState(goal?.name ?? '')
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.target_amount) : '')
  const [currentBalance, setCurrentBalance] = useState(goal ? String(goal.current_balance) : '0')
  const [targetDate, setTargetDate] = useState(goal?.target_date?.slice(0, 10) ?? '')
  const [note, setNote] = useState(goal?.note ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Tên quỹ là bắt buộc')
    const targetNum = parseInt(targetAmount.replace(/\D/g, ''), 10)
    if (isNaN(targetNum) || targetNum <= 0) return setError('Mục tiêu phải > 0')

    try {
      if (isEdit && goal) {
        await updateSavings.mutateAsync({
          savingsId: goal.savings_id,
          data: {
            name: name.trim(),
            target_amount: targetNum,
            current_balance: parseInt(currentBalance.replace(/\D/g, ''), 10) || 0,
            target_date: targetDate || null,
            note: note.trim() || null,
          },
        })
      } else {
        await createSavings.mutateAsync({
          name: name.trim(),
          target_amount: targetNum,
          current_balance: parseInt(currentBalance.replace(/\D/g, ''), 10) || 0,
          target_date: targetDate || null,
          note: note.trim() || null,
        })
      }
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Đã xảy ra lỗi')
    }
  }

  const isPending = createSavings.isPending || updateSavings.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-foreground font-semibold text-lg mb-4">{isEdit ? 'Sửa quỹ tiết kiệm' : 'Tạo quỹ tiết kiệm'}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Tên quỹ *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Vd: Quỹ mua nhà, Quỹ du lịch Nhật" autoFocus
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">Mục tiêu (đ) *</label>
              <input value={targetAmount} onChange={e => setTargetAmount(e.target.value)} type="number" min="1" placeholder="500000000"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-sm block mb-1">Đã có (đ)</label>
              <input value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} type="number" min="0"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Ngày mục tiêu</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Ghi chú</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground font-medium py-2 rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-all">
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Tạo quỹ'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Contribution modal ───────────────────────────────────────────────────────

interface ContributionModalProps {
  goal: SavingsGoal
  onClose: () => void
}

function ContributionModal({ goal, onClose }: ContributionModalProps) {
  const createContribution = useCreateContribution()
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayStr())
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (isNaN(amountNum) || amountNum <= 0) return setError('Số tiền phải > 0')
    try {
      await createContribution.mutateAsync({
        savingsId: goal.savings_id,
        data: { amount: amountNum, contribution_date: `${date} 00:00:00` },
      })
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Đã xảy ra lỗi')
    }
  }

  const remaining = goal.target_amount - goal.current_balance

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-foreground font-semibold text-lg mb-1">Nạp tiền vào quỹ</h2>
        <p className="text-muted-foreground text-sm mb-4">{goal.name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Số tiền (đ) *</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder="Vd: 500000" autoFocus
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            {remaining > 0 && <p className="text-muted-foreground/60 text-xs mt-1">Còn thiếu: {fmt(remaining)}</p>}
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">Ngày nạp</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={createContribution.isPending}
              className="flex-1 bg-primary text-primary-foreground font-medium py-2 rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-all">
              {createContribution.isPending ? 'Đang lưu...' : 'Xác nhận'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">Hủy</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Contributions history modal ──────────────────────────────────────────────

interface ContributionsHistoryModalProps {
  goal: SavingsGoal
  onClose: () => void
}

function ContributionsHistoryModal({ goal, onClose }: ContributionsHistoryModalProps) {
  const { data: contributions = [], isLoading } = useSavingsContributions(goal.savings_id)
  const deleteContribution = useDeleteContribution()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-foreground font-semibold text-lg">Lịch sử nạp tiền</h2>
            <p className="text-muted-foreground text-sm">{goal.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading && <p className="text-muted-foreground text-sm">Đang tải...</p>}
          {!isLoading && contributions.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Chưa có lần nạp tiền nào</p>}
          {contributions.map((c: SavingsContribution) => (
            <div key={c.contribution_id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <div>
                <p className="text-foreground font-medium text-sm">{fmt(c.amount)}</p>
                <p className="text-muted-foreground text-xs">{c.contribution_date?.slice(0, 10)}</p>
              </div>
              <button
                onClick={() => deleteContribution.mutate({ savingsId: goal.savings_id, contributionId: c.contribution_id })}
                className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                title="Xóa lần nạp tiền"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Goal card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: SavingsGoal
  onEdit: (g: SavingsGoal) => void
  onDelete: (g: SavingsGoal) => void
  onContribute: (g: SavingsGoal) => void
  onHistory: (g: SavingsGoal) => void
}

function GoalCard({ goal, onEdit, onDelete, onContribute, onHistory }: GoalCardProps) {
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_balance / goal.target_amount) * 100) : 0
  const overdue = isOverdue(goal)

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground font-medium truncate">{goal.name}</p>
          {goal.note && <p className="text-muted-foreground text-xs mt-0.5 truncate">{goal.note}</p>}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {goal.status === 'completed' && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-400/20 text-emerald-400">Hoàn thành</span>}
          {goal.status === 'cancelled' && <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">Đã hủy</span>}
          {overdue && goal.status === 'active' && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-destructive/20 text-destructive">
              <AlertTriangle className="w-3 h-3" /> Chậm tiến độ
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmt(goal.current_balance)}</span>
          <span className="font-medium">{pct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-border/40 rounded-full h-2">
          <div className={`h-2 rounded-full transition-all ${progressColor(pct, goal.status)}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mục tiêu: {fmt(goal.target_amount)}</span>
          {goal.target_date && <span>{goal.target_date.slice(0, 10)}</span>}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {goal.status !== 'completed' && goal.status !== 'cancelled' && (
          <button onClick={() => onContribute(goal)} className="flex items-center gap-1.5 text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 rounded-lg px-2.5 py-1.5 transition-all">
            <PiggyBank className="w-3.5 h-3.5" /> Nạp tiền
          </button>
        )}
        <button onClick={() => onHistory(goal)} className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border hover:bg-muted/30 rounded-lg px-2.5 py-1.5 transition-all">
          Lịch sử
        </button>
        <button onClick={() => onEdit(goal)} className="ml-auto text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/30 transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(goal)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Delete confirm ───────────────────────────────────────────────────────────

function DeleteGoalConfirm({ goal, onClose }: { goal: SavingsGoal; onClose: () => void }) {
  const deleteSavings = useDeleteSavings()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-foreground font-semibold mb-2">Xóa quỹ tiết kiệm?</h2>
        <p className="text-muted-foreground text-sm mb-4">Quỹ <strong className="text-foreground">"{goal.name}"</strong> và toàn bộ lịch sử nạp tiền sẽ bị xóa vĩnh viễn.</p>
        {deleteSavings.error && <p className="text-destructive text-sm mb-2">{(deleteSavings.error as Error).message}</p>}
        <div className="flex gap-3">
          <button onClick={() => deleteSavings.mutate(goal.savings_id, { onSuccess: onClose })} disabled={deleteSavings.isPending}
            className="flex-1 bg-destructive text-white font-medium py-2 rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-all">
            {deleteSavings.isPending ? 'Đang xóa...' : 'Xóa'}
          </button>
          <button onClick={onClose} className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">Hủy</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

function SavingsPage() {
  const { savings, isLoading, isError, totalSaved } = useSavings()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null)
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null)
  const [historyGoal, setHistoryGoal] = useState<SavingsGoal | null>(null)

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4 text-foreground">Mục tiêu tiết kiệm</h1>
        <div className="text-muted-foreground text-sm">Đang tải dữ liệu...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold mb-4 text-foreground">Mục tiêu tiết kiệm</h1>
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
          Không thể tải dữ liệu. Kiểm tra kết nối backend.
        </div>
      </div>
    )
  }

  const activeGoals = savings.filter(s => s.status === 'active')
  const completedGoals = savings.filter(s => s.status === 'completed')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Mục tiêu tiết kiệm</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-medium py-2 px-4 rounded-[var(--radius)] hover:bg-primary/80 transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo quỹ mới
        </button>
      </div>

      {/* Summary */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
        <PiggyBank className="w-8 h-8 text-primary shrink-0" />
        <div>
          <p className="text-muted-foreground text-xs">Tổng đã tiết kiệm</p>
          <p className="text-primary text-2xl font-bold">{fmt(totalSaved)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-muted-foreground text-xs">{activeGoals.length} quỹ đang hoạt động</p>
          <p className="text-muted-foreground text-xs">{completedGoals.length} quỹ hoàn thành</p>
        </div>
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 && (
        <div>
          <h2 className="text-foreground/80 font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Đang thực hiện ({activeGoals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeGoals.map(g => (
              <GoalCard key={g.savings_id} goal={g} onEdit={setEditingGoal} onDelete={setDeletingGoal} onContribute={setContributingGoal} onHistory={setHistoryGoal} />
            ))}
          </div>
        </div>
      )}

      {/* Completed goals */}
      {completedGoals.length > 0 && (
        <div>
          <h2 className="text-foreground/80 font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Đã hoàn thành ({completedGoals.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {completedGoals.map(g => (
              <GoalCard key={g.savings_id} goal={g} onEdit={setEditingGoal} onDelete={setDeletingGoal} onContribute={setContributingGoal} onHistory={setHistoryGoal} />
            ))}
          </div>
        </div>
      )}

      {savings.length === 0 && (
        <div className="text-center py-16 text-muted-foreground/50">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có quỹ tiết kiệm nào. Tạo quỹ đầu tiên của bạn!</p>
        </div>
      )}

      {showAddModal && <SavingsFormModal onClose={() => setShowAddModal(false)} />}
      {editingGoal && <SavingsFormModal goal={editingGoal} onClose={() => setEditingGoal(null)} />}
      {deletingGoal && <DeleteGoalConfirm goal={deletingGoal} onClose={() => setDeletingGoal(null)} />}
      {contributingGoal && <ContributionModal goal={contributingGoal} onClose={() => setContributingGoal(null)} />}
      {historyGoal && <ContributionsHistoryModal goal={historyGoal} onClose={() => setHistoryGoal(null)} />}
    </div>
  )
}
