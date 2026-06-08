import type { CategorySpending } from '@/api/analytics';

interface SpendingByCategoryProps {
  data: CategorySpending[];
}

export function SpendingByCategory({ data }: SpendingByCategoryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-6">
        <h3 className="text-lg font-bold text-white mb-4">Spending by Category</h3>
        <div className="text-white/60 text-center py-8">No data available</div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.total_amount));

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-6">
      <h3 className="text-lg font-bold text-white mb-4">Spending by Category</h3>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.category_name} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium capitalize">{item.category_name}</span>
                <span className="text-white/40 text-sm capitalize">({item.category_type})</span>
              </div>
              <div className="text-right">
                <span className="text-white font-medium">{formatCurrency(item.total_amount)}</span>
                <span className="text-white/40 text-sm ml-2">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-[#74d3ae] h-2 rounded-full transition-all"
                style={{ width: `${(item.total_amount / maxAmount) * 100}%` }}
              />
            </div>
            <div className="text-white/40 text-sm">
              {item.transaction_count} transaction{item.transaction_count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
