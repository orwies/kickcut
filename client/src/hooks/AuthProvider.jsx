/**
 * Global Auth Provider. Manages login, logout, and stores the user/token in sessionStorage.
 * Also triggers the WebSocket connection once authenticated.
 */
import { createContext, useState, useEffect, useCallback } from 'react';

import { login as apiLogin, register as apiRegister } from '../api';
import api from '../api';
import { connect, disconnect } from '../ws';

export const AuthContext = createContext(null);

/**
 * Context provider component that maintains the current user session and tokens.
 * Receives 'children' to render inside the provider tree.
 * Restores sessions on mount, verifies token expiry, and establishes WebSocket connections if authenticated.
 * Returns the AuthContext Provider wrapping its child components.
 */
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

  /**
   * Attempts to log in a user and establish a session.
   * Receives a 'username' and 'password' string.
   * Calls the API login endpoint, stores the resulting JWT in sessionStorage, sets local state, and connects the WebSocket.
   * Returns a Promise resolving to the authentication data object.
   */
  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    sessionStorage.setItem('kc_token', data.token);
    setToken(data.token);
    setUser(data.user);
    connect(data.token);
    return data;
  }, []);

  /**
   * Registers a new user account.
   * Receives a 'username' and 'password' string.
   * Forwards the request to the API registration endpoint.
   * Returns a Promise resolving to the user profile confirmation.
   */
  const register = useCallback(async (username, password) => {
    const data = await apiRegister(username, password);
    return data;
  }, []);

  /**
   * Logs out the current user and clears session state.
   * Takes no arguments.
   * Notifies the server of explicit logout, deletes the local storage token, resets context state, and disconnects the WebSocket.
   * Returns nothing.
   */
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
