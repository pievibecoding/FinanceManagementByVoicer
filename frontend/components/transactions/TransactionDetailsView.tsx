import type { Transaction } from '@/api/transactions';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { Button } from '@/components/ui/button';
import { isPositiveTransactionType, isTransferTransactionType } from '@/lib/transaction-types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const isTransfer = isTransferTransactionType(transaction.type);
  const isPositive = isPositiveTransactionType(transaction.type);
  const normalizedType = isTransfer ? 'transfer' : isIncome ? 'income' : 'expense';

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('transactions.details')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
            <span className="text-3xl">{getCategoryIcon(transaction.category_id)}</span>
            <div>
              <p className="text-foreground font-medium">{transaction.note || t('transactions.fallbackName')}</p>
              <p className="text-muted-foreground text-sm">{t('transactions.categoryId')}: {transaction.category_id}</p>
            </div>
          </div>

          <div className={`p-4 rounded-lg ${isTransfer ? 'bg-muted/30 border border-border' : isIncome ? 'bg-primary/10 border border-primary/30' : 'bg-destructive/10 border border-destructive/30'}`}>
            <p className="text-muted-foreground text-sm mb-1">{t('transactions.amount')}</p>
            <p className={`text-2xl font-bold tabular-nums ${isTransfer ? 'text-muted-foreground' : isIncome ? 'text-primary' : 'text-destructive'}`}>
              {isPositive ? '+' : '-'}{formatCurrency(transaction.amount)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">{t('transactions.date')}</p>
              <p className="text-foreground">{formatDateTime(transaction.transaction_date)}</p>
            </div>
            <div className="p-3 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">{t('transactions.type')}</p>
              <p className="text-foreground capitalize">{t(`types.${normalizedType}`)}</p>
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
            <Button variant="secondary" onClick={() => onEdit(transaction)} className="flex-1">
              {t('common.edit')}
            </Button>
            <Button variant="destructive" onClick={() => onDelete(transaction.transaction_id)} className="flex-1">
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
