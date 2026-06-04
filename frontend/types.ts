export interface Account {
  account_id: string;
  account_name: string;
  initial_balance: number;
  current_balance: number;
}

export interface Category {
  category_id: string;
  category_name: string;
  budget: number; // Hạn mức tháng
}

export interface Transaction {
  transaction_id: string;
  transaction_date: string;
  account_id: string;
  category_id: string;
  amount: number;
  type: 'income' | 'expense' | 'investment';
  note: string;
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
