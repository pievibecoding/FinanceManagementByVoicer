import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, X, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { debtsApi } from '@/api/debts'
import { savingsApi } from '@/api/savings'
import type { Debt } from '@/api/debts'
import type { SavingsGoal } from '@/api/savings'

interface ParsedData {
  valid: boolean
  rejection_reason?: string
  operation_type?: string
  amount: number
  type?: string
  category?: string
  account?: string
  account_is_new?: boolean
  note?: string
  transaction_date?: string
  payee_name?: string
  location?: string
  debt_name?: string
  debt_type?: string
  lender?: string
  debtor?: string
  savings_name?: string
  target_amount?: number
}

interface ChatEntry {
  id: string
  text: string
  parsed?: ParsedData
  confirmed?: boolean
  rejected?: boolean
  error?: string
}

// Popup to manually pick which debt to link a payment to
interface DebtPickerPopupProps {
  debts: Debt[]
  amount: number
  paymentDate: string
  onSelect: (debt: Debt) => void
  onCancel: () => void
}

function DebtPickerPopup({ debts, amount, paymentDate, onSelect, onCancel }: DebtPickerPopupProps) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-popover border border-border rounded-xl p-4 w-full max-w-sm mx-4 mb-4 sm:mb-0 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-foreground font-semibold text-sm">Chọn khoản nợ để ghi nhận</p>
            <p className="text-muted-foreground text-xs mt-0.5">Thanh toán: <span className="text-primary">{fmt(amount)}</span></p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {debts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Không có khoản nợ đang hoạt động</p>
          ) : (
            debts.map(debt => (
              <button
                key={debt.debt_id}
                onClick={() => onSelect(debt)}
                className="w-full text-left bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/40 rounded-lg p-3 transition-all"
              >
                <div className="flex items-center justify-between">
                  <p className="text-foreground text-sm font-medium truncate">{debt.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                    debt.debt_type === 'debt'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {debt.debt_type === 'debt' ? 'Tôi nợ' : 'Nợ tôi'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {debt.lender && <span>👤 {debt.lender}</span>}
                  {debt.debtor && <span>👤 {debt.debtor}</span>}
                  <span className="ml-auto">Còn: {fmt(debt.outstanding_balance)}</span>
                </div>
              </button>
            ))
          )}
        </div>
        <button onClick={onCancel} className="mt-3 w-full text-muted-foreground text-xs border border-border rounded-lg py-2 hover:bg-muted/30 transition-all">
          Hủy
        </button>
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Ăn trưa 45k momo',
  'Cà phê 30k tiền mặt',
  'Tôi vay Hiền 500k',
  'Để dành 200k quỹ du lịch',
  'Cho Nam mượn 1 củ',
]

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + 'đ'

const TYPE_LABEL: Record<string, string> = {
  income: 'Thu nhập',
  expense: 'Chi tiêu',
  investment: 'Đầu tư',
}

const TYPE_COLOR: Record<string, string> = {
  income: 'text-primary',
  expense: 'text-destructive',
  investment: 'text-sky-400',
}

// Popup to manually pick which savings goal to contribute to
interface SavingsPickerPopupProps {
  savings: SavingsGoal[]
  amount: number
  contributionDate: string
  onSelect: (goal: SavingsGoal) => void
  onCancel: () => void
}

function SavingsPickerPopup({ savings, amount, contributionDate, onSelect, onCancel }: SavingsPickerPopupProps) {
  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-popover border border-border rounded-xl p-4 w-full max-w-sm mx-4 mb-4 sm:mb-0 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-foreground font-semibold text-sm">Chọn quỹ tiết kiệm</p>
            <p className="text-muted-foreground text-xs mt-0.5">Nạp: <span className="text-primary">{fmt(amount)}</span></p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {savings.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Không có quỹ nào đang hoạt động</p>
          ) : (
            savings.map(goal => {
              const pct = goal.target_amount > 0
                ? Math.min(100, (goal.current_balance / goal.target_amount) * 100)
                : 0
              return (
                <button
                  key={goal.savings_id}
                  onClick={() => onSelect(goal)}
                  className="w-full text-left bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/40 rounded-lg p-3 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-foreground text-sm font-medium truncate">{goal.name}</p>
                    <span className="text-[10px] text-primary ml-2 shrink-0">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-border/40 rounded-full h-1 mb-1.5">
                    <div className="bg-primary h-1 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmt(goal.current_balance)}</span>
                    <span>/ {fmt(goal.target_amount)}</span>
                  </div>
                </button>
              )
            })
          )}
        </div>
        <button onClick={onCancel} className="mt-3 w-full text-muted-foreground text-xs border border-border rounded-lg py-2 hover:bg-muted/30 transition-all">
          Hủy
        </button>
      </div>
    </div>
  )
}

export function AIChatWidget() {  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [micError, setMicError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Debt picker state — shown when debt_payment has no auto-match
  const [debtPickerState, setDebtPickerState] = useState<{
    entryId: string
    debts: Debt[]
    amount: number
    paymentDate: string
  } | null>(null)

  // Savings picker state — shown when savings_contribution has no auto-match
  const [savingsPickerState, setSavingsPickerState] = useState<{
    entryId: string
    savings: SavingsGoal[]
    amount: number
    contributionDate: string
  } | null>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // ── Submit text ──────────────────────────────────────────────────────────
  const handleSubmit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setInput('')
    setLoading(true)

    const token = localStorage.getItem('finance_auth_token') ?? ''
    const now = new Date()
    const localTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

    const entryId = `e-${Date.now()}`
    setEntries(prev => [...prev, { id: `u-${entryId}`, text: trimmed }])

    try {
      const res = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: trimmed, localTime }),
      })

      if (res.status === 422) {
        const body = await res.json().catch(() => ({}))
        setEntries(prev => [...prev, { id: entryId, text: trimmed, error: body.error ?? 'Không phải giao dịch tài chính.' }])
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Lỗi ${res.status}`)
      }

      const parsed: ParsedData = await res.json()
      setEntries(prev => [...prev, { id: entryId, text: trimmed, parsed }])
    } catch (err: any) {
      setEntries(prev => [...prev, { id: entryId, text: trimmed, error: err.message ?? 'Lỗi kết nối.' }])
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm an entry ─────────────────────────────────────────────────────
  const confirmEntry = async (id: string, parsed: ParsedData) => {
    const opType = parsed.operation_type ?? 'transaction'

    try {
      if (opType === 'new_debt') {
        await debtsApi.createDebt({
          name: parsed.debt_name || parsed.note || 'Khoản nợ mới',
          debt_type: (parsed.debt_type as 'debt' | 'loan') ?? 'debt',
          lender: parsed.lender || null,
          debtor: parsed.debtor || null,
          principal: parsed.amount,
          note: parsed.note || null,
        })
        queryClient.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
      } else if (opType === 'debt_payment') {
        const debts = await debtsApi.getDebts()
        const counterpartyName = (parsed.lender || parsed.debtor || '').toLowerCase()
        const debtName = (parsed.debt_name || '').toLowerCase()
        const activeDebts = debts.filter(d => d.status === 'active')

        // Smart matching using debt_type:
        // "tôi trả [X]" → AI sets lender=X → we owe X → debt_type='debt', lender matches X
        // "[X] trả tôi" → AI sets debtor=X → X owes us → debt_type='loan', debtor matches X
        const isPayingOut = !!parsed.lender  // tôi trả cho lender
        const matched = activeDebts.find(d => {
          if (debtName && d.name.toLowerCase().includes(debtName)) return true
          if (isPayingOut) {
            // I'm paying out → I owe someone → debt_type='debt', match lender
            return d.debt_type === 'debt' &&
              counterpartyName &&
              (d.lender ?? '').toLowerCase().includes(counterpartyName)
          } else {
            // Someone paying me → they owe me → debt_type='loan', match debtor
            return d.debt_type === 'loan' &&
              counterpartyName &&
              (d.debtor ?? '').toLowerCase().includes(counterpartyName)
          }
        })
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`
        const paymentDate = parsed.transaction_date || dateStr

        if (matched) {
          await debtsApi.createPayment(matched.debt_id, {
            amount_paid: parsed.amount,
            payment_date: paymentDate,
          })
          queryClient.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
        } else {
          // No auto-match — show picker for user to select manually
          // Don't mark as confirmed yet; wait for picker selection
          setDebtPickerState({ entryId: id, debts: activeDebts, amount: parsed.amount, paymentDate })
          return // exit early — confirmed will be set after picker
        }
      } else if (opType === 'new_savings') {
        await savingsApi.createSavings({
          name: parsed.savings_name || parsed.note || 'Quỹ tiết kiệm',
          target_amount: parsed.target_amount || parsed.amount,
          note: parsed.note || null,
        })
        queryClient.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
      } else if (opType === 'savings_contribution') {
        const savingsList = await savingsApi.getSavings()
        const nameQuery = (parsed.savings_name || '').toLowerCase()
        const activeSavings = savingsList.filter(s => s.status === 'active')

        // Multi-level match: exact → partial → word overlap
        const findMatch = () => {
          if (!nameQuery) return null
          // 1. savings name contains query or query contains savings name
          const direct = activeSavings.find(s =>
            s.name.toLowerCase().includes(nameQuery) ||
            nameQuery.includes(s.name.toLowerCase())
          )
          if (direct) return direct
          // 2. Word overlap — split both into words and find common words
          const queryWords = nameQuery.split(/\s+/).filter(w => w.length > 1)
          return activeSavings.find(s => {
            const nameWords = s.name.toLowerCase().split(/\s+/)
            return queryWords.some(qw => nameWords.some(nw => nw.includes(qw) || qw.includes(nw)))
          }) ?? null
        }

        const matched = findMatch()
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`

        if (matched) {
          await savingsApi.createContribution(matched.savings_id, {
            amount: parsed.amount,
            contribution_date: parsed.transaction_date || dateStr,
          })
          queryClient.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
        } else {
          // No match → show savings picker
          setSavingsPickerState({ entryId: id, savings: activeSavings, amount: parsed.amount, contributionDate: parsed.transaction_date || dateStr })
          return
        }
      } else {
        // For transaction type, server already saved it — just invalidate
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      }
    } catch {
      // Best-effort: still mark as confirmed
    }

    setEntries(prev => prev.map(e => e.id === id ? { ...e, confirmed: true } : e))
  }

  const rejectEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, rejected: true } : e))
  }

  // ── Microphone ────────────────────────────────────────────────────────────
  const handleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setMicError('Trình duyệt không hỗ trợ microphone.'); return }

    if (listening) {
      recognitionRef.current?._stop?.()
      return
    }

    setMicError(null)
    setListening(true)
    setInterim('')

    const rec = new SR()
    rec.lang = 'vi-VN'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    let finalAccumulated = ''

    rec.onresult = (e: any) => {
      let inter = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalAccumulated += t + ' '
        else inter += t
      }
      setInterim(inter || finalAccumulated.trim())
    }

    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed') setMicError('Không có quyền microphone.')
      recognitionRef.current = null
      setListening(false)
      setInterim('')
    }

    rec.onend = () => {
      recognitionRef.current = null
      setListening(false)
      setInterim('')
      const text = finalAccumulated.trim()
      if (text) handleSubmit(text)
    }

    ;(rec as any)._stop = () => {
      recognitionRef.current = null
      rec.stop()
    }

    recognitionRef.current = rec
    rec.start()
  }

  // ── Render parsed card ────────────────────────────────────────────────────
  const renderParsedCard = (entry: ChatEntry) => {
    if (!entry.parsed) return null
    const p = entry.parsed
    const opType = p.operation_type ?? 'transaction'

    const cardContent = () => {
      if (opType === 'new_debt') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.debt_type === 'debt' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                {p.debt_type === 'debt' ? 'Tôi nợ' : 'Người nợ tôi'}
              </span>
              <span className="font-bold text-base text-foreground">{fmt(p.amount)}</span>
            </div>
            {p.lender && <p>👤 Người cho vay: {p.lender}</p>}
            {p.debtor && <p>👤 Người vay: {p.debtor}</p>}
            {p.debt_name && <p>📋 {p.debt_name}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      if (opType === 'debt_payment') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">Thanh toán khoản nợ</p>
            <p className="text-primary text-base font-bold">{fmt(p.amount)}</p>
            {p.lender && <p>👤 Cho: {p.lender}</p>}
            {p.debt_name && <p>📋 {p.debt_name}</p>}
          </div>
        )
      }
      if (opType === 'new_savings') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">Tạo quỹ tiết kiệm mới</p>
            {p.savings_name && <p>🐷 {p.savings_name}</p>}
            {p.target_amount ? <p>🎯 Mục tiêu: {fmt(p.target_amount)}</p> : <p>💰 {fmt(p.amount)}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      if (opType === 'savings_contribution') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">Nạp tiền vào quỹ</p>
            <p className="text-primary text-base font-bold">{fmt(p.amount)}</p>
            {p.savings_name && <p>🐷 Quỹ: {p.savings_name}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      // Default: transaction
      return (
        <div className="text-muted-foreground space-y-0.5 text-xs">
          <div className="flex items-center justify-between">
            <span className={`font-bold text-base tabular-nums ${TYPE_COLOR[p.type ?? '']}`}>{fmt(p.amount)}</span>
            <span className={`text-[10px] font-medium ${TYPE_COLOR[p.type ?? '']}`}>{TYPE_LABEL[p.type ?? '']}</span>
          </div>
          <p>🏷 {p.category} &nbsp;·&nbsp; 💳 {p.account}</p>
          {p.note && <p>📝 {p.note}</p>}
          {p.location && <p>📍 {p.location}</p>}
          <p className="text-muted-foreground/50">{p.transaction_date}</p>
          {p.account_is_new && <p className="text-amber-400">🆕 Tài khoản mới đã được tạo</p>}
        </div>
      )
    }

    return (
      <div
        key={entry.id}
        className={`rounded-xl border px-3 py-2.5 text-xs space-y-1.5 transition-all ${
          entry.confirmed
            ? 'border-primary/30 bg-primary/5 opacity-60'
            : entry.rejected
            ? 'border-border/50 bg-muted/20 opacity-40'
            : 'border-border bg-card'
        }`}
      >
        {cardContent()}
        {!entry.confirmed && !entry.rejected && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => confirmEntry(entry.id, p)}
              className="flex items-center gap-1 text-primary border border-primary/40 hover:bg-primary/10 rounded-lg px-2.5 py-1 transition-all text-[11px] font-medium"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Xác nhận
            </button>
            <button
              onClick={() => rejectEntry(entry.id)}
              className="flex items-center gap-1 text-muted-foreground border border-border hover:bg-muted/30 rounded-lg px-2.5 py-1 transition-all text-[11px]"
            >
              <XCircle className="w-3.5 h-3.5" /> Hủy
            </button>
          </div>
        )}
        {entry.confirmed && (
          <p className="text-primary text-[11px] flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Đã lưu
          </p>
        )}
        {entry.rejected && <p className="text-muted-foreground/50 text-[11px]">Đã hủy</p>}
      </div>
    )
  }

  // ── Debt picker handler ───────────────────────────────────────────────────
  const handleDebtPickerSelect = async (debt: Debt) => {
    if (!debtPickerState) return
    const { entryId, amount, paymentDate } = debtPickerState
    setDebtPickerState(null)
    try {
      await debtsApi.createPayment(debt.debt_id, {
        amount_paid: amount,
        payment_date: paymentDate,
      })
      queryClient.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, confirmed: true } : e))
    } catch {
      // silently fail — user can retry from /debts page
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, rejected: true } : e))
    }
  }

  // ── Savings picker handler ────────────────────────────────────────────────
  const handleSavingsPickerSelect = async (goal: SavingsGoal) => {
    if (!savingsPickerState) return
    const { entryId, amount, contributionDate } = savingsPickerState
    setSavingsPickerState(null)
    try {
      await savingsApi.createContribution(goal.savings_id, {
        amount,
        contribution_date: contributionDate,
      })
      queryClient.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, confirmed: true } : e))
    } catch {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, rejected: true } : e))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Debt picker popup — rendered outside the chat panel so it covers full screen */}
      {debtPickerState && (
        <DebtPickerPopup
          debts={debtPickerState.debts}
          amount={debtPickerState.amount}
          paymentDate={debtPickerState.paymentDate}
          onSelect={handleDebtPickerSelect}
          onCancel={() => {
            setDebtPickerState(null)
            // mark entry as rejected so user knows nothing was saved
            setEntries(prev => prev.map(e =>
              e.id === debtPickerState.entryId ? { ...e, rejected: true } : e
            ))
          }}
        />
      )}

      {/* Savings picker popup */}
      {savingsPickerState && (
        <SavingsPickerPopup
          savings={savingsPickerState.savings}
          amount={savingsPickerState.amount}
          contributionDate={savingsPickerState.contributionDate}
          onSelect={handleSavingsPickerSelect}
          onCancel={() => {
            setSavingsPickerState(null)
            setEntries(prev => prev.map(e =>
              e.id === savingsPickerState.entryId ? { ...e, rejected: true } : e
            ))
          }}
        />
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-popover border border-border rotate-45'
            : 'bg-gradient-to-br from-primary to-[#5c0099] hover:scale-110'
        }`}
        title="AI Transaction Parser"
      >
        {open ? (
          <X className="w-5 h-5 text-foreground" />
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-primary-foreground" />
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/30 pointer-events-none" />
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-border bg-popover/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">AI Nhập giao dịch</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">Gemini</span>
          </div>

          {/* Entries */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {entries.length === 0 && (
              <p className="text-muted-foreground/60 text-xs text-center pt-4">
                Nhập hoặc nói mô tả giao dịch của bạn...
              </p>
            )}
            {entries.map(e => {
              if (e.id.startsWith('u-')) {
                return (
                  <div key={e.id} className="flex justify-end">
                    <span className="bg-primary/15 text-foreground text-xs px-3 py-1.5 rounded-xl max-w-[80%]">
                      {e.text}
                    </span>
                  </div>
                )
              }
              if (e.error) {
                return (
                  <div key={e.id} className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                    💬 {e.error}
                  </div>
                )
              }
              if (e.parsed) return renderParsedCard(e)
              return null
            })}

            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs px-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang phân tích...
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="px-3 pb-1 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="shrink-0 text-[10px] text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground rounded-full px-2.5 py-1 transition-all whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input bar */}
          <div className="px-3 pb-3 shrink-0">
            {micError && <p className="text-destructive text-[10px] mb-1 px-1">{micError}</p>}
            {interim && <p className="text-muted-foreground text-xs italic px-1 mb-1">🎤 {interim}</p>}
            <div className="flex items-center gap-2 bg-input border border-border rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(input)}
                placeholder="Ăn trưa 45k momo..."
                className="flex-1 bg-transparent text-foreground text-xs placeholder-muted-foreground/50 outline-none"
                disabled={loading || listening}
              />
              <button
                onClick={handleMic}
                className={`p-1 rounded-lg transition-all ${
                  listening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={listening ? 'Bấm để dừng và gửi' : 'Bấm để nói'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || loading}
                className="p-1 rounded-lg text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
