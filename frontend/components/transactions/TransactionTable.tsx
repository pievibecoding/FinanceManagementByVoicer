import type { Transaction } from '@/api/transactions';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import { cashDirectionForTransaction, isPositiveTransactionType, operationTypeForTransaction } from '@/lib/transaction-types';
import { Pencil, Trash2 } from 'lucide-react';

interface Category {
  category_id: string;
  category_name: string;
}

interface Account {
  account_id: number;
  account_name: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onViewDetails: (transaction: Transaction) => void;
}

const TYPE_COLOR: Record<string, string> = {
  income: 'text-primary',
  expense: 'text-destructive',
  transfer: 'text-muted-foreground',
}

export function TransactionTable({ transactions, categories, accounts, onEdit, onDelete, onViewDetails }: TransactionTableProps) {
  const { t } = useTranslation();
  const { formatDate, formatCurrency } = useLocaleFormat();
  const catMap = Object.fromEntries(categories.map(c => [String(c.category_id), c.category_name]));
  const accountMap = Object.fromEntries(accounts.map(account => [String(account.account_id), account.account_name]));
  const normalizedType = (tx: Transaction) => {
    const op = operationTypeForTransaction(tx)
    if (op !== 'income' && op !== 'expense') return 'transfer'
    return op
  };
  const typeLabel = (tx: Transaction) => t(`operationTypes.${operationTypeForTransaction(tx)}`, t(`types.${normalizedType(tx)}`));
  const accountLabel = (accountId: number) => accountMap[String(accountId)] ?? `#${accountId}`;
  const categoryLabel = (categoryId: string) => catMap[String(categoryId)] ?? `#${categoryId}`;
  const sourceLabel = (tx: Transaction) => {
    if (tx.cash_flow?.source_label) return tx.cash_flow.source_label;
    if (tx.transfer_context?.source_label) return tx.transfer_context.source_label;
    const operationType = operationTypeForTransaction(tx);
    if (operationType === 'expense') return accountLabel(tx.account_id);
    if (operationType === 'income') return categoryLabel(tx.category_id);
    if (tx.type === 'out' || tx.type === 'transfer_out') return accountLabel(tx.account_id);
    return tx.note || t('common.none');
  };
  const destinationLabel = (tx: Transaction) => {
    if (tx.cash_flow?.destination_label) return tx.cash_flow.destination_label;
    if (tx.transfer_context?.destination_label) return tx.transfer_context.destination_label;
    const operationType = operationTypeForTransaction(tx);
    if (operationType === 'income') return accountLabel(tx.account_id);
    if (operationType === 'expense') return categoryLabel(tx.category_id);
    if (tx.type === 'in' || tx.type === 'transfer_in') return accountLabel(tx.account_id);
    return tx.note || t('common.none');
  };

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
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.source')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.destination')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.note')}</th>
            <th className="text-left p-4 text-muted-foreground text-sm font-medium">{t('transactions.location')}</th>
            <th className="text-right p-4 text-muted-foreground text-sm font-medium">{t('transactions.amount')}</th>
            <th className="text-center p-4 text-muted-foreground text-sm font-medium">{t('transactions.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const operationType = operationTypeForTransaction(tx);
            const isInternalMovement = !['income', 'expense'].includes(operationType);
            const source = sourceLabel(tx);
            const destination = destinationLabel(tx);

            return (
              <tr
                key={tx.transaction_id}
                className="border-b border-border/50 hover:bg-muted/40 transition-all cursor-pointer"
                onClick={() => onViewDetails(tx)}
              >
                <td className="p-4 text-foreground/80 text-sm">{formatDate(tx.transaction_date)}</td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${TYPE_COLOR[normalizedType(tx)]}`}>
                    {typeLabel(tx)}
                  </span>
                </td>
                <td className="p-4 text-foreground text-sm">
                  {isInternalMovement ? t(`operationTypes.${operationType}`) : catMap[String(tx.category_id)] ?? `#${tx.category_id}`}
                </td>
                <td className="p-4 text-sm max-w-[180px]">
                  <span className="block truncate font-medium text-foreground">{source}</span>
                </td>
                <td className="p-4 text-sm max-w-[180px]">
                  <span className="block truncate font-medium text-foreground">{destination}</span>
                </td>
                <td className="p-4 text-sm max-w-[220px]">
                  <span className="block truncate text-foreground/70">{tx.note || '—'}</span>
                </td>
                <td className="p-4 text-foreground/70 text-sm max-w-[200px] truncate">{tx.location || '—'}</td>
                <td className={`p-4 text-right font-bold tabular-nums text-sm ${TYPE_COLOR[normalizedType(tx)]}`}>
                  {isInternalMovement ? formatCurrency(tx.amount) : `${isPositiveTransactionType(cashDirectionForTransaction(tx)) ? '+' : '-'}${formatCurrency(tx.amount)}`}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition-all hover:bg-muted/80 hover:text-foreground"
                      aria-label={t('common.edit')}
                      title={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(tx.transaction_id); }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/20 text-destructive transition-all hover:bg-destructive/30"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AppCard>
  );
}
