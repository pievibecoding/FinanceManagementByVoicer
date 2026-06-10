import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CreditCard, Pencil, Trash2, Banknote, AlertTriangle, Clock } from 'lucide-react'
import {
  useDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  useDebtPayments,
  useCreatePayment,
  useDeletePayment,
} from '@/hooks/useDebts'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import type { Debt, DebtPayment } from '@/api/debts'
import { AppCard, ErrorState, PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/debts/')({
  component: DebtsPage,
})

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dueDateStatus(debt: Debt): 'overdue' | 'soon' | null {
  if (!debt.due_date || debt.status !== 'active') return null
  const due = new Date(debt.due_date)
  const now = new Date()
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff < 7) return 'soon'
  return null
}

// ── Debt form modal ──────────────────────────────────────────────────────────

interface DebtFormModalProps {
  debt?: Debt
  onClose: () => void
}

function DebtFormModal({ debt, onClose }: DebtFormModalProps) {
  const { t } = useTranslation()
  const isEdit = !!debt
  const createDebt = useCreateDebt()
  const updateDebt = useUpdateDebt()

  const [name, setName] = useState(debt?.name ?? '')
  const [debtType, setDebtType] = useState<'debt' | 'loan'>(debt?.debt_type ?? 'debt')
  const [lender, setLender] = useState(debt?.lender ?? '')
  const [debtor, setDebtor] = useState(debt?.debtor ?? '')
  const [principal, setPrincipal] = useState(debt ? String(debt.principal) : '')
  const [outstandingBalance, setOutstandingBalance] = useState(debt ? String(debt.outstanding_balance) : '')
  const [startDate, setStartDate] = useState(debt?.start_date?.slice(0, 10) ?? todayStr())
  const [dueDate, setDueDate] = useState(debt?.due_date?.slice(0, 10) ?? '')
  const [note, setNote] = useState(debt?.note ?? '')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const principalNum = parseInt(principal.replace(/\D/g, ''), 10)
    if (!name.trim()) return setError(t('debts.errors.nameRequired'))
    if (isNaN(principalNum) || principalNum <= 0) return setError(t('debts.errors.principalPositive'))

    try {
      if (isEdit && debt) {
        await updateDebt.mutateAsync({
          debtId: debt.debt_id,
          data: {
            name: name.trim(),
            lender: lender.trim() || null,
            debtor: debtor.trim() || null,
            principal: principalNum,
            outstanding_balance: outstandingBalance ? parseInt(outstandingBalance.replace(/\D/g, ''), 10) : principalNum,
            start_date: startDate || null,
            due_date: dueDate || null,
            note: note.trim() || null,
          },
        })
      } else {
        await createDebt.mutateAsync({
          name: name.trim(),
          debt_type: debtType,
          lender: lender.trim() || null,
          debtor: debtor.trim() || null,
          principal: principalNum,
          start_date: startDate || null,
          due_date: dueDate || null,
          note: note.trim() || null,
        })
      }
      onClose()
    } catch (err: any) {
      setError(err.message ?? t('debts.errors.generic'))
    }
  }

  const isPending = createDebt.isPending || updateDebt.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-foreground font-semibold text-lg mb-4">{isEdit ? t('debts.edit') : t('debts.new')}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isEdit && (
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.type')}</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDebtType('debt')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${debtType === 'debt' ? 'bg-destructive/20 border-destructive/50 text-destructive' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                  {t('debts.iOwe')}
                </button>
                <button type="button" onClick={() => setDebtType('loan')}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-all ${debtType === 'loan' ? 'bg-primary/20 border-primary/50 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                  {t('debts.owedToMe')}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="text-muted-foreground text-sm block mb-1">{t('debts.name')} *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t('debts.namePlaceholder')}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.lender')}</label>
              <input value={lender} onChange={e => setLender(e.target.value)} placeholder={t('debts.lenderPlaceholder')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.debtor')}</label>
              <input value={debtor} onChange={e => setDebtor(e.target.value)} placeholder={t('debts.debtorPlaceholder')}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.principal')} *</label>
              <input value={principal} onChange={e => setPrincipal(e.target.value)} placeholder="1000000" type="number" min="1"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
            {isEdit && (
              <div>
                <label className="text-muted-foreground text-sm block mb-1">{t('debts.remainingVnd')}</label>
                <input value={outstandingBalance} onChange={e => setOutstandingBalance(e.target.value)} type="number" min="0"
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.startDate')}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-muted-foreground text-sm block mb-1">{t('debts.dueDate')}</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">{t('debts.note')}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary resize-none" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-primary text-primary-foreground font-medium py-2 rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-all">
              {isPending ? t('common.saving') : isEdit ? t('common.save') : t('common.create')}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Payment modal ────────────────────────────────────────────────────────────

interface PaymentModalProps {
  debt: Debt
  onClose: () => void
}

function PaymentModal({ debt, onClose }: PaymentModalProps) {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()
  const createPayment = useCreatePayment()
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayStr())
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (isNaN(amountNum) || amountNum <= 0) return setError(t('debts.errors.amountPositive'))
    try {
      await createPayment.mutateAsync({
        debtId: debt.debt_id,
        data: { amount_paid: amountNum, payment_date: `${paymentDate} 00:00:00` },
      })
      onClose()
    } catch (err: any) {
      setError(err.message ?? t('debts.errors.generic'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-foreground font-semibold text-lg mb-1">{t('debts.payment')}</h2>
        <p className="text-muted-foreground text-sm mb-4">{debt.name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-muted-foreground text-sm block mb-1">{t('debts.paymentAmount')} *</label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" min="1" placeholder={t('transactions.amountPlaceholder')} autoFocus
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
            <p className="text-muted-foreground/60 text-xs mt-1">{t('debts.remaining')}: {formatCurrency(debt.outstanding_balance)}</p>
          </div>
          <div>
            <label className="text-muted-foreground text-sm block mb-1">{t('debts.paymentDate')}</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-foreground text-sm outline-none focus:border-primary" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={createPayment.isPending}
              className="flex-1 bg-primary text-primary-foreground font-medium py-2 rounded-lg hover:bg-primary/80 disabled:opacity-50 transition-all">
              {createPayment.isPending ? t('common.saving') : t('common.confirm')}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Payments history modal ───────────────────────────────────────────────────

interface PaymentsHistoryModalProps {
  debt: Debt
  onClose: () => void
}

function PaymentsHistoryModal({ debt, onClose }: PaymentsHistoryModalProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useLocaleFormat()
  const { data: payments = [], isLoading } = useDebtPayments(debt.debt_id)
  const deletePayment = useDeletePayment()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-foreground font-semibold text-lg">{t('debts.paymentsHistory')}</h2>
            <p className="text-muted-foreground text-sm">{debt.name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading && <p className="text-muted-foreground text-sm">{t('common.loading')}</p>}
          {!isLoading && payments.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">{t('debts.noPayments')}</p>}
          {payments.map((p: DebtPayment) => (
            <div key={p.payment_id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
              <div>
                <p className="text-foreground font-medium text-sm">{formatCurrency(p.amount_paid)}</p>
                <p className="text-muted-foreground text-xs">{p.payment_date ? formatDate(p.payment_date) : ''}</p>
              </div>
              <button
                onClick={() => deletePayment.mutate({ debtId: debt.debt_id, paymentId: p.payment_id })}
                className="text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                title={t('debts.deletePayment')}
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

// ── Debt row ─────────────────────────────────────────────────────────────────

interface DebtRowProps {
  debt: Debt
  onEdit: (d: Debt) => void
  onDelete: (d: Debt) => void
  onPay: (d: Debt) => void
  onHistory: (d: Debt) => void
}

function DebtRow({ debt, onEdit, onDelete, onPay, onHistory }: DebtRowProps) {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useLocaleFormat()
  const progress = debt.principal > 0 ? Math.max(0, 1 - debt.outstanding_balance / debt.principal) : 1
  const pct = Math.round(progress * 100)
  const alert = dueDateStatus(debt)

  const statusBadge = () => {
    if (debt.status === 'settled') return <span className="px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary">{t('debts.settled')}</span>
    if (debt.status === 'overdue' || alert === 'overdue') return <span className="px-2 py-0.5 rounded text-[10px] bg-destructive/20 text-destructive">{t('debts.overdue')}</span>
    return <span className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">{t('debts.active')}</span>
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground font-medium truncate">{debt.name}</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {debt.lender && `${t('debts.lender')}: ${debt.lender}`}
            {debt.debtor && `${t('debts.debtor')}: ${debt.debtor}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">{statusBadge()}</div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t('debts.paid')}: {formatCurrency(debt.principal - debt.outstanding_balance)}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-border/40 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all ${debt.status === 'settled' ? 'bg-primary' : 'bg-primary/70'}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t('debts.remaining')}: <span className="text-foreground font-medium">{formatCurrency(debt.outstanding_balance)}</span></span>
          <span className="text-muted-foreground/60">/ {formatCurrency(debt.principal)}</span>
        </div>
      </div>

      {debt.due_date && (
        <div className="flex items-center gap-1 text-xs">
          {alert === 'overdue' ? (
            <><AlertTriangle className="w-3 h-3 text-destructive" /><span className="text-destructive">{t('debts.overdue')}: {formatDate(debt.due_date)}</span></>
          ) : alert === 'soon' ? (
            <><Clock className="w-3 h-3 text-[var(--meter-warning)]" /><span className="text-[var(--meter-warning)]">{t('debts.dueSoon')}: {formatDate(debt.due_date)}</span></>
          ) : (
            <span className="text-muted-foreground/50">{t('debts.due')}: {formatDate(debt.due_date)}</span>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {debt.status !== 'settled' && (
          <button onClick={() => onPay(debt)} className="flex items-center gap-1.5 text-xs bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 rounded-lg px-2.5 py-1.5 transition-all">
            <Banknote className="w-3.5 h-3.5" /> {t('debts.payment')}
          </button>
        )}
        <button onClick={() => onHistory(debt)} className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border hover:bg-muted/30 rounded-lg px-2.5 py-1.5 transition-all">
          {t('common.history')}
        </button>
        <button onClick={() => onEdit(debt)} className="ml-auto text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/30 transition-all">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(debt)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Delete confirm ───────────────────────────────────────────────────────────

function DeleteDebtConfirm({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const { t } = useTranslation()
  const deleteDebt = useDeleteDebt()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-popover border border-border rounded-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-foreground font-semibold mb-2">{t('debts.deleteTitle')}</h2>
        <p className="text-muted-foreground text-sm mb-4">{t('debts.deleteDescription', { name: debt.name })}</p>
        {deleteDebt.error && <p className="text-destructive text-sm mb-2">{(deleteDebt.error as Error).message}</p>}
        <div className="flex gap-3">
          <button onClick={() => deleteDebt.mutate(debt.debt_id, { onSuccess: onClose })} disabled={deleteDebt.isPending}
            className="flex-1 bg-destructive text-white font-medium py-2 rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-all">
            {deleteDebt.isPending ? t('common.deleting') : t('common.delete')}
          </button>
          <button onClick={onClose} className="flex-1 border border-border text-muted-foreground py-2 rounded-lg hover:bg-muted/30 transition-all">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

function DebtsPage() {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()
  const { debts, isLoading, isError, totalDebt, totalLoan } = useDebts()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null)
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null)
  const [historyDebt, setHistoryDebt] = useState<Debt | null>(null)

  if (isLoading) {
    return (
      <div className="p-6">
        <PageHeader title={t('debts.title')} />
        <div className="mt-4 text-muted-foreground text-sm">{t('common.loadingData')}</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <PageHeader title={t('debts.title')} />
        <ErrorState className="mt-4" title={t('common.loadError')} />
      </div>
    )
  }

  const myDebts = debts.filter(d => d.debt_type === 'debt')
  const myLoans = debts.filter(d => d.debt_type === 'loan')

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('debts.title')}
        actions={(
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" /> {t('debts.add')}
          </Button>
        )}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <AppCard className="rounded-xl p-4">
          <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> {t('debts.iOwe')}</p>
          <p className="text-destructive text-xl font-bold">{formatCurrency(totalDebt)}</p>
        </AppCard>
        <AppCard className="rounded-xl p-4">
          <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> {t('debts.owedToMe')}</p>
          <p className="text-primary text-xl font-bold">{formatCurrency(totalLoan)}</p>
        </AppCard>
      </div>

      {/* Section: Tôi đang nợ */}
      <div>
        <h2 className="text-foreground/80 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
          {t('debts.myDebts')} ({myDebts.length})
        </h2>
        {myDebts.length === 0 ? (
          <p className="text-muted-foreground/50 text-sm py-4 text-center">{t('debts.noDebts')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {myDebts.map(d => (
              <DebtRow key={d.debt_id} debt={d} onEdit={setEditingDebt} onDelete={setDeletingDebt} onPay={setPayingDebt} onHistory={setHistoryDebt} />
            ))}
          </div>
        )}
      </div>

      {/* Section: Người khác nợ tôi */}
      <div>
        <h2 className="text-foreground/80 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary inline-block" />
          {t('debts.myLoans')} ({myLoans.length})
        </h2>
        {myLoans.length === 0 ? (
          <p className="text-muted-foreground/50 text-sm py-4 text-center">{t('debts.noLoans')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {myLoans.map(d => (
              <DebtRow key={d.debt_id} debt={d} onEdit={setEditingDebt} onDelete={setDeletingDebt} onPay={setPayingDebt} onHistory={setHistoryDebt} />
            ))}
          </div>
        )}
      </div>

      {showAddModal && <DebtFormModal onClose={() => setShowAddModal(false)} />}
      {editingDebt && <DebtFormModal debt={editingDebt} onClose={() => setEditingDebt(null)} />}
      {deletingDebt && <DeleteDebtConfirm debt={deletingDebt} onClose={() => setDeletingDebt(null)} />}
      {payingDebt && <PaymentModal debt={payingDebt} onClose={() => setPayingDebt(null)} />}
      {historyDebt && <PaymentsHistoryModal debt={historyDebt} onClose={() => setHistoryDebt(null)} />}
    </div>
  )
}
