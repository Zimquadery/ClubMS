import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import client from '@/api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const meAbortRef = useRef(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    meAbortRef.current = new AbortController();
    client.get('/auth/me', { signal: meAbortRef.current.signal })
      .then((response) => setUser(response.data))
      .catch((err) => {
        if (axios.isCancel(err)) return;
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));

    return () => { meAbortRef.current?.abort(); };
  }, []);

  const login = async (email, password) => {
    meAbortRef.current?.abort();
    const response = await client.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    setUser(newUser);
    return response.data;
  };

  const register = async (email, password, name) => {
    await client.post('/auth/register', { email, password, name });
    const loginResponse = await client.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = loginResponse.data;
    localStorage.setItem('token', newToken);
    setUser(newUser);
    return { token: newToken, user: newUser };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await client.get('/auth/me');
      setUser(response.data);
    } catch {
      // keep existing user data
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
