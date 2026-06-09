import { Account } from '@/api/dashboard';
import { accountBorderColors } from '@/styles/tokens';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      'Bank': '🏦', 'Cash': '💵', 'Credit Card': '💳', 'Other': '📁',
    };
    return icons[type] || '📁';
  };

  const getAccountBorderColor = (type: string): string =>
    accountBorderColors[type] ?? '';

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

  return (
    <div
      className="bg-card border rounded-[var(--radius)] p-4 backdrop-blur-sm hover:bg-muted/40 transition-all cursor-pointer"
      style={{ borderColor: getAccountBorderColor(account.account_type) || undefined }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getAccountIcon(account.account_type)}</span>
          <span className="text-foreground font-medium">{account.account_name}</span>
        </div>
      </div>

      <p className="text-foreground text-xl font-bold tabular-nums mb-1">
        {formatCurrency(account.initial_balance)} VND
      </p>

      <p className="text-muted-foreground text-sm capitalize">{account.account_type}</p>
    </div>
  );
}
