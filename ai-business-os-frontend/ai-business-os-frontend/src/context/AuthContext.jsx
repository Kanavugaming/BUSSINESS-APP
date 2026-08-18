import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('aios_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('aios_token'));

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('aios_token', data.token);
    localStorage.setItem('aios_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Works for the very first user (becomes admin automatically) since the
  // backend allows registration without a token when the users table is empty.
  const registerFirstAdmin = useCallback(async (name, email, password) => {
    await api.post('/api/auth/register', { name, email, password });
    return login(email, password);
  }, [login]);

  // Admin-only: create a new staff/manager/admin account while logged in.
  const registerUser = useCallback(async (name, email, password, role) => {
    const { data } = await api.post('/api/auth/register', { name, email, password, role });
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aios_token');
    localStorage.removeItem('aios_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, registerFirstAdmin, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
