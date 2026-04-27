import { createContext, useState, useEffect } from 'react';
import client from '@/api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    client.get('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const response = await client.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('token', newToken);
    setUser(newUser);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await client.post('/auth/register', { email, password, name });
    const user = response.data;
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
