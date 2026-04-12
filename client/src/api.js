import axios from 'axios';

// All requests go through Vite proxy → https://localhost:3443
const api = axios.create({ baseURL: '/' });

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('kc_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// ─── Highlights ───────────────────────────────────────────────────────────────
export const getHighlights = (filters = {}) =>
  api.get('/highlights', { params: filters }).then((r) => r.data);

export const getPendingHighlights = () =>
  api.get('/highlights/pending').then((r) => r.data);

export const uploadHighlight = (formData) =>
  api.post('/highlights', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

export const likeHighlight = (id) =>
  api.post(`/highlights/${id}/like`).then((r) => r.data);

export const approveHighlight = (id) =>
  api.patch(`/highlights/${id}/approve`).then((r) => r.data);

export const deleteHighlight = (id) =>
  api.delete(`/highlights/${id}`).then((r) => r.data);

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const getChatMessages = () =>
  api.get('/chat/messages').then((r) => r.data);

export default api;
