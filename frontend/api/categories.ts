// Auth calls go through Express BFF (same origin = no CORS issues)
const BASE = '';

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const requestBody = parseJsonBody(options.body);
  console.debug('[categoriesApi] request', {
    path,
    method: options.method,
    body: requestBody,
  });

  const res = await fetch(BASE + path, options);
  const responseText = await res.text();
  const responseBody = parseJsonText(responseText);

  if (!res.ok) {
    console.error('[categoriesApi] request failed', {
      path,
      method: options.method,
      status: res.status,
      statusText: res.statusText,
      requestBody,
      responseBody,
      responseText,
    });

    const message =
      responseBody && typeof responseBody.error === 'string'
        ? responseBody.error
        : responseBody && typeof responseBody.message === 'string'
          ? responseBody.message
          : `HTTP ${res.status}`;
    throw new Error(message);
  }

  console.debug('[categoriesApi] response', {
    path,
    status: res.status,
    body: responseBody,
  });

  return responseBody as T;
}

function parseJsonBody(body: BodyInit | null | undefined) {
  if (typeof body !== 'string') return undefined;
  return parseJsonText(body);
}

function parseJsonText(text: string) {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('finance_auth_token');
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
