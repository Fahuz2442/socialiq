import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const authAPI = {
  register:   (data)     => api.post('/auth/register', data),
  login:      (data)     => api.post('/auth/login', data),
  me:         ()         => api.get('/auth/me'),
  platforms:  ()         => api.get('/auth/platforms'),
  connect:    (platform) => api.get(`/auth/${platform}/connect`),
  disconnect: (platform) => api.delete(`/auth/${platform}/disconnect`),
};

export const postsAPI = {
  list:    (params)   => api.get('/posts', { params }),
  getById: (id)       => api.get(`/posts/${id}`),
  summary: ()         => api.get('/posts/metrics/summary'),
  sync:    ()         => api.post('/posts/sync'),
  syncOne: (platform) => api.post(`/posts/sync/${platform}`),
};

export default api;