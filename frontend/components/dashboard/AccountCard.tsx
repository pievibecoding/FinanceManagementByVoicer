import { Account } from '@/api/dashboard';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  const getAccountIcon = (type: string) => {
    const icons: Record<string, string> = {
      'Bank': '🏦',
      'Cash': '💵',
      'Credit Card': '💳',
      'Other': '📁',
    };
    return icons[type] || '📁';
  };

  const getAccountColor = (type: string) => {
    const colors: Record<string, string> = {
      'Bank': 'border-[#678d58]',
      'Cash': 'border-[#74d3ae]',
      'Credit Card': 'border-purple-500',
      'Other': 'border-gray-500',
    };
    return colors[type] || 'border-gray-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <div 
      className={`bg-white/6 border ${getAccountColor(account.account_type)} rounded-[0.625rem] p-4 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getAccountIcon(account.account_type)}</span>
          <span className="text-white font-medium">{account.account_name}</span>
        </div>
      </div>
      
      <p className="text-white text-xl font-bold tabular-nums mb-1">
        {formatCurrency(account.initial_balance)} VND
      </p>
      
      <p className="text-white/60 text-sm capitalize">{account.account_type}</p>
    </div>
  );
}
