export interface Debt {
  debt_id: number
  user_id: number
  name: string
  debt_type: string
  lender: string | null
  debtor: string | null
  principal: number
  outstanding_balance: number
  interest_rate: number | null
  interest_type: string | null
  start_date: string | null
  due_date: string | null
  minimum_payment: number | null
  payment_frequency: string
  status: string
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

// Auth calls go through Express BFF (same origin = no CORS issues)
const BASE = ''

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, options)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getDebts(): Promise<Debt[]> {
  return request<Debt[]>('/api/debts', {
    method: 'GET',
    credentials: 'include',
  })
}

export async function createDebt(data: Partial<Debt>): Promise<void> {
  return request('/api/debts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

export async function updateDebt(debtId: number, data: Partial<Debt>): Promise<void> {
  return request(`/api/debts/${debtId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

export async function deleteDebt(debtId: number): Promise<void> {
  return request(`/api/debts/${debtId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function getDebtPayments(debtId: number): Promise<DebtPayment[]> {
  return request<DebtPayment[]>(`/api/debts/${debtId}/payments`, {
    method: 'GET',
    credentials: 'include',
  })
}

export async function createDebtPayment(debtId: number, data: Partial<DebtPayment>): Promise<void> {
  return request(`/api/debts/${debtId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}
