import { Account, Category, Transaction, AnalyticsResult } from './types';

// Dữ liệu ban đầu
export const initialAccounts: Account[] = [
  { account_id: 'momo', account_name: 'Ví MoMo', initial_balance: 5000000, current_balance: 5000000 },
  { account_id: 'vcb', account_name: 'Ngân hàng VCB', initial_balance: 45000000, current_balance: 45000000 },
  { account_id: 'vps', account_name: 'Tài khoản VPS', initial_balance: 200000000, current_balance: 200000000 },
  { account_id: 'cash', account_name: 'Tiền mặt', initial_balance: 2000000, current_balance: 2000000 }
];

export const initialCategories: Category[] = [
  { category_id: 'food', category_name: 'Ăn uống', budget: 4000000 },
  { category_id: 'salary', category_name: 'Tiền lương', budget: 0 },
  { category_id: 'investment', category_name: 'Đầu tư chứng khoán', budget: 0 },
  { category_id: 'transport', category_name: 'Di chuyển', budget: 1500000 },
  { category_id: 'shopping', category_name: 'Mua sắm', budget: 3000000 },
  { category_id: 'entertainment', category_name: 'Giải trí', budget: 2000000 },
  { category_id: 'study', category_name: 'Học tập', budget: 2000000 },
  { category_id: 'health', category_name: 'Sức khỏe', budget: 1000000 },
  { category_id: 'other', category_name: 'Khác', budget: 1500000 }
];

export const initialTransactions: Transaction[] = [];

// Định dạng số tiền tệ VND
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Sửa đổi số dư tài khoản động dựa trên dữ liệu giao dịch
export const computeBalances = (
  accounts: Account[],
  transactions: Transaction[]
): Account[] => {
  return accounts.map(acc => {
    let balance = acc.initial_balance;
    transactions.forEach(t => {
      if (t.account_id === acc.account_id) {
        if (t.type === 'income') {
          balance += t.amount;
        } else if (t.type === 'expense') {
          balance -= t.amount;
        } else if (t.type === 'investment') {
          // Đầu tư là luân chuyển dòng tiền, giả định rút tiền từ tài khoản nguồn để tăng tài sản đầu tư
          balance -= t.amount;
        }
      }
    });
    return {
      ...acc,
      current_balance: balance
    };
  });
};

/**
 * Trình mô phỏng SQL đơn giản cho mục đích demo Portfolio.
 * Hỗ trợ các mẫu truy vấn cơ bản, trung cấp, nâng cao.
 */
export const evaluateSQLQuery = (
  queryText: string,
  state: { accounts: Account[]; categories: Category[]; transactions: Transaction[] }
): AnalyticsResult => {
  const normQuery = queryText.toLowerCase().replace(/\s+/g, ' ').trim();

  // 1. SELECT * FROM Account_Dim
  if (normQuery.includes('select * from account_dim') || normQuery.includes('from account_dim')) {
    const calculatedAccounts = computeBalances(state.accounts, state.transactions);
    return {
      headers: ['account_id', 'account_name', 'initial_balance', 'current_balance'],
      rows: calculatedAccounts.map(a => [a.account_id, a.account_name, formatCurrency(a.initial_balance), formatCurrency(a.current_balance)]),
      type: 'custom',
      description: 'Hiển thị dữ liệu thực thể từ bảng chiều tài khoản (Account_Dim).'
    };
  }

  // 2. SELECT * FROM Category_Dim
  if (normQuery.includes('select * from category_dim') || normQuery.includes('from category_dim')) {
    return {
      headers: ['category_id', 'category_name', 'budget'],
      rows: state.categories.map(c => [c.category_id, c.category_name, c.budget > 0 ? formatCurrency(c.budget) : 'N/A']),
      type: 'custom',
      description: 'Hiển thị dữ liệu thực thể từ bảng chiều danh mục chi tiêu (Category_Dim).'
    };
  }

  // 3. Advanced: Window function running sum
  if (normQuery.includes('over') && (normQuery.includes('sum') || normQuery.includes('partition') || normQuery.includes('running'))) {
    // Sắp xếp các giao dịch theo ngày tăng dần
    const sortedTx = [...state.transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    let cumSum = 0;
    
    // Tính tổng số dư lũy kế từ số dư ban đầu của tất cả các tài khoản
    const startBalanceTotal = state.accounts.reduce((sum, a) => sum + a.initial_balance, 0);
    let runningBalance = startBalanceTotal;

    const rows = sortedTx.map(t => {
      const amtChange = t.type === 'income' ? t.amount : -t.amount;
      runningBalance += amtChange;
      
      const categoryObj = state.categories.find(c => c.category_id === t.category_id);
      const accountObj = state.accounts.find(a => a.account_id === t.account_id);

      return [
        t.transaction_date,
        accountObj?.account_name || t.account_id,
        categoryObj?.category_name || t.category_id,
        t.type === 'income' ? '+' + formatCurrency(t.amount) : '-' + formatCurrency(t.amount),
        t.type.toUpperCase(),
        formatCurrency(runningBalance),
        t.note
      ];
    });

    return {
      headers: ['transaction_date', 'account_name', 'category_name', 'amount_change', 'type', 'running_balance', 'note'],
      rows: rows,
      type: 'window_function',
      description: 'Kỹ thuật SQL nâng cao: Sử dụng Window Function SUM() OVER(...) để tính toán số dư thực tế tích lũy (Running Total) theo thời gian.'
    };
  }

  // 4. Group by & join (GROUP BY Category)
  if (normQuery.includes('group by') && (normQuery.includes('category_name') || normQuery.includes('category_id'))) {
    const sums: { [key: string]: number } = {};
    
    // Chỉ tính toán chi phí (expenses) khi tính chi tiêu theo danh mục
    state.transactions.forEach(t => {
      if (t.type === 'expense') {
        sums[t.category_id] = (sums[t.category_id] || 0) + t.amount;
      }
    });

    const rows = state.categories
      .map(c => {
        const spent = sums[c.category_id] || 0;
        return [c.category_name, formatCurrency(spent), spent];
      })
      .filter(row => row[2] as number > 0) // Chỉ hiện danh mục đã tiêu
      .sort((a, b) => (b[2] as number) - (a[2] as number))
      .map(row => [row[0], row[1]]);

    return {
      headers: ['category_name', 'total_spent_amount'],
      rows: rows,
      type: 'group_by',
      description: 'Tổng hợp phân tích dữ liệu nhóm: Sử dụng GROUP BY và hàm tập hợp SUM() để thống kê tổng mức chi tiêu thực tế trên mỗi danh mục.'
    };
  }

  // 5. Left Join & Budget Alerts
  if (normQuery.includes('left join') || normQuery.includes('budget') || normQuery.includes('limit')) {
    const sums: { [key: string]: number } = {};
    state.transactions.forEach(t => {
      if (t.type === 'expense') {
        sums[t.category_id] = (sums[t.category_id] || 0) + t.amount;
      }
    });

    const rows = state.categories
      .filter(c => c.budget > 0) // Chỉ xem danh mục có đặt hạn mức
      .map(c => {
        const spent = sums[c.category_id] || 0;
        const diff = c.budget - spent;
        const status = diff < 0 ? '❌ VƯỢT HẠN MỨC' : spent > c.budget * 0.8 ? '⚠️ CẬN NGƯỠNG (80%)' : '✅ AN TOÀN';
        return [
          c.category_name,
          formatCurrency(c.budget),
          formatCurrency(spent),
          formatCurrency(diff),
          status
        ];
      });

    return {
      headers: ['category_name', 'budget_limit', 'actual_spent', 'remaining_budget', 'alert_status'],
      rows: rows,
      type: 'budget_alert',
      description: 'Phân tích so sánh hạn mức (Budget Evaluation): LEFT JOIN bảng Danh mục với Thực tế giao dịch để truy vấn cảnh báo chi tiêu vượt ngưỡng.'
    };
  }

  // 6. Mặc định SELECT * FROM Transaction_Fact
  const sortedTransactions = [...state.transactions].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
  const rows = sortedTransactions.map(t => {
    const categoryName = state.categories.find(c => c.category_id === t.category_id)?.category_name || t.category_id;
    const accountName = state.accounts.find(a => a.account_id === t.account_id)?.account_name || t.account_id;
    return [
      t.transaction_id,
      t.transaction_date,
      accountName,
      categoryName,
      formatCurrency(t.amount),
      t.type.toUpperCase(),
      t.note
    ];
  });

  return {
    headers: ['transaction_id', 'transaction_date', 'account_name', 'category_name', 'amount', 'type', 'note'],
    rows: rows,
    type: 'custom',
    description: 'Hiển thị toàn bộ lịch sử chi tiết giao dịch từ bảng sự kiện trung tâm (Transaction_Fact) - SAP xếp mới nhất lên đầu.'
  };
};
