import type { MonthlyTrend } from '@/api/analytics';

interface MonthlyTrendsProps {
  data: MonthlyTrend[];
}

export function MonthlyTrends({ data }: MonthlyTrendsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-[var(--radius)] p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Monthly Trends</h3>
        <div className="text-muted-foreground text-center py-8">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.income, d.expense, d.investment)));

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Monthly Trends</h3>
      <div className="space-y-4">
        {data.map((trend) => (
          <div key={trend.month} className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">{trend.month}</span>
              <div className="flex gap-4 text-sm">
                <span className="text-primary">Income: {formatCurrency(trend.income)}</span>
                <span className="text-destructive">Expense: {formatCurrency(trend.expense)}</span>
                <span className="text-sky-400">Investment: {formatCurrency(trend.investment)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">Income</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(trend.income / maxValue) * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">Expense</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-destructive h-2 rounded-full transition-all" style={{ width: `${(trend.expense / maxValue) * 100}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 text-muted-foreground text-xs">Invest</div>
                <div className="flex-1 bg-border/40 rounded-full h-2">
                  <div className="bg-sky-400 h-2 rounded-full transition-all" style={{ width: `${(trend.investment / maxValue) * 100}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground text-sm">Net</span>
              <span className={`text-sm font-medium ${trend.net >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {formatCurrency(trend.net)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
