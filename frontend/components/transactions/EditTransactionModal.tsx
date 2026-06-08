import { useState, useEffect } from 'react';
import { useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import type { Transaction } from '@/api/transactions';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function EditTransactionModal({ open, onOpenChange, transaction }: EditTransactionModalProps) {
  const updateTransaction = useUpdateTransaction();
  const { data: accounts } = useAccounts();
  
  const [formData, setFormData] = useState({
    transaction_date: '',
    account_id: 0,
    category_id: '',
    amount: 0,
    type: 'expense',
    note: '',
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date.split('T')[0],
        account_id: transaction.account_id,
        category_id: transaction.category_id,
        amount: transaction.amount,
        type: transaction.type,
        note: transaction.note,
      });
    }
  }, [transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    
    updateTransaction.mutate({
      transactionId: transaction.transaction_id,
      transaction: formData,
    }, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  if (!open || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-white/18 rounded-[0.625rem] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Edit Transaction</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-1">Date</label>
            <input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Account</label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              required
            >
              <option value="">Select Account</option>
              {accounts?.map((account) => (
                <option key={account.account_id} value={account.account_id}>
                  {account.account_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Category ID</label>
            <input
              type="text"
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              required
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Amount (VND)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              required
              min="0"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              required
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="investment">Investment</option>
            </select>
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-1">Note</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3 py-2 bg-white/10 border border-white/18 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#74d3ae]"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/18 rounded-lg text-white hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateTransaction.isPending}
              className="flex-1 px-4 py-2 bg-[#74d3ae] border border-[#74d3ae] rounded-lg text-white hover:bg-[#74d3ae]/80 transition-all disabled:opacity-50"
            >
              {updateTransaction.isPending ? 'Updating...' : 'Update Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
