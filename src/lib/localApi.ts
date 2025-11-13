// API client for local SQLite server
const API_URL = 'http://localhost:3000/api';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
}

class LocalApi {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
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
  }

  // Auth methods
  async signUp(data: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    birth_date?: string;
  }): Promise<AuthResponse> {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.token = response.token;
    localStorage.setItem('authToken', response.token);
    return response;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = response.token;
    localStorage.setItem('authToken', response.token);
    return response;
  }

  async signOut(): Promise<void> {
    await this.request('/auth/signout', { method: 'POST' });
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/auth/me');
  }

  // Profile methods
  async getProfile(): Promise<User> {
    return this.request('/profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Products methods
  async getProducts(categoryId?: string) {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/products${query}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async createProduct(data: any) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: any) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories methods
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data: any) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Cart methods
  async getCart() {
    return this.request('/cart');
  }

  async addToCart(productId: string, quantity: number = 1) {
    return this.request('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity }),
    });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request(`/cart/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async removeFromCart(itemId: string) {
    return this.request(`/cart/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Orders methods
  async getOrders() {
    return this.request('/orders');
  }

  async createOrder(data: { shipping_address: string; phone: string }) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(orderId: string, status: string) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const localApi = new LocalApi();
