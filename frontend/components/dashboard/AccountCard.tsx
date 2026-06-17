import { Account } from '@/api/dashboard';
import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import { getAccountDisplayColor } from '@/lib/account-display';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  const { formatCurrency } = useLocaleFormat();

  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      'Bank': '🏦', 'Cash': '💵', 'Credit Card': '💳', 'Other': '📁',
    };
    return icons[type] || '📁';
  };

  const accountColor = getAccountDisplayColor(account);

  return (
    <AppCard
      interactive
      className="rounded-[var(--radius)] p-4"
      style={{ borderColor: `${accountColor}99` }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="grid size-10 place-items-center rounded-full text-2xl"
            style={{ backgroundColor: `${accountColor}22`, color: accountColor }}
          >
            {getAccountIcon(account.account_type)}
          </span>
          <span className="text-foreground font-medium">{account.account_name}</span>
        </div>
      </div>

      <p className="text-foreground text-xl font-bold tabular-nums mb-1">
        {formatCurrency(account.current_balance)}
      </p>

      <p className="text-muted-foreground text-sm capitalize">{account.account_type}</p>
    </AppCard>
  );
}
