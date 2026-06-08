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

export interface Category {
  category_id: string;
  user_id: number;
  category_name: string;
  category_type: string;
  icon: string;
  color: string;
}

export const categoriesApi = {
  async getCategories(): Promise<Category[]> {
    return request<Category[]>('/api/categories', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async addCategory(category: {
    category_name: string;
    category_type: string;
    icon: string;
    color: string;
  }): Promise<{ message: string; category_id: string }> {
    return request('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });
  },

  async updateCategory(categoryId: string, category: {
    category_name?: string;
    category_type?: string;
    icon?: string;
    color?: string;
  }): Promise<{ message: string }> {
    return request(`/api/categories/${categoryId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(category),
    });
  },

  async deleteCategory(categoryId: string): Promise<{ message: string }> {
    return request(`/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};
