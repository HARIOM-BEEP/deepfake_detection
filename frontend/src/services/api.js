import axios from 'axios';


const api = axios.create({
  baseURL: '/api',
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
