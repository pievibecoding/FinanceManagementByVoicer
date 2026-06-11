import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateAccount } from '@/hooks/useAccounts';
import type { Account } from '@/api/accounts';
import { FormDialog } from '@/components/common';
import { Button } from '@/components/ui/button';

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function EditAccountModal({ open, onOpenChange, account }: EditAccountModalProps) {
  const { t } = useTranslation();
  const updateAccount = useUpdateAccount();
  const [formData, setFormData] = useState({
    account_name: '', account_type: 'cash',
    initial_balance: 0, currency: 'VND', description: '',
  });

  useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name,
        account_type: account.account_type === 'investment' || account.account_type === 'Investment' ? 'savings' : account.account_type,
        initial_balance: account.initial_balance,
        currency: 'VND', description: '',
      });
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    updateAccount.mutate({ accountId: account.account_id, account: formData }, {
      onSuccess: () => { onOpenChange(false); },
    });
  };

  if (!account) return null;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t('accounts.edit')}>
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
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateAccount.isPending} className="flex-1">
              {updateAccount.isPending ? t('common.updating') : t('accounts.edit')}
            </Button>
          </div>
        </form>
    </FormDialog>
  );
}
