/**
 * PharmaOrder API Client Module
 * Manages JWT session tokens and backend HTTP requests
 */
const API_BASE_URL = '/api';

const API = {
  getToken() {
    return localStorage.getItem('pharma_jwt_token');
  },

  setToken(token) {
    localStorage.setItem('pharma_jwt_token', token);
  },

  removeToken() {
    localStorage.removeItem('pharma_jwt_token');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401 && !endpoint.includes('/auth/login')) {
        this.removeToken();
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        throw new Error('Session expired. Please sign in again.');
      }

      if (options.responseType === 'blob') {
        if (!response.ok) {
          throw new Error('Failed to download CSV export');
        }
        return await response.blob();
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP Error ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
      throw error;
    }
  },

  // Auth API calls
  async loginLocal(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async getCurrentUser() {
    return this.request('/auth/me');
  },

  // Order API calls
  async getOrders(search = '', status = 'All', date = '') {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);
    if (date) params.append('date', date);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/orders${queryString}`);
  },

  async getDailyReport(startDate = '', endDate = '') {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/orders/reports/daily${queryString}`);
  },

  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  async updateOrder(id, orderData) {
    return this.request(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
  },

  async settleOrder(id) {
    return this.request(`/orders/${id}/settle`, {
      method: 'POST',
    });
  },

  async deleteOrder(id) {
    return this.request(`/orders/${id}`, {
      method: 'DELETE',
    });
  },

  async downloadCsv(date = '', status = 'All', startDate = '', endDate = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (status && status !== 'All') params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const blob = await this.request(`/orders/export/csv${queryString}`, {
      method: 'GET',
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PharmaOrders_Daily_Report_${date || startDate || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
