import { useAuth } from '@/contexts/AuthContext';

// Auth calls go through Express BFF (same origin = no CORS issues)
const BASE = '';

async function request<T>(path: string, options: RequestInit): Promise<T> {
  console.log('API request:', path, options);
  const res = await fetch(BASE + path, options);
  console.log('API response status:', res.status, res.statusText);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error('API error body:', body);
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  console.log('API response data:', data);
  return data;
}

function getAuthHeaders() {
  const token = localStorage.getItem('finance_auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export interface Account {
  account_id: number;
  user_id: number;
  account_name: string;
  account_type: string;
  initial_balance: number;
}

export interface Transaction {
  transaction_id: string;
  transaction_date: string;
  account_id: number;
  category_id: string;
  amount: number;
  type: string;
  note: string;
  user_id: number;
  payee_id: number | null;
  splits: any[];
}

export interface Budget {
  budget_id: number;
  category_id: number;
  month: string;
  amount_limit: number;
}

export const dashboardApi = {
  async getAccounts(): Promise<Account[]> {
    return request<Account[]>('/api/accounts', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getTransactions(): Promise<Transaction[]> {
    return request<Transaction[]>('/api/transactions', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getBudgets(month?: string): Promise<Budget[]> {
    const params = month ? `?month=${month}` : '';
    return request<Budget[]>(`/api/budgets${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },
};
