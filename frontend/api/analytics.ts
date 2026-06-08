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

export interface AnalyticsOverview {
  total_income: number;
  total_expense: number;
  total_investment: number;
  net_balance: number;
  transaction_count: number;
}

export interface CategorySpending {
  category_name: string;
  category_type: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  investment: number;
  net: number;
}

export const analyticsApi = {
  async getOverview(startDate?: string, endDate?: string): Promise<AnalyticsOverview> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return request<AnalyticsOverview>(`/api/analytics/overview?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getSpendingByCategory(startDate?: string, endDate?: string): Promise<CategorySpending[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return request<CategorySpending[]>(`/api/analytics/spending-by-category?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getIncomeVsExpense(startDate?: string, endDate?: string): Promise<{ income: number; expense: number; investment: number }> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    return request(`/api/analytics/income-vs-expense?${params.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async getMonthlyTrends(months: number = 12): Promise<MonthlyTrend[]> {
    return request<MonthlyTrend[]>(`/api/analytics/monthly-trends?months=${months}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },
};
