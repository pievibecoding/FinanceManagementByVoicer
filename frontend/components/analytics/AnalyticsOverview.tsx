import type { AnalyticsOverview } from '@/api/analytics';

interface AnalyticsOverviewProps {
  data: AnalyticsOverview;
}

export function AnalyticsOverview({ data }: AnalyticsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const cards = [
    {
      label: 'Total Income',
      value: formatCurrency(data.total_income),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
    {
      label: 'Total Expense',
      value: formatCurrency(data.total_expense),
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/30',
    },
    {
      label: 'Total Investment',
      value: formatCurrency(data.total_investment),
      color: 'text-sky-400',
      bgColor: 'bg-sky-400/10',
      borderColor: 'border-sky-400/30',
    },
    {
      label: 'Net Balance',
      value: formatCurrency(data.net_balance),
      color: data.net_balance >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: data.net_balance >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      borderColor: data.net_balance >= 0 ? 'border-primary/30' : 'border-destructive/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`${card.bgColor} ${card.borderColor} border rounded-[var(--radius)] p-4 backdrop-blur-sm`}>
          <p className="text-muted-foreground text-sm mb-1">{card.label}</p>
          <p className={`${card.color} text-2xl font-bold`}>{card.value}</p>
        </div>
      ))}
      <div className="bg-card border border-border rounded-[var(--radius)] p-4 backdrop-blur-sm md:col-span-2 lg:col-span-4">
        <p className="text-muted-foreground text-sm mb-1">Total Transactions</p>
        <p className="text-foreground text-2xl font-bold">{data.transaction_count}</p>
      </div>
    </div>
  );
}
