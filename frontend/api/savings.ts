export interface Savings {
  savings_id: number
  user_id: number
  name: string
  category: string | null
  target_amount: number
  current_balance: number
  interest_rate: number | null
  target_date: string | null
  linked_account_id: string | null
  status: string
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

export async function getSavings(): Promise<Savings[]> {
  return request<Savings[]>('/api/savings', {
    method: 'GET',
    credentials: 'include',
  })
}

export async function createSavings(data: Partial<Savings>): Promise<void> {
  return request('/api/savings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

export async function updateSavings(savingsId: number, data: Partial<Savings>): Promise<void> {
  return request(`/api/savings/${savingsId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

export async function deleteSavings(savingsId: number): Promise<void> {
  return request(`/api/savings/${savingsId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
}

export async function getSavingsContributions(savingsId: number): Promise<SavingsContribution[]> {
  return request<SavingsContribution[]>(`/api/savings/${savingsId}/contributions`, {
    method: 'GET',
    credentials: 'include',
  })
}

export async function createSavingsContribution(savingsId: number, data: Partial<SavingsContribution>): Promise<void> {
  return request(`/api/savings/${savingsId}/contributions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  })
}
