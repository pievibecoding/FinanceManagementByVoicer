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
    if (percentage < 50) return 'bg-primary';
    if (percentage < 80) return 'bg-amber-400';
    return 'bg-destructive';
  };

  const getTextColor = () => {
    if (percentage < 50) return 'text-primary';
    if (percentage < 80) return 'text-amber-400';
    return 'text-destructive';
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount);

  return (
    <div
      className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm hover:bg-muted/40 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-foreground font-medium">{category}</span>
        <span className={`text-xs font-semibold ${getTextColor()}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="w-full bg-border/40 rounded-full h-2 mb-2">
        <div
          className={`${getProgressColor()} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatCurrency(spent)} VND</span>
        <span className="text-muted-foreground">/ {formatCurrency(limit)} VND</span>
      </div>
    </div>
  );
}
