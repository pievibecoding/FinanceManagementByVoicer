import { useState, useEffect } from 'react';
import { useUpdateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import type { Transaction } from '@/api/transactions';

interface EditTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

const INPUT_CLS = 'w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary';

export function EditTransactionModal({ open, onOpenChange, transaction }: EditTransactionModalProps) {
  const updateTransaction = useUpdateTransaction();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  const [formData, setFormData] = useState({
    transaction_date: '',
    account_id: 0,
    category_id: '',
    amount: 0,
    type: 'expense',
    note: '',
    location: '',
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        transaction_date: transaction.transaction_date.slice(0, 10),
        account_id: transaction.account_id,
        category_id: String(transaction.category_id),
        amount: transaction.amount,
        type: transaction.type,
        note: transaction.note,
        location: transaction.location || '',
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

    updateTransaction.mutate({
      transactionId: transaction.transaction_id,
      transaction: { ...formData, transaction_date: transactionDate },
    }, {
      onSuccess: () => { onOpenChange(false); },
    });
  };

  if (!open || !transaction) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-foreground mb-4">Sửa giao dịch</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-muted-foreground text-sm mb-1">Ngày</label>
            <input type="date" value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className={INPUT_CLS} required />
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Tài khoản</label>
            <select value={formData.account_id}
              onChange={(e) => setFormData({ ...formData, account_id: Number(e.target.value) })}
              className={INPUT_CLS} required>
              <option value="">-- Chọn tài khoản --</option>
              {accounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>{a.account_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Loại giao dịch</label>
            <select value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className={INPUT_CLS} required>
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
              <option value="investment">Đầu tư</option>
            </select>
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Danh mục</label>
            <select value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className={INPUT_CLS} required>
              <option value="">-- Chọn danh mục --</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Số tiền (VND)</label>
            <input type="number" value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              className={INPUT_CLS} required min="1" />
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Ghi chú</label>
            <textarea value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className={INPUT_CLS} rows={2} />
          </div>

          <div>
            <label className="block text-muted-foreground text-sm mb-1">Địa điểm</label>
            <input type="text" value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={INPUT_CLS} placeholder="Địa điểm giao dịch..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2 bg-secondary border border-border rounded-lg text-secondary-foreground hover:bg-secondary/80 transition-all">
              Hủy
            </button>
            <button type="submit" disabled={updateTransaction.isPending}
              className="flex-1 px-4 py-2 bg-primary rounded-lg text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
              {updateTransaction.isPending ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
