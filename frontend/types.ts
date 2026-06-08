export interface Account {
  account_id: number;
  account_name: string;
  initial_balance: number;
  current_balance: number;
}

export interface Category {
  category_id: number;
  category_name: string;
  budget: number; // Hạn mức tháng
}

export interface SplitItem {
  split_id?: number;
  category_id: number;
  amount: number;
  note?: string;
}

export interface Transaction {
  transaction_id: string;
  transaction_date: string;
  account_id: number;
  category_id: number | 'split';  // 'split' is the sentinel value for multi-category transactions
  amount: number;
  type: 'income' | 'expense' | 'investment';
  note: string;
  payee_id?: number | null;
  location?: string | null;
  splits?: SplitItem[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  parsedTransaction?: {
    amount: number;
    type: 'income' | 'expense' | 'investment';
    category: string;
    account: string;
    note: string;
    transaction_date: string;
  };
  sqlCommand?: string;
}

export interface AnalyticsResult {
  headers: string[];
  rows: any[][];
  description?: string;
  type: 'group_by' | 'budget_alert' | 'window_function' | 'custom';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  email?: string;
  name?: string;
  username?: string;
}

export interface Budget {
  budget_id: number;
  category_id: number;
  month: string;        // 'YYYY-MM'
  amount_limit: number;
}

export interface Payee {
  payee_id: number;
  payee_name: string;
  default_category_id: number | null;
}

export interface RecurringTransaction {
  recurring_id: number;
  account_id: number;
  category_id: number;
  payee_id: number | null;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  note: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;
  end_date: string | null;
  is_active: number;
}

export interface Artifact {
  id: string;
  html: string;
  status: 'streaming' | 'completed' | 'error';
  styleName: string;
}

export interface Debt {
  debt_id: number;
  user_id: number;
  name: string;
  debt_type: string;
  lender: string | null;
  principal: number;
  outstanding_balance: number;
  interest_rate: number | null;
  interest_type: string | null;
  start_date: string | null;
  due_date: string | null;
  minimum_payment: number | null;
  payment_frequency: string;
  status: string;
  note: string | null;
  created_at: string;
}

export interface DebtPayment {
  payment_id: number;
  debt_id: number;
  transaction_id: string | null;
  payment_date: string;
  amount_paid: number;
  principal_portion: number;
  interest_portion: number;
}

export interface Savings {
  savings_id: number;
  user_id: number;
  name: string;
  category: string | null;
  target_amount: number;
  current_balance: number;
  interest_rate: number | null;
  target_date: string | null;
  linked_account_id: string | null;
  status: string;
  note: string | null;
  created_at: string;
}

export interface SavingsContribution {
  contribution_id: number;
  savings_id: number;
  transaction_id: string | null;
  contribution_date: string;
  amount: number;
}
