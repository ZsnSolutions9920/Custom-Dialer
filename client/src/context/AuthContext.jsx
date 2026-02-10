import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(() => {
    const stored = localStorage.getItem('agent');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!agent;

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await authApi.login(username, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('agent', JSON.stringify(data.agent));
      setAgent(data.agent);
      return data.agent;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors during logout
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('agent');
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
