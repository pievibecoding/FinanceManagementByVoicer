import type { Account } from '@/api/accounts';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: number) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      cash: '💵',
      bank: '🏦',
      credit_card: '💳',
      investment: '📈',
      savings: '🏦',
      wallet: '👛',
    };
    return icons[type] || '💰';
  };

  const accountTypeLabel = (type: string) => {
    const keyMap: Record<string, string> = {
      cash: 'accounts.cash',
      bank: 'accounts.bank',
      credit_card: 'accounts.creditCard',
      investment: 'accounts.investment',
      savings: 'accounts.savings',
      wallet: 'accounts.wallet',
    };
    return t(keyMap[type] ?? type, type);
  };

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm hover:bg-muted/40 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getAccountIcon(account.account_type)}</span>
          <div>
            <h3 className="text-foreground font-medium">{account.account_name}</h3>
            <p className="text-muted-foreground text-sm capitalize">{accountTypeLabel(account.account_type)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onEdit(account)} className="p-1.5 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">✏️</button>
          <button onClick={() => onDelete(account.account_id)} className="p-1.5 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/30 transition-all">🗑️</button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">{t('accounts.balance')}</span>
          <span className="text-foreground font-bold tabular-nums">{formatCurrency(account.initial_balance)}</span>
        </div>
      </div>
    </div>
  );
}
