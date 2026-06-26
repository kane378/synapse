// FILE: client/src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-inject JWT token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('synapse_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401s globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('synapse_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
