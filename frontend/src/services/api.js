import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
};

// Meeting API
export const meetingAPI = {
  create: (data) => api.post('/meetings', data),
  get: (meetingId) => api.get(`/meetings/${meetingId}`),
  getAll: () => api.get('/meetings'),
  end: (meetingId) => api.put(`/meetings/${meetingId}/end`)
};

export default api;
