import type { Transaction } from '@/api/transactions';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';

interface Category {
  category_id: string;
  category_name: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onViewDetails: (transaction: Transaction) => void;
}

const TYPE_COLOR: Record<string, string> = {
  income: 'text-primary',
  expense: 'text-destructive',
}

export function TransactionTable({ transactions, categories, onEdit, onDelete, onViewDetails }: TransactionTableProps) {
  const { t } = useTranslation();
  const { formatDate, formatCurrency } = useLocaleFormat();
  const catMap = Object.fromEntries(categories.map(c => [String(c.category_id), c.category_name]));
  const normalizedType = (type: string) => type === 'income' ? 'income' : 'expense';
  const typeLabel = (type: string) => t(`types.${normalizedType(type)}`);

  if (transactions.length === 0) {
    return (
      <AppCard className="rounded-[var(--radius)] p-8 text-center text-muted-foreground">
        {t('transactions.empty')}
      </AppCard>
    );
  }

  return (
    <AppCard className="rounded-[var(--radius)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.date')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.type')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.category')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.note')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.location')}</th>
            <th className="text-right p-4 text-muted-foreground text-sm font-medium">{t('transactions.amount')}</th>
            <th className="text-center p-4 text-muted-foreground text-sm font-medium">{t('transactions.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.transaction_id}
              className="border-b border-border/50 hover:bg-muted/40 transition-all cursor-pointer"
              onClick={() => onViewDetails(tx)}
            >
              <td className="p-4 text-foreground/80 text-sm">{formatDate(tx.transaction_date)}</td>
              <td className="p-4">
                <span className={`text-xs font-medium ${TYPE_COLOR[normalizedType(tx.type)]}`}>
                  {typeLabel(tx.type)}
                </span>
              </td>
              <td className="p-4 text-foreground text-sm">
                {catMap[String(tx.category_id)] ?? `#${tx.category_id}`}
              </td>
              <td className="p-4 text-foreground/70 text-sm max-w-[200px] truncate">{tx.note || '—'}</td>
              <td className="p-4 text-foreground/70 text-sm max-w-[200px] truncate">{tx.location || '—'}</td>
              <td className={`p-4 text-right font-bold tabular-nums text-sm ${TYPE_COLOR[normalizedType(tx.type)]}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                    className="px-3 py-1 text-xs bg-muted border border-border rounded-lg text-foreground hover:bg-muted/80 transition-all"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(tx.transaction_id); }}
                    className="px-3 py-1 text-xs bg-destructive/20 border border-destructive/30 rounded-lg text-destructive hover:bg-destructive/30 transition-all"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AppCard>
  );
}
