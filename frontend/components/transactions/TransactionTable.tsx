import type { Transaction } from '@/api/transactions';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onViewDetails: (transaction: Transaction) => void;
}

export function TransactionTable({ transactions, onEdit, onDelete, onViewDetails }: TransactionTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, string> = {
      '1': '🍔',
      '2': '🚗',
      '3': '🏠',
      '4': '💡',
      '5': '🎬',
      '6': '💊',
      '7': '🛒',
      '8': '💰',
      '9': '📈',
    };
    return icons[categoryId] || '📁';
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-8 text-center text-white/60">
        No transactions found
      </div>
    );
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] overflow-hidden backdrop-blur-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/18">
            <th className="text-left p-4 text-white/60 text-sm font-medium">Date</th>
            <th className="text-left p-4 text-white/60 text-sm font-medium">Category</th>
            <th className="text-left p-4 text-white/60 text-sm font-medium">Note</th>
            <th className="text-right p-4 text-white/60 text-sm font-medium">Amount</th>
            <th className="text-center p-4 text-white/60 text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isIncome = transaction.type === 'income';
            return (
              <tr 
                key={transaction.transaction_id}
                className="border-b border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => onViewDetails(transaction)}
              >
                <td className="p-4 text-white">{formatDate(transaction.transaction_date)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(transaction.category_id)}</span>
                    <span className="text-white">{transaction.category_id}</span>
                  </div>
                </td>
                <td className="p-4 text-white">{transaction.note || '-'}</td>
                <td className={`p-4 text-right font-bold tabular-nums ${isIncome ? 'text-[#74d3ae]' : 'text-[#dd9787]'}`}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)} VND
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(transaction);
                      }}
                      className="px-3 py-1 text-sm bg-white/10 border border-white/18 rounded-lg text-white hover:bg-white/20 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(transaction.transaction_id);
                      }}
                      className="px-3 py-1 text-sm bg-[#dd9787]/20 border border-[#dd9787]/30 rounded-lg text-[#dd9787] hover:bg-[#dd9787]/30 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
