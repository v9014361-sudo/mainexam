import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh`, null, { withCredentials: true });
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
