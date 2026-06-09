import type { Transaction } from '@/api/transactions';

interface TransactionDetailsViewProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

export function TransactionDetailsView({ transaction, onClose, onEdit, onDelete }: TransactionDetailsViewProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      '1': '🍔',
      '2': '🚗',
      '3': '🏠',
      '4': '💡',
      '5': '🎬',
      '6': '💊',
      '7': '🛒',
      '8': '💰',
      '9': '📈',
    };
    return icons[categoryId] || '📁';
  };

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-popover border border-border rounded-[var(--radius)] p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Transaction Details</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
            <span className="text-3xl">{getCategoryIcon(transaction.category_id)}</span>
            <div>
              <p className="text-foreground font-medium">{transaction.note || 'Transaction'}</p>
              <p className="text-muted-foreground text-sm">Category ID: {transaction.category_id}</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isIncome ? 'bg-primary/10 border border-primary/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <p className="text-muted-foreground text-sm mb-1">Amount</p>
            <p className={`text-2xl font-bold tabular-nums ${isIncome ? 'text-primary' : 'text-destructive'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} VND
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">Date</p>
              <p className="text-foreground">{formatDate(transaction.transaction_date)}</p>
            </div>
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">Type</p>
              <p className="text-foreground capitalize">{transaction.type}</p>
            </div>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground text-sm mb-1">Account ID</p>
            <p className="text-foreground">{transaction.account_id}</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground text-sm mb-1">Transaction ID</p>
            <p className="text-foreground text-sm">{transaction.transaction_id}</p>
          </div>

          {transaction.location && (
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">Địa điểm</p>
              <p className="text-foreground">{transaction.location}</p>
            </div>
          )}

          {transaction.splits && transaction.splits.length > 0 && (
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-2">Splits</p>
              <div className="space-y-2">
                {transaction.splits.map((split, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-foreground">{split.category_id}</span>
                    <span className="text-foreground">{formatCurrency(split.amount)} VND</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={() => onEdit(transaction)} className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground hover:bg-muted/80 transition-all">
              Edit
            </button>
            <button onClick={() => onDelete(transaction.transaction_id)} className="flex-1 px-4 py-2 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive hover:bg-destructive/30 transition-all">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
