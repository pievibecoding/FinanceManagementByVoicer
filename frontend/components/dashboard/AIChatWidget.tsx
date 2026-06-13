import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, X, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { debtsApi } from '@/api/debts'
import { savingsApi } from '@/api/savings'
import type { Debt } from '@/api/debts'
import { palette } from '@/styles/tokens'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useAddTransaction } from '@/hooks/useTransactions'
import { useSavings } from '@/hooks/useSavings'
import { STANDARD_TRANSACTION_TYPE_OPTIONS } from '@/lib/transaction-types'

interface ParsedData {
  valid: boolean
  rejection_reason?: string
  operation_type?: string
  debt_id?: number | null
  savings_id?: number | null
  amount: number
  type?: string
  category?: string
  category_id?: number | string | null
  account?: string
  account_id?: number | null
  account_is_new?: boolean
  note?: string
  transaction_date?: string
  payee_name?: string
  payee_id?: number | null
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
  draft?: AiDraftForm
  confirmed?: boolean
  rejected?: boolean
  error?: string
  saveError?: string
}

type AiDraftForm =
  | TransactionDraftForm
  | NewDebtDraftForm
  | DebtPaymentDraftForm
  | NewSavingsDraftForm
  | SavingsContributionDraftForm

interface TransactionDraftForm {
  kind: 'transaction'
  transaction_date: string
  transaction_time: string
  account_id: number | ''
  category_id: string
  amount: number | ''
  type: 'income' | 'expense'
  note: string
  location: string
  payee_id?: number | null
}

interface NewDebtDraftForm {
  kind: 'new_debt'
  debt_name: string
  debt_type: 'debt' | 'loan'
  lender: string
  debtor: string
  amount: number | ''
  account_id: number | ''
  note: string
}

interface DebtPaymentDraftForm {
  kind: 'debt_payment'
  debt_id: number | ''
  debt_name: string
  lender: string
  debtor: string
  amount: number | ''
  account_id: number | ''
  transaction_date: string
  transaction_time: string
  note: string
}

interface NewSavingsDraftForm {
  kind: 'new_savings'
  savings_name: string
  target_amount: number | ''
  note: string
}

interface SavingsContributionDraftForm {
  kind: 'savings_contribution'
  savings_id: number | ''
  savings_name: string
  amount: number | ''
  account_id: number | ''
  transaction_date: string
  transaction_time: string
  note: string
}

const SUGGESTION_KEYS = [
  'transactions.aiSuggestionLunch',
  'transactions.aiSuggestionCoffee',
  'transactions.aiSuggestionDebt',
  'transactions.aiSuggestionSavings',
  'transactions.aiSuggestionLoan',
]

const TYPE_LABEL: Record<string, string> = {
  income: 'types.income',
  expense: 'types.expense',
}

const TYPE_COLOR: Record<string, string> = {
  income: 'text-primary',
  expense: 'text-destructive',
}

function normalizeTransactionType(type: string | undefined) {
  return type === 'income' ? 'income' : 'expense'
}

function todayInputDate() {
  return new Date().toISOString().slice(0, 10)
}

function currentInputTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
}

function parsedDateToDraftDate(value: string | undefined) {
  return value?.slice(0, 10) || todayInputDate()
}

function parsedDateToDraftTime(value: string | undefined) {
  const time = value?.slice(11, 19)
  return time && /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : currentInputTime()
}

function normalizeDraftTime(value: string) {
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`
  return currentInputTime()
}

export function AIChatWidget() {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()
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
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { savings: savingsGoals = [] } = useSavings()
  const addTransaction = useAddTransaction()
  const [debtsForDrafts, setDebtsForDrafts] = useState<Debt[]>([])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    debtsApi.getDebts()
      .then(debts => {
        if (!cancelled) setDebtsForDrafts(debts)
      })
      .catch(() => {
        if (!cancelled) setDebtsForDrafts([])
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const resolveParsedAccountId = (parsed: ParsedData) => {
    if (parsed.account_id) return parsed.account_id
    const matchedAccount = accounts.find(
      account => account.account_name.toLowerCase() === (parsed.account || '').toLowerCase()
    )
    return matchedAccount?.account_id ?? ''
  }

  const activeSavingsGoals = savingsGoals.filter(goal => goal.status === 'active')

  const findSavingsGoalMatch = (name: string | undefined) => {
    const query = (name || '').trim().toLowerCase()
    if (!query) return null
    return activeSavingsGoals.find(goal =>
      goal.name.toLowerCase() === query ||
      goal.name.toLowerCase().includes(query) ||
      query.includes(goal.name.toLowerCase())
    ) ?? null
  }

  const activeDebtOptions = debtsForDrafts.filter(debt => debt.status === 'active' || debt.status === 'overdue')

  const findDebtMatch = (parsed: ParsedData) => {
    const counterpartyName = (parsed.lender || parsed.debtor || '').trim().toLowerCase()
    const debtName = (parsed.debt_name || '').trim().toLowerCase()
    const isPayingOut = Boolean(parsed.lender)

    return activeDebtOptions.find(debt => {
      if (debtName && (
        debt.name.toLowerCase() === debtName ||
        debt.name.toLowerCase().includes(debtName) ||
        debtName.includes(debt.name.toLowerCase())
      )) return true
      if (isPayingOut) {
        return debt.debt_type === 'debt' &&
          counterpartyName &&
          (debt.lender ?? '').toLowerCase().includes(counterpartyName)
      }
      return debt.debt_type === 'loan' &&
        counterpartyName &&
        (debt.debtor ?? '').toLowerCase().includes(counterpartyName)
    }) ?? null
  }

  useEffect(() => {
    if (activeDebtOptions.length === 0) return
    setEntries(prev => prev.map(entry => {
      if (!entry.parsed || !entry.draft || entry.draft.kind !== 'debt_payment' || entry.draft.debt_id) {
        return entry
      }
      const matchedDebt = findDebtMatch(entry.parsed)
      if (!matchedDebt) return entry
      return {
        ...entry,
        draft: {
          ...entry.draft,
          debt_id: matchedDebt.debt_id,
          debt_name: matchedDebt.name,
          lender: matchedDebt.lender ?? '',
          debtor: matchedDebt.debtor ?? '',
        },
      }
    }))
  }, [debtsForDrafts])

  const buildDraft = (parsed: ParsedData): AiDraftForm => {
    const opType = parsed.operation_type ?? 'transaction'
    if (opType === 'new_debt') {
      return {
        kind: 'new_debt',
        debt_name: parsed.debt_name || parsed.note || '',
        debt_type: parsed.debt_type === 'loan' ? 'loan' : 'debt',
        lender: parsed.lender || '',
        debtor: parsed.debtor || '',
        amount: parsed.amount || '',
        account_id: resolveParsedAccountId(parsed),
        note: parsed.note || '',
      }
    }
    if (opType === 'debt_payment') {
      const matchedDebt = findDebtMatch(parsed)
      return {
        kind: 'debt_payment',
        debt_id: parsed.debt_id ?? matchedDebt?.debt_id ?? '',
        debt_name: matchedDebt?.name ?? parsed.debt_name ?? '',
        lender: matchedDebt?.lender ?? parsed.lender ?? '',
        debtor: matchedDebt?.debtor ?? parsed.debtor ?? '',
        amount: parsed.amount || '',
        account_id: resolveParsedAccountId(parsed),
        transaction_date: parsedDateToDraftDate(parsed.transaction_date),
        transaction_time: parsedDateToDraftTime(parsed.transaction_date),
        note: parsed.note || '',
      }
    }
    if (opType === 'new_savings') {
      return {
        kind: 'new_savings',
        savings_name: parsed.savings_name || parsed.note || '',
        target_amount: parsed.target_amount || parsed.amount || '',
        note: parsed.note || '',
      }
    }
    if (opType === 'savings_contribution') {
      const matchedSavings = findSavingsGoalMatch(parsed.savings_name)
      return {
        kind: 'savings_contribution',
        savings_id: parsed.savings_id ?? matchedSavings?.savings_id ?? '',
        savings_name: matchedSavings?.name ?? parsed.savings_name ?? '',
        amount: parsed.amount || '',
        account_id: resolveParsedAccountId(parsed),
        transaction_date: parsedDateToDraftDate(parsed.transaction_date),
        transaction_time: parsedDateToDraftTime(parsed.transaction_date),
        note: parsed.note || '',
      }
    }

    const parsedType = normalizeTransactionType(parsed.type)
    const matchedAccount = accounts.find(
      account => account.account_name.toLowerCase() === (parsed.account || '').toLowerCase()
    )
    const matchedCategory = categories.find(
      category => category.category_name.toLowerCase() === (parsed.category || '').toLowerCase()
    )

    return {
      kind: 'transaction',
      transaction_date: parsedDateToDraftDate(parsed.transaction_date),
      transaction_time: parsedDateToDraftTime(parsed.transaction_date),
      account_id: parsed.account_id ?? matchedAccount?.account_id ?? '',
      category_id: parsed.category_id ? String(parsed.category_id) : matchedCategory?.category_id ?? '',
      amount: parsed.amount || '',
      type: parsedType,
      note: parsed.note || '',
      location: parsed.location || '',
      payee_id: parsed.payee_id ?? null,
    }
  }

  const validateDraft = (draft: AiDraftForm) => {
    if (draft.kind === 'new_savings') {
      if (!draft.savings_name.trim()) return t('transactions.aiValidationName')
      if (!draft.target_amount || Number(draft.target_amount) <= 0) return t('transactions.aiValidationAmount')
      return null
    }
    if (!draft.amount || Number(draft.amount) <= 0) return t('transactions.aiValidationAmount')
    if (draft.kind === 'new_debt') {
      if (!draft.debt_name.trim()) return t('transactions.aiValidationName')
      if (draft.debt_type !== 'debt' && draft.debt_type !== 'loan') return t('transactions.aiValidationType')
      if (!draft.account_id) return t('transactions.aiValidationAccount')
      return null
    }
    if (draft.kind === 'debt_payment') {
      if (!draft.transaction_date) return t('transactions.aiValidationDate')
      if (!draft.account_id) return t('transactions.aiValidationAccount')
      const selectedDebt = activeDebtOptions.find(debt => debt.debt_id === Number(draft.debt_id))
      if (!draft.debt_id || !selectedDebt) return t('transactions.aiValidationDebt')
      return null
    }
    if (draft.kind === 'savings_contribution') {
      if (!draft.transaction_date) return t('transactions.aiValidationDate')
      if (!draft.account_id) return t('transactions.aiValidationAccount')
      const selectedGoal = activeSavingsGoals.find(goal => goal.savings_id === Number(draft.savings_id))
      if (!draft.savings_id || !selectedGoal) return t('transactions.aiValidationSavingsGoal')
      return null
    }

    if (!draft.account_id) return t('transactions.aiValidationAccount')
    if (!draft.category_id) return t('transactions.aiValidationCategory')
    if (!STANDARD_TRANSACTION_TYPE_OPTIONS.includes(draft.type)) return t('transactions.aiValidationType')
    if (!draft.transaction_date) return t('transactions.aiValidationDate')
    return null
  }

  const updateEntryDraft = (id: string, patch: Partial<AiDraftForm>) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id !== id || !entry.draft) return entry
      const nextDraft = { ...entry.draft, ...patch }
      return { ...entry, draft: nextDraft, saveError: undefined }
    }))
  }

  const syncParsedFromDraft = (parsed: ParsedData, draft: AiDraftForm): ParsedData => {
    if (draft.kind === 'new_debt') {
      return {
        ...parsed,
        operation_type: 'new_debt',
        debt_name: draft.debt_name,
        debt_type: draft.debt_type,
        lender: draft.lender,
        debtor: draft.debtor,
        amount: Number(draft.amount),
        account_id: draft.account_id === '' ? null : Number(draft.account_id),
        note: draft.note,
      }
    }
    if (draft.kind === 'debt_payment') {
      const selectedDebt = activeDebtOptions.find(debt => debt.debt_id === Number(draft.debt_id))
      return {
        ...parsed,
        operation_type: 'debt_payment',
        debt_id: draft.debt_id === '' ? null : Number(draft.debt_id),
        debt_name: selectedDebt?.name ?? draft.debt_name,
        lender: selectedDebt?.lender ?? draft.lender,
        debtor: selectedDebt?.debtor ?? draft.debtor,
        amount: Number(draft.amount),
        account_id: draft.account_id === '' ? null : Number(draft.account_id),
        note: draft.note,
        transaction_date: `${draft.transaction_date} ${normalizeDraftTime(draft.transaction_time)}`,
      }
    }
    if (draft.kind === 'new_savings') {
      return {
        ...parsed,
        operation_type: 'new_savings',
        savings_name: draft.savings_name,
        target_amount: Number(draft.target_amount),
        amount: Number(draft.target_amount),
        note: draft.note,
      }
    }
    if (draft.kind === 'savings_contribution') {
      const selectedGoal = activeSavingsGoals.find(goal => goal.savings_id === Number(draft.savings_id))
      return {
        ...parsed,
        operation_type: 'savings_contribution',
        savings_id: draft.savings_id === '' ? null : Number(draft.savings_id),
        savings_name: selectedGoal?.name ?? draft.savings_name,
        amount: Number(draft.amount),
        account_id: draft.account_id === '' ? null : Number(draft.account_id),
        note: draft.note,
        transaction_date: `${draft.transaction_date} ${normalizeDraftTime(draft.transaction_time)}`,
      }
    }

    const account = accounts.find(item => item.account_id === Number(draft.account_id))
    const category = categories.find(item => item.category_id === draft.category_id)

    return {
      ...parsed,
      amount: Number(draft.amount),
      type: draft.type,
      account: account?.account_name || parsed.account,
      account_id: draft.account_id === '' ? null : Number(draft.account_id),
      account_is_new: draft.account_id === '' && Boolean(parsed.account_is_new),
      category: category?.category_name || parsed.category,
      category_id: draft.category_id,
      note: draft.note,
      location: draft.location,
      transaction_date: `${draft.transaction_date} ${normalizeDraftTime(draft.transaction_time)}`,
      payee_id: draft.payee_id ?? null,
    }
  }

  const getTransferCategoryId = () => {
    const otherCategory = categories.find(category => category.category_name.toLowerCase() === 'khác')
    return otherCategory?.category_id ?? categories[0]?.category_id ?? ''
  }

  const accountNameFor = (accountId: number | '' | null | undefined) => {
    if (!accountId) return ''
    return accounts.find(account => account.account_id === Number(accountId))?.account_name ?? ''
  }

  const createTransferTransaction = async (data: {
    accountId: number
    amount: number
    type: 'transfer_in' | 'transfer_out'
    date: string
    note: string
    location?: string
  }) => {
    const categoryId = getTransferCategoryId()
    if (!categoryId) throw new Error(t('transactions.aiValidationCategory'))

    const result = await addTransaction.mutateAsync({
      transaction_date: data.date,
      account_id: data.accountId,
      category_id: String(categoryId),
      amount: data.amount,
      type: data.type,
      note: data.note,
      location: data.location || '',
    })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    return result.transaction_id
  }

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
        setEntries(prev => [...prev, { id: entryId, text: trimmed, error: body.error ?? t('transactions.notFinancial') }])
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const parsed: ParsedData = await res.json()
      const opType = parsed.operation_type ?? 'transaction'
      setEntries(prev => [
        ...prev,
        {
          id: entryId,
          text: trimmed,
          parsed,
          draft: buildDraft(parsed),
        },
      ])
    } catch (err: any) {
      setEntries(prev => [...prev, { id: entryId, text: trimmed, error: err.message ?? t('transactions.connectionError') }])
    } finally {
      setLoading(false)
    }
  }

  // ── Confirm an entry ─────────────────────────────────────────────────────
  const confirmEntry = async (id: string, parsed: ParsedData, draft?: AiDraftForm) => {
    const opType = parsed.operation_type ?? 'transaction'

    try {
      if (draft) {
        const validationError = validateDraft(draft)
        if (validationError) {
          setEntries(prev => prev.map(e => e.id === id ? { ...e, saveError: validationError } : e))
          return
        }
      }

      if (opType === 'new_debt') {
        const today = new Date()
        const dateStr = parsed.transaction_date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${currentInputTime()}`
        const accountId = Number(parsed.account_id)
        const transferType = parsed.debt_type === 'loan' ? 'transfer_out' : 'transfer_in'
        await createTransferTransaction({
          accountId,
          amount: parsed.amount,
          type: transferType,
          date: dateStr,
          note: parsed.note || parsed.debt_name || t('transactions.aiDebtBill'),
        })
        await debtsApi.createDebt({
          name: parsed.debt_name || parsed.note || t('debts.new'),
          debt_type: (parsed.debt_type as 'debt' | 'loan') ?? 'debt',
          lender: parsed.lender || null,
          debtor: parsed.debtor || null,
          principal: parsed.amount,
          note: parsed.note || null,
        })
        queryClient.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
      } else if (opType === 'debt_payment') {
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`
        const paymentDate = parsed.transaction_date || dateStr
        const accountId = Number(parsed.account_id)
        await debtsApi.createPayment(Number(parsed.debt_id), {
          amount_paid: parsed.amount,
          payment_date: paymentDate,
          account_id: accountId,
          note: parsed.note || parsed.debt_name || t('debts.payment'),
        })
        queryClient.invalidateQueries({ queryKey: ['debts'], refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      } else if (opType === 'new_savings') {
        await savingsApi.createSavings({
          name: parsed.savings_name || parsed.note || t('savingsPage.new'),
          target_amount: parsed.target_amount || parsed.amount,
          note: parsed.note || null,
        })
        queryClient.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
      } else if (opType === 'savings_contribution') {
        const today = new Date()
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`
        const contributionDate = parsed.transaction_date || dateStr
        const accountId = Number(parsed.account_id)
        const savingsId = Number(parsed.savings_id)
        await savingsApi.createContribution(savingsId, {
          amount: parsed.amount,
          contribution_date: contributionDate,
          account_id: accountId,
          note: parsed.note || parsed.savings_name || t('savingsPage.contribution'),
        })
        queryClient.invalidateQueries({ queryKey: ['savings'], refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      } else {
        if (!draft) return
        if (draft.kind !== 'transaction') return

        await addTransaction.mutateAsync({
          transaction_date: `${draft.transaction_date} ${normalizeDraftTime(draft.transaction_time)}`,
          account_id: Number(draft.account_id),
          category_id: draft.category_id,
          amount: Number(draft.amount),
          type: draft.type,
          note: draft.note,
          payee_id: draft.payee_id ?? undefined,
          location: draft.location,
        })
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      }
    } catch (error: any) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, saveError: error.message ?? t('transactions.aiSaveFailed') } : e))
      return
    }

    setEntries(prev => prev.map(e => e.id === id ? { ...e, confirmed: true } : e))
  }

  const rejectEntry = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, rejected: true } : e))
  }

  // ── Microphone ────────────────────────────────────────────────────────────
  const handleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setMicError(t('transactions.micUnsupported')); return }

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
      if (e.error === 'not-allowed') setMicError(t('transactions.micDenied'))
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
    const p = entry.draft ? syncParsedFromDraft(entry.parsed, entry.draft) : entry.parsed
    const opType = p.operation_type ?? 'transaction'
    const editableDraft = Boolean(entry.draft)
    const showDraftEditor = editableDraft && !entry.confirmed && !entry.rejected

    const renderTransactionEditor = () => {
      const draft = entry.draft
      if (!draft || draft.kind !== 'transaction') return null

      const inputCls = 'w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
      const matchingCategories = categories.filter(category =>
        !category.category_type || category.category_type === draft.type
      )

      return (
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.amount')}</span>
              <input
                type="number"
                min="1"
                value={draft.amount}
                onChange={event => updateEntryDraft(entry.id, { amount: event.target.value ? Number(event.target.value) : '' })}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.type')}</span>
              <select
                value={draft.type}
                onChange={event => {
                  const nextType = normalizeTransactionType(event.target.value)
                  const currentCategory = categories.find(category => category.category_id === draft.category_id)
                  updateEntryDraft(entry.id, {
                    type: nextType,
                    category_id: currentCategory?.category_type === nextType ? draft.category_id : '',
                  })
                }}
                className={inputCls}
              >
                {STANDARD_TRANSACTION_TYPE_OPTIONS.map(type => (
                  <option key={type} value={type}>{t(`types.${type}`)}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-muted-foreground">{t('transactions.account')}</span>
            <select
              value={draft.account_id}
              onChange={event => updateEntryDraft(entry.id, { account_id: event.target.value ? Number(event.target.value) : '' })}
              className={inputCls}
            >
              <option value="">{t('transactions.selectAccount')}</option>
              {accounts.map(account => (
                <option key={account.account_id} value={account.account_id}>{account.account_name}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-muted-foreground">{t('transactions.category')}</span>
            <select
              value={draft.category_id}
              onChange={event => updateEntryDraft(entry.id, { category_id: event.target.value })}
              className={inputCls}
            >
              <option value="">{t('transactions.selectCategory')}</option>
              {matchingCategories.map(category => (
                <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.date')}</span>
              <input
                type="date"
                value={draft.transaction_date}
                onChange={event => updateEntryDraft(entry.id, { transaction_date: event.target.value })}
                className={inputCls}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.time')}</span>
              <input
                type="time"
                step="1"
                value={draft.transaction_time}
                onChange={event => updateEntryDraft(entry.id, { transaction_time: event.target.value })}
                className={inputCls}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-muted-foreground">{t('transactions.note')}</span>
            <input
              value={draft.note}
              onChange={event => updateEntryDraft(entry.id, { note: event.target.value })}
              className={inputCls}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-muted-foreground">{t('transactions.location')}</span>
            <input
              value={draft.location}
              onChange={event => updateEntryDraft(entry.id, { location: event.target.value })}
              className={inputCls}
            />
          </label>
        </div>
      )
    }

    const renderAccountSelect = (
      value: number | '',
      onChange: (accountId: number | '') => void,
      label = t('transactions.account')
    ) => {
      const inputCls = 'w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
      return (
        <label className="block space-y-1">
          <span className="text-muted-foreground">{label}</span>
          <select
            value={value}
            onChange={event => onChange(event.target.value ? Number(event.target.value) : '')}
            className={inputCls}
          >
            <option value="">{t('transactions.selectAccount')}</option>
            {accounts.map(account => (
              <option key={account.account_id} value={account.account_id}>{account.account_name}</option>
            ))}
          </select>
        </label>
      )
    }

    const renderDraftHeader = () => {
      const title = (() => {
        if (opType === 'new_debt') return p.debt_name || p.note || t('transactions.aiDebtBill')
        if (opType === 'debt_payment') return p.debt_name || p.lender || p.debtor || t('debts.payment')
        if (opType === 'new_savings') return p.savings_name || p.note || t('transactions.aiSavingsBill')
        if (opType === 'savings_contribution') return p.savings_name || t('savingsPage.contribution')
        return p.note || p.category || t('transactions.fallbackName')
      })()

      const chip = (() => {
        if (opType === 'new_debt') return p.debt_type === 'loan' ? t('debts.owedToMe') : t('debts.iOwe')
        if (opType === 'debt_payment') return t('debts.payment')
        if (opType === 'new_savings') return t('savingsPage.new')
        if (opType === 'savings_contribution') return t('savingsPage.contribution')
        return t(TYPE_LABEL[normalizeTransactionType(p.type)])
      })()

      const chipColor = opType === 'transaction'
        ? TYPE_COLOR[normalizeTransactionType(p.type)]
        : opType === 'new_debt' && p.debt_type === 'loan'
          ? 'text-primary'
          : opType === 'new_debt' || opType === 'debt_payment'
            ? 'text-destructive'
            : 'text-primary'

      const flow = (() => {
        const accountName = accountNameFor(p.account_id)
        if (opType === 'transaction') {
          return normalizeTransactionType(p.type) === 'income'
            ? `${p.payee_name || p.note || t('transactions.aiExternalSource')} → ${accountName || p.account || t('transactions.selectAccount')}`
            : `${accountName || p.account || t('transactions.selectAccount')} → ${p.payee_name || p.category || t('transactions.category')}`
        }
        if (opType === 'savings_contribution') {
          return `${accountName || t('transactions.selectAccount')} → ${p.savings_name || t('transactions.aiSavingsBill')}`
        }
        if (opType === 'new_debt') {
          if (p.debt_type === 'loan') {
            return `${accountName || t('transactions.selectAccount')} → ${p.debtor || p.debt_name || t('debts.debtor')}`
          }
          return `${p.lender || p.debt_name || t('debts.lender')} → ${accountName || t('transactions.selectAccount')}`
        }
        if (opType === 'debt_payment') {
          const isPayingOut = Boolean(p.lender)
          return isPayingOut
            ? `${accountName || t('transactions.selectAccount')} → ${p.lender || p.debt_name || t('debts.lender')}`
            : `${p.debtor || p.debt_name || t('debts.debtor')} → ${accountName || t('transactions.selectAccount')}`
        }
        return ''
      })()

      return (
        <div className="space-y-1 pb-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`inline-flex rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium ${chipColor}`}>
                {chip}
              </span>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{title}</p>
            </div>
            <span className={`shrink-0 text-base font-bold tabular-nums ${chipColor}`}>
              {formatCurrency(p.amount || p.target_amount || 0)}
            </span>
          </div>
          {flow && <p className="truncate text-[11px] text-muted-foreground">{flow}</p>}
        </div>
      )
    }

    const renderSimpleDraftEditor = () => {
      const draft = entry.draft
      if (!draft || draft.kind === 'transaction') {
        return (
          <div className="space-y-2">
            {renderDraftHeader()}
            {renderTransactionEditor()}
          </div>
        )
      }

      const inputCls = 'w-full rounded-lg border border-border bg-input px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary'
      const numberValue = 'amount' in draft ? draft.amount : ''

      const dateTimeFields = ('transaction_date' in draft && 'transaction_time' in draft) ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-muted-foreground">{t('transactions.date')}</span>
            <input
              type="date"
              value={draft.transaction_date}
              onChange={event => updateEntryDraft(entry.id, { transaction_date: event.target.value })}
              className={inputCls}
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">{t('transactions.time')}</span>
            <input
              type="time"
              step="1"
              value={draft.transaction_time}
              onChange={event => updateEntryDraft(entry.id, { transaction_time: event.target.value })}
              className={inputCls}
            />
          </label>
        </div>
      ) : null

      if (draft.kind === 'new_debt') {
        return (
          <div className="space-y-2 text-xs">
            {renderDraftHeader()}
            {renderAccountSelect(
              draft.account_id,
              account_id => updateEntryDraft(entry.id, { account_id }),
              draft.debt_type === 'loan' ? t('transactions.fromAccount') : t('transactions.toAccount')
            )}
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('transactions.aiDebtName')}</span>
              <input value={draft.debt_name} onChange={event => updateEntryDraft(entry.id, { debt_name: event.target.value })} className={inputCls} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('transactions.type')}</span>
                <select value={draft.debt_type} onChange={event => updateEntryDraft(entry.id, { debt_type: event.target.value as 'debt' | 'loan' })} className={inputCls}>
                  <option value="debt">{t('debts.iOwe')}</option>
                  <option value="loan">{t('debts.owedToMe')}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('transactions.amount')}</span>
                <input type="number" min="1" value={numberValue} onChange={event => updateEntryDraft(entry.id, { amount: event.target.value ? Number(event.target.value) : '' })} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('debts.lender')}</span>
                <input value={draft.lender} onChange={event => updateEntryDraft(entry.id, { lender: event.target.value })} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('debts.debtor')}</span>
                <input value={draft.debtor} onChange={event => updateEntryDraft(entry.id, { debtor: event.target.value })} className={inputCls} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('transactions.note')}</span>
              <input value={draft.note} onChange={event => updateEntryDraft(entry.id, { note: event.target.value })} className={inputCls} />
            </label>
          </div>
        )
      }

      if (draft.kind === 'debt_payment') {
        return (
          <div className="space-y-2 text-xs">
            {renderDraftHeader()}
            {renderAccountSelect(
              draft.account_id,
              account_id => updateEntryDraft(entry.id, { account_id }),
              draft.lender ? t('transactions.fromAccount') : t('transactions.toAccount')
            )}
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('transactions.aiDebtName')}</span>
                <select
                  value={draft.debt_id}
                  onChange={event => {
                    const nextId = event.target.value ? Number(event.target.value) : ''
                    const selectedDebt = activeDebtOptions.find(debt => debt.debt_id === nextId)
                    updateEntryDraft(entry.id, {
                      debt_id: nextId,
                      debt_name: selectedDebt?.name ?? '',
                      lender: selectedDebt?.lender ?? '',
                      debtor: selectedDebt?.debtor ?? '',
                    })
                  }}
                  className={inputCls}
                >
                  <option value="">{t('transactions.selectDebt')}</option>
                  {activeDebtOptions.map(debt => (
                    <option key={debt.debt_id} value={debt.debt_id}>
                      {debt.name} - {debt.debt_type === 'debt' ? t('debts.iOwe') : t('debts.owedToMe')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('transactions.amount')}</span>
                <input type="number" min="1" value={draft.amount} onChange={event => updateEntryDraft(entry.id, { amount: event.target.value ? Number(event.target.value) : '' })} className={inputCls} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('debts.lender')}</span>
                <input value={draft.lender} onChange={event => updateEntryDraft(entry.id, { lender: event.target.value })} className={inputCls} />
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground">{t('debts.debtor')}</span>
                <input value={draft.debtor} onChange={event => updateEntryDraft(entry.id, { debtor: event.target.value })} className={inputCls} />
              </label>
            </div>
            {dateTimeFields}
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('transactions.note')}</span>
              <input value={draft.note} onChange={event => updateEntryDraft(entry.id, { note: event.target.value })} className={inputCls} />
            </label>
          </div>
        )
      }

      if (draft.kind === 'new_savings') {
        return (
          <div className="space-y-2 text-xs">
            {renderDraftHeader()}
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('transactions.aiSavingsName')}</span>
              <input value={draft.savings_name} onChange={event => updateEntryDraft(entry.id, { savings_name: event.target.value })} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('savingsPage.goal')}</span>
              <input type="number" min="1" value={draft.target_amount} onChange={event => updateEntryDraft(entry.id, { target_amount: event.target.value ? Number(event.target.value) : '' })} className={inputCls} />
            </label>
            <label className="block space-y-1">
              <span className="text-muted-foreground">{t('transactions.note')}</span>
              <input value={draft.note} onChange={event => updateEntryDraft(entry.id, { note: event.target.value })} className={inputCls} />
            </label>
          </div>
        )
      }

      return (
        <div className="space-y-2 text-xs">
          {renderDraftHeader()}
          {renderAccountSelect(
            draft.account_id,
            account_id => updateEntryDraft(entry.id, { account_id }),
            t('transactions.fromAccount')
          )}
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.destinationSavings')}</span>
              <select
                value={draft.savings_id}
                onChange={event => {
                  const nextId = event.target.value ? Number(event.target.value) : ''
                  const selectedGoal = activeSavingsGoals.find(goal => goal.savings_id === nextId)
                  updateEntryDraft(entry.id, { savings_id: nextId, savings_name: selectedGoal?.name ?? '' })
                }}
                className={inputCls}
              >
                <option value="">{t('transactions.selectSavingsGoal')}</option>
                {activeSavingsGoals.map(goal => (
                  <option key={goal.savings_id} value={goal.savings_id}>{goal.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">{t('transactions.amount')}</span>
              <input type="number" min="1" value={draft.amount} onChange={event => updateEntryDraft(entry.id, { amount: event.target.value ? Number(event.target.value) : '' })} className={inputCls} />
            </label>
          </div>
          {dateTimeFields}
          <label className="block space-y-1">
            <span className="text-muted-foreground">{t('transactions.note')}</span>
            <input value={draft.note} onChange={event => updateEntryDraft(entry.id, { note: event.target.value })} className={inputCls} />
          </label>
        </div>
      )
    }

    const cardContent = () => {
      if (opType === 'new_debt') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.debt_type === 'debt' ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                {p.debt_type === 'debt' ? t('debts.iOwe') : t('debts.owedToMe')}
              </span>
              <span className="font-bold text-base text-foreground">{formatCurrency(p.amount)}</span>
            </div>
            {p.lender && <p>👤 {t('debts.lender')}: {p.lender}</p>}
            {p.debtor && <p>👤 {t('debts.debtor')}: {p.debtor}</p>}
            {p.debt_name && <p>📋 {p.debt_name}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      if (opType === 'debt_payment') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">{t('debts.payment')}</p>
            <p className="text-primary text-base font-bold">{formatCurrency(p.amount)}</p>
            {p.lender && <p>👤 {p.lender}</p>}
            {p.debt_name && <p>📋 {p.debt_name}</p>}
          </div>
        )
      }
      if (opType === 'new_savings') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">{t('savingsPage.new')}</p>
            {p.savings_name && <p>🐷 {p.savings_name}</p>}
            {p.target_amount ? <p>🎯 {t('savingsPage.goal')}: {formatCurrency(p.target_amount)}</p> : <p>💰 {formatCurrency(p.amount)}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      if (opType === 'savings_contribution') {
        return (
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p className="text-foreground font-bold text-sm">{t('savingsPage.contribution')}</p>
            <p className="text-primary text-base font-bold">{formatCurrency(p.amount)}</p>
            {p.savings_name && <p>🐷 {p.savings_name}</p>}
            {p.note && <p>📝 {p.note}</p>}
          </div>
        )
      }
      // Default: transaction
      return (
        <div className="text-muted-foreground space-y-0.5 text-xs">
          <div className="flex items-center justify-between">
            <span className={`font-bold text-base tabular-nums ${TYPE_COLOR[normalizeTransactionType(p.type)]}`}>{formatCurrency(p.amount)}</span>
            <span className={`text-[10px] font-medium ${TYPE_COLOR[normalizeTransactionType(p.type)]}`}>{p.type ? t(TYPE_LABEL[normalizeTransactionType(p.type)]) : ''}</span>
          </div>
          <p>🏷 {p.category} &nbsp;·&nbsp; 💳 {p.account}</p>
          {p.note && <p>📝 {p.note}</p>}
          {p.location && <p>📍 {p.location}</p>}
          <p className="text-muted-foreground/50">{p.transaction_date}</p>
          {p.account_is_new && <p className="text-[var(--meter-warning)]">🆕 {t('transactions.newAccountNeedsSelection')}</p>}
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
        {showDraftEditor ? renderSimpleDraftEditor() : cardContent()}
        {entry.saveError && (
          <p className="text-destructive text-[11px]">{entry.saveError}</p>
        )}
        {!entry.confirmed && !entry.rejected && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => confirmEntry(entry.id, p, entry.draft)}
              className="flex items-center gap-1 text-primary border border-primary/40 hover:bg-primary/10 rounded-lg px-2.5 py-1 transition-all text-[11px] font-medium"
            >
              <CheckCircle className="w-3.5 h-3.5" /> {t('common.confirm')}
            </button>
            <button
              onClick={() => rejectEntry(entry.id)}
              className="flex items-center gap-1 text-muted-foreground border border-border hover:bg-muted/30 rounded-lg px-2.5 py-1 transition-all text-[11px]"
            >
              <XCircle className="w-3.5 h-3.5" /> {t('common.cancel')}
            </button>
          </div>
        )}
        {entry.confirmed && (
          <p className="text-primary text-[11px] flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {t('transactions.saved')}
          </p>
        )}
        {entry.rejected && <p className="text-muted-foreground/50 text-[11px]">{t('transactions.cancelled')}</p>}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          open ? 'bg-popover border border-border rotate-45' : 'hover:scale-110'
        }`}
        style={open ? undefined : { background: `linear-gradient(135deg, ${palette.primary}, ${palette.indigoDark})` }}
        title={t('transactions.aiButtonTitle')}
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
            <span className="text-sm font-semibold text-foreground">{t('transactions.aiTitle')}</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">Gemini</span>
          </div>

          {/* Entries */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {entries.length === 0 && (
              <p className="text-muted-foreground/60 text-xs text-center pt-4">
                {t('transactions.aiEmpty')}
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
                {t('transactions.aiParsing')}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="px-3 pb-1 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTION_KEYS.map(key => {
                const suggestion = t(key)
                return (
                  <button
                    key={key}
                    onClick={() => handleSubmit(suggestion)}
                    className="shrink-0 text-[10px] text-muted-foreground border border-border hover:border-primary/50 hover:text-foreground rounded-full px-2.5 py-1 transition-all whitespace-nowrap"
                  >
                    {suggestion}
                  </button>
                )
              })}
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
                placeholder={t('transactions.aiInputPlaceholder')}
                className="flex-1 bg-transparent text-foreground text-xs placeholder-muted-foreground/50 outline-none"
                disabled={loading || listening}
              />
              <button
                onClick={handleMic}
                className={`p-1 rounded-lg transition-all ${
                  listening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                }`}
                title={listening ? t('transactions.micStopAndSend') : t('transactions.micStart')}
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
