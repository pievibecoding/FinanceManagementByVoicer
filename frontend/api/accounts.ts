import type { Account } from './dashboard';

export type { Account } from './dashboard';

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
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

export const accountsApi = {
  async getAccounts(): Promise<Account[]> {
    return request<Account[]>('/api/accounts', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async addAccount(account: {
    account_name: string;
    account_type: string;
    initial_balance: number;
    currency: string;
    description?: string;
  }): Promise<{ message: string; account_id: number }> {
    return request('/api/accounts', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(account),
    });
  },

  async updateAccount(accountId: number, account: {
    account_name?: string;
    account_type?: string;
    initial_balance?: number;
    currency?: string;
    description?: string;
  }): Promise<{ message: string }> {
    return request(`/api/accounts/${accountId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(account),
    });
  },

  async deleteAccount(accountId: number): Promise<{ message: string }> {
    return request(`/api/accounts/${accountId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};
