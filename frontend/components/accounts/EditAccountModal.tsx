import { useState, useEffect } from 'react';
import { useUpdateAccount } from '@/hooks/useAccounts';
import type { Account } from '@/api/accounts';

interface EditAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}

export function EditAccountModal({ open, onOpenChange, account }: EditAccountModalProps) {
  const updateAccount = useUpdateAccount();
  
  const [formData, setFormData] = useState({
    account_name: '',
    account_type: 'cash',
    initial_balance: 0,
    currency: 'VND',
    description: '',
  });

  useEffect(() => {
    if (account) {
      setFormData({
        account_name: account.account_name,
        account_type: account.account_type,
        initial_balance: account.initial_balance,
        currency: 'VND',
        description: '',
      });
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    updateAccount.mutate({
      accountId: account.account_id,
      account: formData,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!open || !account) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">Edit Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Account Name</label>
            <input type="text" value={formData.account_name} onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Account Type</label>
            <select value={formData.account_type} onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="credit_card">Credit Card</option>
              <option value="investment">Investment</option>
              <option value="savings">Savings</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Initial Balance (VND)</label>
            <input type="number" value={formData.initial_balance} onChange={(e) => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required min="0" />
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Currency</label>
            <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" required>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={updateAccount.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {updateAccount.isPending ? 'Updating...' : 'Update Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
