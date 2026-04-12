import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../api';
import { connect, disconnect } from '../ws';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('kc_token'));
  const [loading, setLoading] = useState(true);

  // Decode user from stored token on mount
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Check expiry
        if (payload.exp * 1000 > Date.now()) {
          setUser({ id: payload.id, username: payload.username, role: payload.role });
          connect(token);
        } else {
          // Expired
          localStorage.removeItem('kc_token');
          setToken(null);
        }
      } catch {
        localStorage.removeItem('kc_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    localStorage.setItem('kc_token', data.token);
    setToken(data.token);
    setUser(data.user);
    connect(data.token);
    return data;
  }, []);

  const register = useCallback(async (username, password) => {
    const data = await apiRegister(username, password);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('kc_token');
    setToken(null);
    setUser(null);
    disconnect();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
