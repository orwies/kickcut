import axios from 'axios';

// All requests go through Vite proxy → https://localhost:3443
const api = axios.create({ baseURL: '/' });

// Attach JWT to every request automatically
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('kc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('kc_token');
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

export const getTrendingHighlights = () =>
  api.get('/highlights/trending').then((r) => r.data);

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
export const getChatMessages = (channel = 'general') =>
  api.get('/chat/messages', { params: { channel } }).then((r) => r.data);

export const getChannels = () =>
  api.get('/chat/channels').then((r) => r.data);

export const createChannel = (data) =>
  api.post('/chat/channels', data).then((r) => r.data);

export const deleteChannel = (id) =>
  api.delete(`/chat/channels/${id}`).then((r) => r.data);

// ─── Widgets ──────────────────────────────────────────────────────────────────
export const getAIFact = () =>
  api.get('/widgets/fact').then((r) => r.data);

export default api;
