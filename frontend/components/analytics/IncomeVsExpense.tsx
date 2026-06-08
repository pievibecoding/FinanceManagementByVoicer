interface IncomeVsExpenseProps {
  data: {
    income: number;
    expense: number;
    investment: number;
  };
}

export function IncomeVsExpense({ data }: IncomeVsExpenseProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const total = data.income + data.expense + data.investment;
  const incomePercentage = total > 0 ? (data.income / total) * 100 : 0;
  const expensePercentage = total > 0 ? (data.expense / total) * 100 : 0;
  const investmentPercentage = total > 0 ? (data.investment / total) * 100 : 0;

  const items = [
    {
      label: 'Income',
      value: data.income,
      color: '#74d3ae',
      bgColor: 'bg-[#74d3ae]',
      borderColor: 'border-[#74d3ae]/30',
      percentage: incomePercentage,
    },
    {
      label: 'Expense',
      value: data.expense,
      color: '#dd9787',
      bgColor: 'bg-[#dd9787]',
      borderColor: 'border-[#dd9787]/30',
      percentage: expensePercentage,
    },
    {
      label: 'Investment',
      value: data.investment,
      color: '#a78bfa',
      bgColor: 'bg-[#a78bfa]',
      borderColor: 'border-[#a78bfa]/30',
      percentage: investmentPercentage,
    },
  ];

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-6">
      <h3 className="text-lg font-bold text-white mb-4">Income vs Expense vs Investment</h3>
      
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${item.bgColor}`} />
                <span className="text-white font-medium">{item.label}</span>
              </div>
              <div className="text-right">
                <span className="text-white font-medium">{formatCurrency(item.value)}</span>
                <span className="text-white/40 text-sm ml-2">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`${item.bgColor} h-2 rounded-full transition-all`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/60">Total</span>
          <span className="text-white font-bold">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}
