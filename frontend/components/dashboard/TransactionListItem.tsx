import { Transaction } from '@/api/dashboard';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import { cashDirectionForTransaction, isPositiveTransactionType, operationTypeForTransaction } from '@/lib/transaction-types';

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

  const operationType = operationTypeForTransaction(transaction);
  const isIncome = operationType === 'income';
  const isInternalMovement = !['income', 'expense'].includes(operationType);
  const isPositive = isPositiveTransactionType(cashDirectionForTransaction(transaction));
  const transferFlow = transaction.cash_flow
    ? `${transaction.cash_flow.source_label} → ${transaction.cash_flow.destination_label}`
    : transaction.transfer_context
      ? `${transaction.transfer_context.source_label} → ${transaction.transfer_context.destination_label}`
    : '';

  return (
    <AppCard
      interactive
      className="flex items-center justify-between rounded-[var(--radius)] p-4"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{getCategoryIcon(transaction.category_id)}</span>
        <div>
          <p className="text-foreground font-medium">
            {isInternalMovement && transferFlow ? transferFlow : transaction.note || t('transactions.fallbackName')}
          </p>
          <p className="text-muted-foreground text-sm">
            {isInternalMovement && transaction.note ? transaction.note : formatDate(transaction.transaction_date)}
          </p>
        </div>
      </div>
      <span className={`font-bold tabular-nums ${isInternalMovement ? 'text-muted-foreground' : isIncome ? 'text-primary' : 'text-destructive'}`}>
        {isInternalMovement ? formatCurrency(transaction.amount) : `${isPositive ? '+' : '-'}${formatCurrency(transaction.amount)}`}
      </span>
    </AppCard>
  );
}
