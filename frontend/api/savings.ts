export interface SavingsGoal {
  savings_id: number
  user_id: number
  name: string
  target_amount: number
  current_balance: number
  target_date: string | null
  linked_account_id: number | null
  status: 'active' | 'completed' | 'cancelled'
  note: string | null
  created_at: string
}

export interface SavingsContribution {
  contribution_id: number
  savings_id: number
  transaction_id: string | null
  contribution_date: string
  amount: number
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('finance_auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export const savingsApi = {
  getSavings(): Promise<SavingsGoal[]> {
    return apiFetch('/api/savings', { method: 'GET', headers: getAuthHeaders() })
  },
  createSavings(data: {
    name: string
    target_amount: number
    current_balance?: number
    target_date?: string | null
    linked_account_id?: number | null
    note?: string | null
  }): Promise<{ message: string; savings_id: number }> {
    return apiFetch('/api/savings', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  updateSavings(savingsId: number, data: Partial<Omit<SavingsGoal, 'savings_id' | 'user_id' | 'created_at'>>): Promise<{ message: string }> {
    return apiFetch(`/api/savings/${savingsId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  deleteSavings(savingsId: number): Promise<{ message: string }> {
    const token = localStorage.getItem('finance_auth_token')
    return apiFetch(`/api/savings/${savingsId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
  getContributions(savingsId: number): Promise<SavingsContribution[]> {
    return apiFetch(`/api/savings/${savingsId}/contributions`, { method: 'GET', headers: getAuthHeaders() })
  },
  createContribution(savingsId: number, data: {
    amount: number
    contribution_date: string
    account_id?: number | null
    note?: string | null
    transaction_id?: string | null
  }): Promise<{ message: string; contribution_id: number }> {
    return apiFetch(`/api/savings/${savingsId}/contributions`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  deleteContribution(savingsId: number, contributionId: number): Promise<{ message: string }> {
    const token = localStorage.getItem('finance_auth_token')
    return apiFetch(`/api/savings/${savingsId}/contributions/${contributionId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
}
