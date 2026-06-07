import type { Account } from '@/api/accounts';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: number) => void;
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

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

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getAccountIcon(account.account_type)}</span>
          <div>
            <h3 className="text-white font-medium">{account.account_name}</h3>
            <p className="text-white/60 text-sm capitalize">{account.account_type}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 bg-white/10 border border-white/18 rounded-lg text-white/60 hover:text-white hover:bg-white/20 transition-all"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(account.account_id)}
            className="p-1.5 bg-[#dd9787]/20 border border-[#dd9787]/30 rounded-lg text-[#dd9787]/60 hover:text-[#dd9787] hover:bg-[#dd9787]/30 transition-all"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/60 text-sm">Balance</span>
          <span className="text-white font-bold tabular-nums">{formatCurrency(account.initial_balance)} VND</span>
        </div>
      </div>
    </div>
  );
}
