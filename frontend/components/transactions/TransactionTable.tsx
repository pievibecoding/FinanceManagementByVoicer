import type { Transaction } from '@/api/transactions';

interface Category {
  category_id: string;
  category_name: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onViewDetails: (transaction: Transaction) => void;
}

const TYPE_LABEL: Record<string, string> = {
  income: 'Thu nhập',
  expense: 'Chi tiêu',
  investment: 'Đầu tư',
}
const TYPE_COLOR: Record<string, string> = {
  income: 'text-[#74d3ae]',
  expense: 'text-[#dd9787]',
  investment: 'text-sky-400',
}

export function TransactionTable({ transactions, categories, onEdit, onDelete, onViewDetails }: TransactionTableProps) {
  const catMap = Object.fromEntries(categories.map(c => [String(c.category_id), c.category_name]));

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  if (transactions.length === 0) {
    return (
      <div className="bg-white/6 border border-white/18 rounded-[0.625rem] p-8 text-center text-white/60">
        Không có giao dịch nào
      </div>
    );
  }

  return (
    <div className="bg-white/6 border border-white/18 rounded-[0.625rem] overflow-hidden backdrop-blur-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/18">
            <th className="text-left p-4 text-white/60 text-sm font-medium">Ngày</th>
            <th className="text-left p-4 text-white/60 text-sm font-medium">Loại</th>
            <th className="text-left p-4 text-white/60 text-sm font-medium">Danh mục</th>
            <th className="text-left p-4 text-white/60 text-sm font-medium">Ghi chú</th>
            <th className="text-right p-4 text-white/60 text-sm font-medium">Số tiền</th>
            <th className="text-center p-4 text-white/60 text-sm font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.transaction_id}
              className="border-b border-white/10 hover:bg-white/10 transition-all cursor-pointer"
              onClick={() => onViewDetails(tx)}
            >
              <td className="p-4 text-white/80 text-sm">{formatDate(tx.transaction_date)}</td>
              <td className="p-4">
                <span className={`text-xs font-medium ${TYPE_COLOR[tx.type] ?? 'text-white/60'}`}>
                  {TYPE_LABEL[tx.type] ?? tx.type}
                </span>
              </td>
              <td className="p-4 text-white text-sm">
                {catMap[String(tx.category_id)] ?? `#${tx.category_id}`}
              </td>
              <td className="p-4 text-white/70 text-sm max-w-[200px] truncate">{tx.note || '—'}</td>
              <td className={`p-4 text-right font-bold tabular-nums text-sm ${TYPE_COLOR[tx.type] ?? 'text-white'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}đ
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(tx); }}
                    className="px-3 py-1 text-xs bg-white/10 border border-white/18 rounded-lg text-white hover:bg-white/20 transition-all"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(tx.transaction_id); }}
                    className="px-3 py-1 text-xs bg-[#dd9787]/20 border border-[#dd9787]/30 rounded-lg text-[#dd9787] hover:bg-[#dd9787]/30 transition-all"
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
