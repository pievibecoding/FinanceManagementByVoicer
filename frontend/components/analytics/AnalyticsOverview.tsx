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
      color: 'text-[#74d3ae]',
      bgColor: 'bg-[#74d3ae]/10',
      borderColor: 'border-[#74d3ae]/30',
    },
    {
      label: 'Total Expense',
      value: formatCurrency(data.total_expense),
      color: 'text-[#dd9787]',
      bgColor: 'bg-[#dd9787]/10',
      borderColor: 'border-[#dd9787]/30',
    },
    {
      label: 'Total Investment',
      value: formatCurrency(data.total_investment),
      color: 'text-[#a78bfa]',
      bgColor: 'bg-[#a78bfa]/10',
      borderColor: 'border-[#a78bfa]/30',
    },
    {
      label: 'Net Balance',
      value: formatCurrency(data.net_balance),
      color: data.net_balance >= 0 ? 'text-[#74d3ae]' : 'text-[#dd9787]',
      bgColor: data.net_balance >= 0 ? 'bg-[#74d3ae]/10' : 'bg-[#dd9787]/10',
      borderColor: data.net_balance >= 0 ? 'border-[#74d3ae]/30' : 'border-[#dd9787]/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`${card.bgColor} ${card.borderColor} border rounded-[0.625rem] p-4 backdrop-blur-sm`}
        >
          <p className="text-white/60 text-sm mb-1">{card.label}</p>
          <p className={`${card.color} text-2xl font-bold`}>{card.value}</p>
        </div>
      ))}
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-4 backdrop-blur-sm md:col-span-2 lg:col-span-4">
        <p className="text-white/60 text-sm mb-1">Total Transactions</p>
        <p className="text-white text-2xl font-bold">{data.transaction_count}</p>
      </div>
    </div>
  );
}
