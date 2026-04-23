import { createContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../api';
import api from '../api';
import { connect, disconnect } from '../ws';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => sessionStorage.getItem('kc_token'));
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
          sessionStorage.removeItem('kc_token');
          setToken(null);
        }
      } catch {
        sessionStorage.removeItem('kc_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    sessionStorage.setItem('kc_token', data.token);
    setToken(data.token);
    setUser(data.user);
    connect(data.token);
    return data;
  }, []);

  const register = useCallback(async (username, password) => {
    const data = await apiRegister(username, password);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Tell the server to clear the session so the account can log in elsewhere
      await api.post('/auth/logout');
    } catch {
      // If the request fails (e.g. already expired), still clear locally
    } finally {
      sessionStorage.removeItem('kc_token');
      setToken(null);
      setUser(null);
      disconnect();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
