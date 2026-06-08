export interface Debt {
  debt_id: number
  user_id: number
  name: string
  debt_type: 'debt' | 'loan'
  lender: string | null
  debtor: string | null
  principal: number
  outstanding_balance: number
  start_date: string | null
  due_date: string | null
  status: 'active' | 'settled' | 'overdue'
  note: string | null
  created_at: string
}

export interface DebtPayment {
  payment_id: number
  debt_id: number
  transaction_id: string | null
  payment_date: string
  amount_paid: number
  principal_portion: number
  interest_portion: number
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

export const debtsApi = {
  getDebts(): Promise<Debt[]> {
    return apiFetch('/api/debts', { method: 'GET', headers: getAuthHeaders() })
  },
  createDebt(data: {
    name: string
    debt_type: 'debt' | 'loan'
    lender?: string | null
    debtor?: string | null
    principal: number
    outstanding_balance?: number
    start_date?: string | null
    due_date?: string | null
    note?: string | null
  }): Promise<{ message: string; debt_id: number }> {
    return apiFetch('/api/debts', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  updateDebt(debtId: number, data: Partial<Omit<Debt, 'debt_id' | 'user_id' | 'created_at'>>): Promise<{ message: string }> {
    return apiFetch(`/api/debts/${debtId}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  deleteDebt(debtId: number): Promise<{ message: string }> {
    const token = localStorage.getItem('finance_auth_token')
    return apiFetch(`/api/debts/${debtId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
  getPayments(debtId: number): Promise<DebtPayment[]> {
    return apiFetch(`/api/debts/${debtId}/payments`, { method: 'GET', headers: getAuthHeaders() })
  },
  createPayment(debtId: number, data: { amount_paid: number; payment_date: string; transaction_id?: string | null }): Promise<{ message: string; payment_id: number }> {
    return apiFetch(`/api/debts/${debtId}/payments`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
  },
  deletePayment(debtId: number, paymentId: number): Promise<{ message: string }> {
    const token = localStorage.getItem('finance_auth_token')
    return apiFetch(`/api/debts/${debtId}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
}
