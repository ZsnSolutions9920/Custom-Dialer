import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(() => {
    const stored = sessionStorage.getItem('agent');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!agent;

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
      sessionStorage.setItem('agent', JSON.stringify(data.agent));
      setAgent(data.agent);
      return data.agent;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAgent = useCallback((updatedFields) => {
    setAgent((prev) => {
      const merged = { ...prev, ...updatedFields };
      sessionStorage.setItem('agent', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('agent');
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, isAuthenticated, loading, login, logout, updateAgent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
