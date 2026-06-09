import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddAccount } from '@/hooks/useAccounts';

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  const { t } = useTranslation();
  const addAccount = useAddAccount();
  const [formData, setFormData] = useState({
    account_name: '', account_type: 'cash',
    initial_balance: 0, currency: 'VND', description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAccount.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({ account_name: '', account_type: 'cash', initial_balance: 0, currency: 'VND', description: '' });
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">{t('accounts.add')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('accounts.name')}</label>
            <input type="text" value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className={INPUT_CLS} required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('accounts.type')}</label>
            <select value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              className={INPUT_CLS} required>
              <option value="cash">{t('accounts.cash')}</option>
              <option value="bank">{t('accounts.bank')}</option>
              <option value="credit_card">{t('accounts.creditCard')}</option>
              <option value="investment">{t('accounts.investment')}</option>
              <option value="savings">{t('accounts.savings')}</option>
              <option value="wallet">{t('accounts.wallet')}</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('accounts.initialBalance')}</label>
            <input type="number" value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
              className={INPUT_CLS} required min="0" />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('accounts.currency')}</label>
            <select value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className={INPUT_CLS} required>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">{t('accounts.description')}</label>
            <textarea value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={INPUT_CLS} rows={3} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={addAccount.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {addAccount.isPending ? t('common.adding') : t('accounts.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
