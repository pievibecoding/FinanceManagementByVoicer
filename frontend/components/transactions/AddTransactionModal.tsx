import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';
import { TRANSACTION_TYPE_OPTIONS } from '@/lib/transaction-types';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM = () => ({
  transaction_date: new Date().toISOString().slice(0, 10),
  account_id: 0,
  category_id: '',
  amount: 0,
  type: 'expense',
  note: '',
  location: '',
});

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function AddTransactionModal({ open, onOpenChange }: AddTransactionModalProps) {
  const { t } = useTranslation();
  const addTransaction = useAddTransaction();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_id || !formData.category_id || !formData.amount) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    addTransaction.mutate(
      { ...formData, transaction_date: `${formData.transaction_date} ${timeStr}` },
      { onSuccess: () => { onOpenChange(false); setFormData(EMPTY_FORM()); } }
    );
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t('transactions.add')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('transactions.date')}</label>
            <input type="date" value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className={INPUT_CLS} required />
          </div>
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
            <select value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={INPUT_CLS} required>
              {TRANSACTION_TYPE_OPTIONS.map((type) => (
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
              className={INPUT_CLS} required min="1" placeholder="0" />
          </div>
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
            <Button type="submit" disabled={addTransaction.isPending} className="flex-1">
              {addTransaction.isPending ? t('common.saving') : t('common.create')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}
