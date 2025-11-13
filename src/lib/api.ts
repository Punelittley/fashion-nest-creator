// API клиент для работы с Express backend

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('api_base_url');
    if (override) return override.replace(/\/$/, '');
  }
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  return envUrl.replace(/\/$/, '');
};

const API_URL = getApiBaseUrl();

// Получить токен из localStorage
const getToken = () => localStorage.getItem('auth_token');

// Сохранить токен
export const setToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Удалить токен
export const removeToken = () => {
  localStorage.removeItem('auth_token');
};

// Базовый fetch с обработкой ошибок
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API
export const authApi = {
  signup: (email: string, password: string, fullName: string) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  signin: (email: string, password: string) =>
    apiFetch('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => apiFetch('/auth/me'),

  signout: () => {
    removeToken();
    return Promise.resolve();
  },
};

// Products API
export const productsApi = {
  getAll: (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return apiFetch(`/products${params}`);
  },

  getById: (id: string) => apiFetch(`/products/${id}`),

  create: (data: any) =>
    apiFetch('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch(`/products/${id}`, {
      method: 'DELETE',
    }),
};

// Categories API
export const categoriesApi = {
  getAll: () => apiFetch('/categories'),

  create: (data: any) =>
    apiFetch('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Cart API
export const cartApi = {
  get: () => apiFetch('/cart'),

  add: (product_id: string, quantity: number) =>
    apiFetch('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity }),
    }),

  update: (id: string, quantity: number) =>
    apiFetch(`/cart/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  remove: (id: string) =>
    apiFetch(`/cart/${id}`, {
      method: 'DELETE',
    }),

  clear: () =>
    apiFetch('/cart', {
      method: 'DELETE',
    }),
};

// Orders API
export const ordersApi = {
  get: () => apiFetch('/orders'),

  create: (shipping_address: string, phone: string) =>
    apiFetch('/orders', {
      method: 'POST',
      body: JSON.stringify({ shipping_address, phone }),
    }),

  getAll: () => apiFetch('/orders/all'),

  updateStatus: (id: string, status: string) =>
    apiFetch(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// Profile API
export const profileApi = {
  get: () => apiFetch('/profile'),

  update: (data: any) =>
    apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
