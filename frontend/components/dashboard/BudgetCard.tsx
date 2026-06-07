interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  onClick?: () => void;
}

export function BudgetCard({ category, limit, spent, remaining, onClick }: BudgetCardProps) {
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  
  const getProgressColor = () => {
    if (percentage < 50) return 'bg-[#74d3ae]';
    if (percentage < 80) return 'bg-[#f6e7cb]';
    return 'bg-[#dd9787]';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  return (
    <div 
      className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{category}</span>
        <span className={`text-xs ${percentage >= 80 ? 'text-[#dd9787]' : percentage >= 50 ? 'text-[#f6e7cb]' : 'text-[#74d3ae]'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <div className="w-full bg-white/10 rounded-full h-2 mb-2">
        <div 
          className={`${getProgressColor()} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-white/60">{formatCurrency(spent)} VND</span>
        <span className="text-white/60">/ {formatCurrency(limit)} VND</span>
      </div>
    </div>
  );
}
