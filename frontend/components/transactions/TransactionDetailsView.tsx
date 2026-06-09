import type { Transaction } from '@/api/transactions';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

interface TransactionDetailsViewProps {
  transaction: Transaction | null;
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
}

export function TransactionDetailsView({ transaction, onClose, onEdit, onDelete }: TransactionDetailsViewProps) {
  const { t } = useTranslation();
  const { formatDateTime, formatCurrency } = useLocaleFormat();

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
          <h2 className="text-xl font-bold text-foreground">{t('transactions.details')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
            <span className="text-3xl">{getCategoryIcon(transaction.category_id)}</span>
            <div>
              <p className="text-foreground font-medium">{transaction.note || t('transactions.fallbackName')}</p>
              <p className="text-muted-foreground text-sm">{t('transactions.categoryId')}: {transaction.category_id}</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isIncome ? 'bg-primary/10 border border-primary/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <p className="text-muted-foreground text-sm mb-1">{t('transactions.amount')}</p>
            <p className={`text-2xl font-bold tabular-nums ${isIncome ? 'text-primary' : 'text-destructive'}`}>
              {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">{t('transactions.date')}</p>
              <p className="text-foreground">{formatDateTime(transaction.transaction_date)}</p>
            </div>
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">{t('transactions.type')}</p>
              <p className="text-foreground capitalize">{t(`types.${transaction.type}`, transaction.type)}</p>
            </div>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground text-sm mb-1">{t('transactions.accountId')}</p>
            <p className="text-foreground">{transaction.account_id}</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-lg">
            <p className="text-muted-foreground text-sm mb-1">{t('transactions.transactionId')}</p>
            <p className="text-foreground text-sm">{transaction.transaction_id}</p>
          </div>

          {transaction.location && (
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">{t('transactions.location')}</p>
              <p className="text-foreground">{transaction.location}</p>
            </div>
          )}

          {transaction.splits && transaction.splits.length > 0 && (
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-2">{t('transactions.splits')}</p>
              <div className="space-y-2">
                {transaction.splits.map((split, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-foreground">{split.category_id}</span>
                    <span className="text-foreground">{formatCurrency(split.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={() => onEdit(transaction)} className="flex-1 px-4 py-2 bg-muted border border-border rounded-lg text-foreground hover:bg-muted/80 transition-all">
              {t('common.edit')}
            </button>
            <button onClick={() => onDelete(transaction.transaction_id)} className="flex-1 px-4 py-2 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive hover:bg-destructive/30 transition-all">
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
