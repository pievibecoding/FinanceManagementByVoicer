import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, X, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface ParsedTransaction {
  amount: number
  type: 'income' | 'expense' | 'investment'
  category: string
  account: string
  note: string
  transaction_date: string
  location?: string
  account_is_new?: boolean
}

interface ChatEntry {
  id: string
  text: string
  parsed?: ParsedTransaction
  confirmed?: boolean
  rejected?: boolean
  error?: string
}

const SUGGESTIONS = [
  'Ăn trưa 45k momo',
  'Cà phê 30k tiền mặt',
  'Grab 25k vcb',
  'Lương tháng 12 củ',
  'Điện nước 500k',
]

const fmt = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(n) + 'đ'

const TYPE_LABEL: Record<string, string> = {
  income: 'Thu nhập',
  expense: 'Chi tiêu',
  investment: 'Đầu tư',
}

const TYPE_COLOR: Record<string, string> = {
  income: 'text-[#74d3ae]',
  expense: 'text-[#dd9787]',
  investment: 'text-sky-400',
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [micError, setMicError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // Focus input when panel opens
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
    // Show user message immediately
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

      const parsed: ParsedTransaction = await res.json()
      setEntries(prev => [...prev, { id: entryId, text: trimmed, parsed }])
    } catch (err: any) {
      setEntries(prev => [...prev, { id: entryId, text: trimmed, error: err.message ?? 'Lỗi kết nối.' }])
    } finally {
      setLoading(false)
    }
  }

  const confirmEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, confirmed: true } : e))
    // Invalidate queries so dashboard refreshes
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
  }

  const rejectEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, rejected: true } : e))
  }

  // ── Microphone ────────────────────────────────────────────────────────────
  const handleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setMicError('Trình duyệt không hỗ trợ microphone.'); return }

    // If already listening → stop and submit whatever was captured
    if (listening) {
      recognitionRef.current?._stop?.()
      return
    }

    setMicError(null)
    setListening(true)
    setInterim('')

    const rec = new SR()
    rec.lang = 'vi-VN'
    rec.continuous = true      // keep recording until user taps mic again
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
      // onend fires after _stop() — submit accumulated text
      recognitionRef.current = null
      setListening(false)
      setInterim('')
      const text = finalAccumulated.trim()
      if (text) handleSubmit(text)
    }

    ;(rec as any)._stop = () => {
      recognitionRef.current = null
      rec.stop() // triggers onend → which submits
    }

    recognitionRef.current = rec
    rec.start()
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open
            ? 'bg-zinc-800 border border-white/20 rotate-45'
            : 'bg-gradient-to-br from-[#74d3ae] to-[#678d58] hover:scale-110'
        }`}
        title="AI Transaction Parser"
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <>
            <Sparkles className="w-6 h-6 text-white" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping bg-[#74d3ae]/30 pointer-events-none" />
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-h-[520px] flex flex-col rounded-2xl border border-white/12 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
            <Sparkles className="w-4 h-4 text-[#74d3ae]" />
            <span className="text-sm font-semibold text-white">AI Nhập giao dịch</span>
            <span className="ml-auto text-[10px] text-white/30 font-mono">Gemini</span>
          </div>

          {/* Entries */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {entries.length === 0 && (
              <p className="text-white/30 text-xs text-center pt-4">
                Nhập hoặc nói mô tả giao dịch của bạn...
              </p>
            )}
            {entries.map(e => {
              // User message row (odd entries starting with u-)
              if (e.id.startsWith('u-')) {
                return (
                  <div key={e.id} className="flex justify-end">
                    <span className="bg-[#74d3ae]/15 text-white text-xs px-3 py-1.5 rounded-xl max-w-[80%]">
                      {e.text}
                    </span>
                  </div>
                )
              }
              // Error
              if (e.error) {
                return (
                  <div key={e.id} className="text-xs text-[#dd9787] bg-[#dd9787]/10 rounded-xl px-3 py-2">
                    💬 {e.error}
                  </div>
                )
              }
              // Parsed card
              if (e.parsed) {
                const p = e.parsed
                return (
                  <div
                    key={e.id}
                    className={`rounded-xl border px-3 py-2.5 text-xs space-y-1.5 transition-all ${
                      e.confirmed
                        ? 'border-[#74d3ae]/30 bg-[#74d3ae]/5 opacity-60'
                        : e.rejected
                        ? 'border-white/10 bg-white/3 opacity-40'
                        : 'border-white/15 bg-white/6'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-base tabular-nums ${TYPE_COLOR[p.type]}`}>
                        {fmt(p.amount)}
                      </span>
                      <span className={`text-[10px] font-medium ${TYPE_COLOR[p.type]}`}>
                        {TYPE_LABEL[p.type]}
                      </span>
                    </div>
                    <div className="text-white/60 space-y-0.5">
                      <p>🏷 {p.category} &nbsp;·&nbsp; 💳 {p.account}</p>
                      {p.note && <p>📝 {p.note}</p>}
                      {p.location && <p>📍 {p.location}</p>}
                      <p className="text-white/30">{p.transaction_date}</p>
                      {p.account_is_new && (
                        <p className="text-amber-400">🆕 Tài khoản mới đã được tạo</p>
                      )}
                    </div>
                    {!e.confirmed && !e.rejected && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => confirmEntry(e.id)}
                          className="flex items-center gap-1 text-[#74d3ae] border border-[#74d3ae]/40 hover:bg-[#74d3ae]/10 rounded-lg px-2.5 py-1 transition-all text-[11px] font-medium"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Xác nhận
                        </button>
                        <button
                          onClick={() => rejectEntry(e.id)}
                          className="flex items-center gap-1 text-white/40 border border-white/10 hover:bg-white/5 rounded-lg px-2.5 py-1 transition-all text-[11px]"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Hủy
                        </button>
                      </div>
                    )}
                    {e.confirmed && (
                      <p className="text-[#74d3ae] text-[11px] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Đã lưu
                      </p>
                    )}
                    {e.rejected && (
                      <p className="text-white/30 text-[11px]">Đã hủy</p>
                    )}
                  </div>
                )
              }
              return null
            })}

            {loading && (
              <div className="flex items-center gap-2 text-white/40 text-xs px-1">
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
                  className="shrink-0 text-[10px] text-white/50 border border-white/10 hover:border-[#74d3ae]/50 hover:text-white rounded-full px-2.5 py-1 transition-all whitespace-nowrap"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Input bar */}
          <div className="px-3 pb-3 shrink-0">
            {micError && <p className="text-[#dd9787] text-[10px] mb-1 px-1">{micError}</p>}
            {interim && (
              <p className="text-white/40 text-xs italic px-1 mb-1">🎤 {interim}</p>
            )}
            <div className="flex items-center gap-2 bg-white/6 border border-white/12 rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(input)}
                placeholder="Ăn trưa 45k momo..."
                className="flex-1 bg-transparent text-white text-xs placeholder-white/30 outline-none"
                disabled={loading || listening}
              />
              <button
                onClick={handleMic}
                className={`p-1 rounded-lg transition-all ${
                  listening
                    ? 'text-[#dd9787] bg-[#dd9787]/10 animate-pulse'
                    : 'text-white/40 hover:text-white'
                }`}
                title={listening ? 'Bấm để dừng và gửi' : 'Bấm để nói'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || loading}
                className="p-1 rounded-lg text-[#74d3ae] hover:bg-[#74d3ae]/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
