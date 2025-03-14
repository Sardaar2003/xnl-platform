import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

// Define user type
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
  mfaEnabled?: boolean;
}

// Define auth context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, mfaToken?: string) => Promise<{ requireMFA: boolean }>;
  logout: () => Promise<void>;
  signup: (userData: any) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  setupMFA: () => Promise<{ secret: string; qrCode: string }>;
  verifyMFA: (token: string) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const response = await authAPI.getCurrentUser();
        setUser(response.data.data.user);
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Authentication check failed:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string, mfaToken?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authAPI.login(email, password, mfaToken);
      
      // Check if MFA is required
      if (response.data.requireMFA) {
        return { requireMFA: true };
      }
      
      const { user, tokens } = response.data.data;
      
      // Store tokens
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { requireMFA: false };
    } catch (error: any) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Call logout API
      await authAPI.logout();
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authAPI.register(userData);
      const { user, tokens } = response.data.data;
      
      // Store tokens
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Signup failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Request password reset function
  const requestPasswordReset = async (email: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authAPI.requestPasswordReset(email);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Password reset request failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authAPI.resetPassword(token, { password });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Password reset failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Setup MFA function
  const setupMFA = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authAPI.setupMFA();
      return response.data.data;
    } catch (error: any) {
      setError(error.response?.data?.message || 'MFA setup failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify MFA function
  const verifyMFA = async (token: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authAPI.verifyMFA(token);
      
      // Update user with MFA enabled
      if (user) {
        setUser({
          ...user,
          mfaEnabled: true
        });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'MFA verification failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Create context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    signup,
    resetPassword,
    requestPasswordReset,
    setupMFA,
    verifyMFA
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}; 