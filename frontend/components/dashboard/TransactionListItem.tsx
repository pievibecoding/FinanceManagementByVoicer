import { Transaction } from '@/api/dashboard';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const { t } = useTranslation();
  const { formatDate, formatCurrency } = useLocaleFormat();

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      '1': '🍔', '2': '🚗', '3': '🏠', '4': '💡',
      '5': '🎬', '6': '💊', '7': '🛒', '8': '💰', '9': '📈',
    };
    return icons[categoryId] || '📁';
  };

  const isIncome = transaction.type === 'income';

  return (
    <AppCard
      interactive
      className="flex items-center justify-between rounded-[var(--radius)] p-4"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getCategoryIcon(transaction.category_id)}</span>
        <div>
          <p className="text-foreground font-medium">{transaction.note || t('transactions.fallbackName')}</p>
          <p className="text-muted-foreground text-sm">{formatDate(transaction.transaction_date)}</p>
        </div>
      </div>
      <span className={`font-bold tabular-nums ${isIncome ? 'text-primary' : 'text-destructive'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
      </span>
    </AppCard>
  );
}
