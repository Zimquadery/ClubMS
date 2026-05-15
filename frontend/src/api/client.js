import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (
      !error.response &&
      error.code === 'ECONNABORTED' &&
      config &&
      !config.__retried
    ) {
      config.__retried = true;
      return client(config);
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.startsWith('/auth/login') || url.startsWith('/auth/register');
      localStorage.removeItem('token');
      if (!isAuthEndpoint) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
