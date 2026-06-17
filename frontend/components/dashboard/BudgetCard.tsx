import { useLocaleFormat } from '@/hooks/useLocaleFormat';
import { AppCard } from '@/components/common';
import { budgetMeterColors } from '@/styles/tokens';

interface BudgetCardProps {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  onClick?: () => void;
}

export function BudgetCard({ category, limit, spent, remaining, onClick }: BudgetCardProps) {
  const { formatCurrency } = useLocaleFormat();
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const meterColor = percentage > 100
    ? budgetMeterColors.danger
    : percentage >= 70
      ? budgetMeterColors.warning
      : budgetMeterColors.safe;

  return (
    <AppCard
      interactive
      className="rounded-[var(--radius)] p-4"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-foreground font-medium">{category}</span>
        <span className="text-xs font-semibold" style={{ color: meterColor }}>
          {percentage.toFixed(0)}%
        </span>
      </div>

      <div className="w-full bg-border/40 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: meterColor,
          }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{formatCurrency(spent)}</span>
        <span className="text-muted-foreground">/ {formatCurrency(limit)}</span>
      </div>
    </AppCard>
  );
}
