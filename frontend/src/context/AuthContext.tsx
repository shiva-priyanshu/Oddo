import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginCredentials, RegisterCustomerData, AuthResponse } from '../types/auth';
import { apiClient, getSessionToken, setSessionToken, clearSessionToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<User>;
  registerCustomer: (data: RegisterCustomerData) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCustomer: boolean;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from tab-scoped sessionStorage on component mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getSessionToken();
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiClient<{ user: User }>('/api/auth/me');
        setUser(data.user);
        setToken(storedToken);
      } catch {
        clearSessionToken();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for 401 unauthorized events emitted from API client
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setError(null);
    try {
      const data = await apiClient<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      setSessionToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (err: any) {
      const message = err.message || 'Login failed';
      setError(message);
      throw err;
    }
  };

  const registerCustomer = async (data: RegisterCustomerData): Promise<User> => {
    setError(null);
    try {
      const response = await apiClient<AuthResponse>('/api/auth/register-customer', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setSessionToken(response.token);
      setToken(response.token);
      setUser(response.user);
      return response.user;
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const logout = () => {
    clearSessionToken();
    setToken(null);
    setUser(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const value: AuthContextType = {
    user,
    token,
    loading,
    error,
    login,
    registerCustomer,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isCustomer: user?.role === 'CUSTOMER',
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
