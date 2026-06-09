import type { CategorySpending } from '@/api/analytics';

interface SpendingByCategoryProps {
  data: CategorySpending[];
}

export function SpendingByCategory({ data }: SpendingByCategoryProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Spending by Category</h3>
        <div className="text-muted-foreground text-center py-8">No data available</div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.total_amount));

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Spending by Category</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.category_name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium capitalize">{item.category_name}</span>
                <span className="text-muted-foreground text-sm capitalize">({item.category_type})</span>
              </div>
              <div className="text-right">
                <span className="text-foreground font-medium">{formatCurrency(item.total_amount)}</span>
                <span className="text-muted-foreground text-sm ml-2">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-border/40 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(item.total_amount / maxAmount) * 100}%` }} />
            </div>
            <div className="text-muted-foreground text-sm">
              {item.transaction_count} transaction{item.transaction_count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
