export interface Budget {
  budget_id: number;
  category_id: number;
  month: string;
  amount_limit: number;
}

export const budgetsApi = {
  async getBudgets(month?: string): Promise<Budget[]> {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    const response = await fetch(`/api/budgets?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch budgets');
    }

    return response.json();
  },

  async upsertBudget(categoryId: number, amountLimit: number, month?: string): Promise<{ message: string; budget_id: number }> {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`/api/budgets/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount_limit: amountLimit,
        month: month,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upsert budget');
    }

    return response.json();
  },

  async deleteBudget(categoryId: number, month?: string): Promise<{ message: string }> {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    const response = await fetch(`/api/budgets/${categoryId}?${params.toString()}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete budget');
    }

    return response.json();
  },
};
