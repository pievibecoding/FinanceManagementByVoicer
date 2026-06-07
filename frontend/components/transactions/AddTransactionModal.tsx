import { useState } from 'react';
import { useAddTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useDashboard';

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionModal({ open, onOpenChange }: AddTransactionModalProps) {
  const addTransaction = useAddTransaction();
  const { data: accounts } = useAccounts();
  
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    account_id: 0,
    category_id: '',
    amount: 0,
    type: 'expense',
    note: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction.mutate(formData, {
      onSuccess: () => {
        onOpenChange(false);
        setFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          account_id: 0,
          category_id: '',
          amount: 0,
          type: 'expense',
          note: '',
        });
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] border border-white/18 rounded-[0.625rem] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Add Transaction</h2>
        
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
              disabled={addTransaction.isPending}
              className="flex-1 px-4 py-2 bg-[#74d3ae] border border-[#74d3ae] rounded-lg text-white hover:bg-[#74d3ae]/80 transition-all disabled:opacity-50"
            >
              {addTransaction.isPending ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
