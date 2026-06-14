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
  current_balance: number;
  color?: string | null;
}

export interface Transaction {
  transaction_id: string;
  transaction_date: string;
  account_id: number;
  category_id: string;
  amount: number;
  type: string;
  transaction_type?: string | null;
  operation_type?: string | null;
  source_account_id?: number | null;
  destination_account_id?: number | null;
  savings_id?: number | null;
  debt_id?: number | null;
  note: string;
  user_id: number;
  payee_id: number | null;
  location?: string | null;
  transfer_context?: {
    direction: 'in' | 'out' | 'pair';
    source_label: string;
    destination_label: string;
    related_kind: 'account' | 'savings' | 'debt' | null;
    related_id?: number | string | null;
    source_account_id?: number | null;
    destination_account_id?: number | null;
    destination_savings_id?: number | null;
    account_id?: number | null;
    debt_id?: number | null;
  } | null;
  cash_flow?: {
    source_label: string;
    destination_label: string;
    source_account_id?: number | null;
    destination_account_id?: number | null;
    savings_id?: number | null;
    debt_id?: number | null;
    operation_type: string;
  } | null;
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

  async getBudgets(month?: string): Promise<Budget[]> {
    const params = month ? `?month=${month}` : '';
    return request<Budget[]>(`/api/budgets${params}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },
};
