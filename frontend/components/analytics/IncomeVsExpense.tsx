interface IncomeVsExpenseProps {
  data: {
    income: number;
    expense: number;
    investment: number;
  };
}

export function IncomeVsExpense({ data }: IncomeVsExpenseProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const total = data.income + data.expense + data.investment;
  const incomePercentage = total > 0 ? (data.income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (data.expense / total) * 100 : 0;
  const investmentPercentage = total > 0 ? (data.investment / total) * 100 : 0;

  const items = [
    { label: 'Income',     value: data.income,     barClass: 'bg-primary',     textClass: 'text-primary',     percentage: incomePercentage },
    { label: 'Expense',    value: data.expense,    barClass: 'bg-destructive',  textClass: 'text-destructive',  percentage: expensePercentage },
    { label: 'Investment', value: data.investment, barClass: 'bg-sky-400',      textClass: 'text-sky-400',      percentage: investmentPercentage },
  ];

  return (
    <div className="bg-card border border-border rounded-[var(--radius)] p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">Income vs Expense vs Investment</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.barClass}`} />
                <span className="text-foreground font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-foreground font-medium">{formatCurrency(item.value)}</span>
                <span className="text-muted-foreground text-sm ml-2">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-border/40 rounded-full h-2">
              <div className={`${item.barClass} h-2 rounded-full transition-all`} style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total</span>
          <span className="text-foreground font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
