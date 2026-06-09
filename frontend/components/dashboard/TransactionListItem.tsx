import { Transaction } from '@/api/dashboard';

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      '1': '🍔', '2': '🚗', '3': '🏠', '4': '💡',
      '5': '🎬', '6': '💊', '7': '🛒', '8': '💰', '9': '📈',
    };
    return icons[categoryId] || '📁';
  };

  const isIncome = transaction.type === 'income';

  return (
    <div
      className="flex items-center justify-between p-4 bg-card border border-border rounded-[var(--radius)] backdrop-blur-sm hover:bg-muted/40 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getCategoryIcon(transaction.category_id)}</span>
        <div>
          <p className="text-foreground font-medium">{transaction.note || 'Transaction'}</p>
          <p className="text-muted-foreground text-sm">{formatDate(transaction.transaction_date)}</p>
        </div>
      </div>
      <span className={`font-bold tabular-nums ${isIncome ? 'text-primary' : 'text-destructive'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} VND
      </span>
    </div>
  );
}
