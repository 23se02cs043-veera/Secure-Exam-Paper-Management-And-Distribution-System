import React, { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize directly from localStorage — instant, no flash, no redirect
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!(localStorage.getItem('access_token') && localStorage.getItem('user'));
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // NO background verifyToken — it was clearing auth on any network hiccup.
  // The token is validated naturally when protected API calls are made.

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      const { access_token, refresh_token, user: userData } = res.data;
      // Store everything BEFORE setting state so interceptors have the token
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${userData.full_name}! 🎉`);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authAPI.register(data);
      toast.success('Account created successfully! Please log in.');
      return { success: true, user: res.data.user };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      setError(msg);
      toast.error(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch {}
    clearAuth();
    toast.info('You have been logged out.');
  }, [clearAuth]);

  const refreshToken = useCallback(async () => {
    const token = localStorage.getItem('refresh_token');
    if (!token) return false;
    try {
      const res = await authAPI.refreshToken(token);
      localStorage.setItem('access_token', res.data.access_token);
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }, [clearAuth]);

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    refreshToken,
    clearAuth,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
