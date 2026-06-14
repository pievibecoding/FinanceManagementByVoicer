import type { Account } from '@/api/accounts';
import { useTranslation } from 'react-i18next';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import { getAccountDisplayColor } from '@/lib/account-display';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: number) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useLocaleFormat();
  const accountColor = getAccountDisplayColor(account);

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      cash: '💵',
      Cash: '💵',
      bank: '🏦',
      Bank: '🏦',
      credit_card: '💳',
      savings: '🏦',
      wallet: '👛',
      'E-Wallet': '👛',
    };
    return icons[type] || '💰';
  };

  const accountTypeLabel = (type: string) => {
    const keyMap: Record<string, string> = {
      cash: 'accounts.cash',
      Cash: 'accounts.cash',
      bank: 'accounts.bank',
      Bank: 'accounts.bank',
      credit_card: 'accounts.creditCard',
      savings: 'accounts.savings',
      wallet: 'accounts.wallet',
      'E-Wallet': 'accounts.wallet',
    };
    return t(keyMap[type] ?? type, type);
  };

  return (
    <AppCard
      interactive
      role="button"
      tabIndex={0}
      className="rounded-[var(--radius)] p-4"
      style={{ borderColor: `${accountColor}99` }}
      onClick={() => onEdit(account)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEdit(account);
        }
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-full text-2xl"
            style={{ backgroundColor: `${accountColor}22`, color: accountColor }}
          >
            {getAccountIcon(account.account_type)}
          </span>
          <div>
            <h3 className="text-foreground font-medium">{account.account_name}</h3>
            <p className="text-muted-foreground text-sm capitalize">{accountTypeLabel(account.account_type)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={(event) => { event.stopPropagation(); onEdit(account); }} className="p-1.5 bg-muted border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all">✏️</button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(account.account_id); }} className="p-1.5 bg-destructive/20 border border-destructive/30 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/30 transition-all">🗑️</button>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">{t('accounts.balance')}</span>
          <span className="text-foreground font-bold tabular-nums">{formatCurrency(account.current_balance)}</span>
        </div>
      </div>
    </AppCard>
  );
}
