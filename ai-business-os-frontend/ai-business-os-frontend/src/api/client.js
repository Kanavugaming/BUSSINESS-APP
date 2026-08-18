import axios from 'axios';

// In production this app is built and copied into the backend's /public
// folder, so an empty base URL means "same origin" — exactly how the
// backend README describes the deployment. In dev, Vite proxies /api to
// the local backend (see vite.config.js).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || ''
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aios_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aios_token');
      localStorage.removeItem('aios_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
