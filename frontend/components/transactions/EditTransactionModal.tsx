import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateTransaction, useUpdateTransferTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useDebts } from '@/hooks/useDebts';
import { useSavings } from '@/hooks/useSavings';
import type { Transaction } from '@/api/transactions';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';
import { STANDARD_TRANSACTION_TYPE_OPTIONS, isTransactionTypeOption, operationTypeForTransaction } from '@/lib/transaction-types';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function EditTransactionModal({ open, onOpenChange, transaction }: EditTransactionModalProps) {
  const { t } = useTranslation();
  const updateTransaction = useUpdateTransaction();
  const updateTransferTransaction = useUpdateTransferTransaction();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { debts = [] } = useDebts();
  const { savings = [] } = useSavings();

  const [formData, setFormData] = useState({
    transaction_date: '', account_id: 0, category_id: '',
    amount: 0, type: 'out', operation_type: 'expense', note: '', location: '',
    from_account_id: 0, to_account_id: 0, savings_id: 0, debt_id: 0,
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date.slice(0, 10),
        account_id: transaction.account_id,
        category_id: String(transaction.category_id),
        amount: transaction.amount,
        type: isTransactionTypeOption(transaction.type) ? transaction.type : (operationTypeForTransaction(transaction) === 'income' ? 'in' : 'out'),
        operation_type: operationTypeForTransaction(transaction),
        note: transaction.note,
        location: transaction.location || '',
        from_account_id: transaction.cash_flow?.source_account_id ?? transaction.transfer_context?.source_account_id
          ?? (transaction.type === 'out' || transaction.type === 'transfer_out' ? transaction.account_id : 0),
        to_account_id: transaction.cash_flow?.destination_account_id ?? transaction.transfer_context?.destination_account_id
          ?? (transaction.type === 'in' || transaction.type === 'transfer_in' ? transaction.account_id : 0),
        savings_id: transaction.cash_flow?.savings_id ?? transaction.transfer_context?.destination_savings_id
          ?? (transaction.transfer_context?.related_kind === 'savings' ? Number(transaction.transfer_context.related_id) : 0),
        debt_id: transaction.cash_flow?.debt_id ?? transaction.transfer_context?.debt_id
          ?? (transaction.transfer_context?.related_kind === 'debt' ? Number(transaction.transfer_context.related_id) : 0),
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const originalTime = transaction.transaction_date.slice(11) || '00:00:00';
    const originalDate = transaction.transaction_date.slice(0, 10);
    const transactionDate = formData.transaction_date === originalDate
      ? transaction.transaction_date
      : `${formData.transaction_date} ${originalTime}`;
    const operationType = operationTypeForTransaction(transaction);
    const isOperationMovement = !['income', 'expense'].includes(operationType);
    if (isOperationMovement) {
      const relatedKind = operationType === 'inner_transfer' ? 'account'
        : operationType === 'savings_contribution' || operationType === 'savings_withdrawal' ? 'savings'
          : operationType === 'debt_payment' || operationType === 'debt_disbursement' ? 'debt'
            : transaction.transfer_context?.related_kind;
      const payload = {
        transaction_date: transactionDate,
        amount: formData.amount,
        note: formData.note,
        location: formData.location,
        ...(relatedKind === 'account' ? {
          from_account_id: formData.from_account_id,
          to_account_id: formData.to_account_id,
        } : {}),
        ...(relatedKind === 'savings' ? {
          account_id: formData.from_account_id || formData.account_id,
          savings_id: formData.savings_id,
        } : {}),
        ...(relatedKind === 'debt' ? {
          account_id: formData.account_id,
          debt_id: formData.debt_id,
        } : {}),
        ...(!relatedKind ? {
          account_id: formData.account_id,
        } : {}),
      };
      updateTransferTransaction.mutate({
        transactionId: transaction.transaction_id,
        transaction: payload,
      }, { onSuccess: () => { onOpenChange(false); } });
      return;
    }

    const nextOperation = formData.operation_type || operationType;
    updateTransaction.mutate({
      transactionId: transaction.transaction_id,
      transaction: {
        ...formData,
        operation_type: nextOperation,
        type: nextOperation === 'income' ? 'in' : 'out',
        source_account_id: nextOperation === 'expense' ? formData.account_id : null,
        destination_account_id: nextOperation === 'income' ? formData.account_id : null,
        transaction_date: transactionDate,
      },
    }, { onSuccess: () => { onOpenChange(false); } });
  };

  if (!transaction) return null;

  const operationType = operationTypeForTransaction(transaction);
  const isTransfer = !['income', 'expense'].includes(operationType);
  const transferKind = operationType === 'inner_transfer' ? 'account'
    : operationType === 'savings_contribution' || operationType === 'savings_withdrawal' ? 'savings'
      : operationType === 'debt_payment' || operationType === 'debt_disbursement' ? 'debt'
        : transaction.transfer_context?.related_kind ?? null;
  const accountMap = Object.fromEntries(accounts.map(account => [String(account.account_id), account.account_name]));
  const accountLabel = (accountId: number) => accountMap[String(accountId)] ?? `#${accountId}`;
  const selectedSavings = savings.find(item => item.savings_id === Number(formData.savings_id));
  const selectedDebt = debts.find(item => item.debt_id === Number(formData.debt_id));
  const debtCashDirection = selectedDebt?.debt_type === 'loan' ? 'in' : 'out';
  const transferSource = transferKind === 'account'
    ? accountLabel(formData.from_account_id)
    : transferKind === 'savings'
      ? accountLabel(formData.from_account_id || formData.account_id)
      : transferKind === 'debt' && debtCashDirection === 'in'
        ? selectedDebt?.debtor || selectedDebt?.name || transaction.transfer_context?.source_label || t('common.none')
        : accountLabel(formData.account_id || transaction.account_id);
  const transferDestination = transferKind === 'account'
    ? accountLabel(formData.to_account_id)
    : transferKind === 'savings'
      ? selectedSavings?.name || transaction.transfer_context?.destination_label || t('common.none')
      : transferKind === 'debt' && debtCashDirection === 'out'
        ? selectedDebt?.lender || selectedDebt?.name || transaction.transfer_context?.destination_label || t('common.none')
        : accountLabel(formData.account_id || transaction.account_id);
  const isPending = updateTransaction.isPending || updateTransferTransaction.isPending;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t('transactions.edit')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isTransfer && (
            <div className="space-y-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{t('transactions.cashFlow')}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{transferSource} → {transferDestination}</p>
                </div>
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {t('types.transfer')}
                </span>
              </div>

              {transferKind === 'account' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">{t('transactions.source')}</label>
                    <select value={formData.from_account_id}
                      onChange={(e) => setFormData({ ...formData, from_account_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectAccount')} --</option>
                      {accounts.map((a) => (
                        <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">{t('transactions.destination')}</label>
                    <select value={formData.to_account_id}
                      onChange={(e) => setFormData({ ...formData, to_account_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectAccount')} --</option>
                      {accounts.map((a) => (
                        <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {transferKind === 'savings' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">{t('transactions.source')}</label>
                    <select value={formData.from_account_id || formData.account_id}
                      onChange={(e) => setFormData({ ...formData, from_account_id: Number(e.target.value), account_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectAccount')} --</option>
                      {accounts.map((a) => (
                        <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">{t('transactions.destinationSavings')}</label>
                    <select value={formData.savings_id}
                      onChange={(e) => setFormData({ ...formData, savings_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectSavingsGoal')} --</option>
                      {savings.map((goal) => (
                        <option key={goal.savings_id} value={goal.savings_id}>{goal.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {transferKind === 'debt' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">
                      {debtCashDirection === 'in' ? t('transactions.destination') : t('transactions.source')}
                    </label>
                    <select value={formData.account_id}
                      onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectAccount')} --</option>
                      {accounts.map((a) => (
                        <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted-foreground text-sm mb-1">{t('transactions.aiDebtName')}</label>
                    <select value={formData.debt_id}
                      onChange={(e) => setFormData({ ...formData, debt_id: Number(e.target.value) })}
                      className={INPUT_CLS} required>
                      <option value="">-- {t('transactions.selectDebt')} --</option>
                      {debts.map((debt) => (
                        <option key={debt.debt_id} value={debt.debt_id}>{debt.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {!transferKind && (
                <div>
                  <label className="block text-muted-foreground text-sm mb-1">{t('transactions.account')}</label>
                  <select value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
                    className={INPUT_CLS} required>
                    <option value="">-- {t('transactions.selectAccount')} --</option>
                    {accounts.map((a) => (
                      <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-muted-foreground text-sm mb-1">{t('transactions.amount')}</label>
                <input type="number" value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className={INPUT_CLS} required min="1" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t('transactions.transferEditLimitedNotice')}</p>
            </div>
          )}

          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('transactions.date')}</label>
            <input type="date" value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className={INPUT_CLS} required />
          </div>
          {!isTransfer && (
            <>
              <div>
                <label className="block text-muted-foreground text-sm mb-1">{t('transactions.account')}</label>
                <select value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
                  className={INPUT_CLS} required>
                  <option value="">-- {t('transactions.selectAccount')} --</option>
                  {accounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground text-sm mb-1">{t('transactions.type')}</label>
                <select value={formData.operation_type}
                  onChange={(e) => setFormData({ ...formData, operation_type: e.target.value })}
                  className={INPUT_CLS} required>
                  {STANDARD_TRANSACTION_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>{t(`types.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground text-sm mb-1">{t('transactions.category')}</label>
                <select value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className={INPUT_CLS} required>
                  <option value="">-- {t('transactions.selectCategory')} --</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground text-sm mb-1">{t('transactions.amount')}</label>
                <input type="number" value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className={INPUT_CLS} required min="1" />
              </div>
            </>
          )}
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('transactions.note')}</label>
            <textarea value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className={INPUT_CLS} rows={2} />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('transactions.location')}</label>
            <input type="text" value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={INPUT_CLS} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? t('common.updating') : t('common.update')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}
