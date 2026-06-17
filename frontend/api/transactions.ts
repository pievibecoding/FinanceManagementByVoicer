import type { Transaction } from './dashboard';

export type { Transaction } from './dashboard';

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

export const transactionsApi = {
  async getTransactions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    categoryId?: string;
    accountId?: string;
    search?: string;
  }): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('start_date', filters.startDate);
    if (filters?.endDate) params.append('end_date', filters.endDate);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.categoryId) params.append('category_id', filters.categoryId);
    if (filters?.accountId) params.append('account_id', filters.accountId);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    return request<Transaction[]>(`/api/transactions${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async addTransaction(transaction: {
    transaction_date: string;
    account_id: number;
    category_id: string;
    amount: number;
    type: string;
    operation_type?: string;
    source_account_id?: number | null;
    destination_account_id?: number | null;
    savings_id?: number | null;
    debt_id?: number | null;
    note: string;
    payee_id?: number;
    location?: string;
  }): Promise<{ message: string; transaction_id: string }> {
    return request('/api/transactions', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    });
  },

  async updateTransaction(transactionId: string, transaction: {
    transaction_date?: string;
    account_id?: number;
    category_id?: string;
    amount?: number;
    type?: string;
    operation_type?: string;
    source_account_id?: number | null;
    destination_account_id?: number | null;
    savings_id?: number | null;
    debt_id?: number | null;
    note?: string;
    payee_id?: number;
    location?: string;
  }): Promise<{ message: string }> {
    return request(`/api/transactions/${transactionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    });
  },

  async updateTransferTransaction(transactionId: string, transaction: {
    transaction_date: string;
    amount: number;
    note?: string;
    location?: string;
    account_id?: number;
    from_account_id?: number;
    to_account_id?: number;
    savings_id?: number;
    debt_id?: number;
  }): Promise<{ message: string }> {
    return request(`/api/transactions/${transactionId}/transfer`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(transaction),
    });
  },

  async deleteTransaction(transactionId: string): Promise<{ message: string }> {
    return request(`/api/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};
