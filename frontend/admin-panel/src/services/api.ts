import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3006/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false, // Disable sending cookies
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024 // 10MB
});

// Enable request debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  async (error) => {
    // Handle network errors
    if (!error.response) {
      console.error('[API Network Error]', error.message);
      
      // Check if it's a timeout error
      if (error.code === 'ECONNABORTED') {
        return Promise.reject(new Error('Request timed out. Please try again.'));
      }
      
      // Check if it's a network error
      if (error.message.includes('Network Error')) {
        return Promise.reject(new Error('Network error. Please check your connection and try again.'));
      }
      
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }
    
    console.error('[API Response Error]', error.response?.status, error.response?.data || error.message);
    
    const originalRequest = error.config;
    
    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        const response = await api.post('/auth/refresh-token', { refreshToken });
        const { accessToken } = response.data.data;
        
        // Update token
        localStorage.setItem('token', accessToken);
        
        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Login
  login: (email: string, password: string, mfaToken?: string) => {
    const data = mfaToken ? { email, password, mfaToken } : { email, password };
    return api.post('/auth/login', data);
  },
  
  // Register
  register: (userData: { firstName: string; lastName: string; email: string; password: string }) => {
    return api.post('/auth/register', userData);
  },
  
  // Logout
  logout: () => {
    return api.post('/auth/logout');
  },
  
  // Get current user
  getCurrentUser: () => {
    return api.get('/users/me');
  },
  
  // Request password reset
  requestPasswordReset: (email: string) => {
    return api.post('/auth/request-password-reset', { email });
  },
  
  // Alias for requestPasswordReset to maintain backward compatibility
  forgotPassword: (data: { email: string }) => {
    return api.post('/auth/request-password-reset', { email: data.email });
  },
  
  // Verify reset token
  verifyResetToken: (token: string) => {
    return api.get(`/auth/reset-password/${token}`);
  },
  
  // Reset password
  resetPassword: (token: string, { password }: { password: string }) => {
    return api.post(`/auth/reset-password/${token}`, { password });
  },
  
  // Setup MFA
  setupMFA: () => {
    return api.post('/auth/setup-mfa');
  },
  
  // Verify MFA
  verifyMFA: (token: string) => {
    return api.post('/auth/verify-mfa', { token });
  }
};

// User API
export const userAPI = {
  // Get all users
  getUsers: (page = 1, limit = 10) => {
    return api.get(`/users?page=${page}&limit=${limit}`);
  },
  
  // Get user by ID
  getUser: (id: string) => {
    return api.get(`/users/${id}`);
  },
  
  // Update user
  updateUser: (id: string, userData: any) => {
    return api.put(`/users/${id}`, userData);
  },
  
  // Delete user
  deleteUser: (id: string) => {
    return api.delete(`/users/${id}`);
  },
  
  // Change user role
  changeRole: (id: string, role: string) => {
    return api.patch(`/users/${id}/role`, { role });
  }
};

// Account API
export const accountAPI = {
  // Get user accounts
  getUserAccounts: (userId: string) => {
    return api.get(`/accounts/user/${userId}`);
  },
  
  // Get account by ID
  getAccount: (id: string) => {
    return api.get(`/accounts/${id}`);
  },
  
  // Create account
  createAccount: (accountData: any) => {
    return api.post('/accounts', accountData);
  },
  
  // Update account
  updateAccount: (id: string, accountData: any) => {
    return api.put(`/accounts/${id}`, accountData);
  },
  
  // Delete account
  deleteAccount: (id: string) => {
    return api.delete(`/accounts/${id}`);
  }
};

// Transaction API
export const transactionAPI = {
  // Get transactions
  getTransactions: (page = 1, limit = 10, filters = {}) => {
    return api.get('/transactions', { params: { page, limit, ...filters } });
  },
  
  // Get transaction by ID
  getTransaction: (id: string) => {
    return api.get(`/transactions/${id}`);
  },
  
  // Create transaction
  createTransaction: (transactionData: any) => {
    return api.post('/transactions', transactionData);
  }
};

// Dashboard API
export const dashboardAPI = {
  // Get dashboard stats
  getStats: () => {
    return api.get('/dashboard/stats');
  },
  
  // Get recent activity
  getRecentActivity: (limit = 5) => {
    return api.get(`/dashboard/recent-activity?limit=${limit}`);
  }
};

// Notification API
export const notificationAPI = {
  // Get user notifications
  getNotifications: (page = 1, limit = 10) => {
    return api.get(`/notifications?page=${page}&limit=${limit}`);
  },
  
  // Mark notification as read
  markAsRead: (id: string) => {
    return api.patch(`/notifications/${id}/read`);
  },
  
  // Mark all notifications as read
  markAllAsRead: () => {
    return api.patch('/notifications/read-all');
  }
};

export default api; 