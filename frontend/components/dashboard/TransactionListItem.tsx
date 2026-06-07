import { Transaction } from '@/api/dashboard';

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getCategoryIcon = (categoryId: string) => {
    // Simple icon mapping - can be expanded
    const icons: Record<string, string> = {
      '1': '🍔', // Food
      '2': '🚗', // Transport
      '3': '🏠', // Housing
      '4': '💡', // Utilities
      '5': '🎬', // Entertainment
      '6': '💊', // Healthcare
      '7': '🛒', // Shopping
      '8': '💰', // Income
      '9': '📈', // Investment
    };
    return icons[categoryId] || '📁';
  };

  const isIncome = transaction.type === 'income';

  return (
    <div 
      className="flex items-center justify-between p-4 bg-white/6 border border-white/18 rounded-[0.625rem] backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getCategoryIcon(transaction.category_id)}</span>
        <div>
          <p className="text-white font-medium">{transaction.note || 'Transaction'}</p>
          <p className="text-white/60 text-sm">{formatDate(transaction.transaction_date)}</p>
        </div>
      </div>
      <span className={`font-bold tabular-nums ${isIncome ? 'text-[#74d3ae]' : 'text-[#dd9787]'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} VND
      </span>
    </div>
  );
}
