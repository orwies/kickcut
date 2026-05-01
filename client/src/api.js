/**
 * Global axios instance for all API calls. 
 * Attaches the JWT to every request and handles 401 (expired) redirects.
 */
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
/**
 * Authenticates a user and returns a session token and user profile.
 * Receives a username and password string.
 * Sends a POST request to the '/auth/login' endpoint.
 * Returns a Promise that resolves to the login data containing the token.
 */
export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

/**
 * Creates a new user account with the provided credentials.
 * Receives a username and password string.
 * Sends a POST request to the '/auth/register' endpoint.
 * Returns a Promise that resolves to the newly created user profile data.
 */
export const register = (username, password) =>
  api.post('/auth/register', { username, password }).then((r) => r.data);

/**
 * Fetches the current user's profile information based on their session token.
 * Takes no arguments.
 * Sends a GET request to the '/auth/me' endpoint using the globally attached JWT.
 * Returns a Promise that resolves to the authenticated user's profile data.
 */
export const getMe = () => api.get('/auth/me').then((r) => r.data);

// ─── Highlights ───────────────────────────────────────────────────────────────
/**
 * Retrieves a list of approved highlights, optionally filtered by competition or team.
 * Receives an optional 'filters' object containing query parameters.
 * Sends a GET request to the '/highlights' endpoint with the applied filters.
 * Returns a Promise that resolves to an array of highlight objects.
 */
export const getHighlights = (filters = {}) =>
  api.get('/highlights', { params: filters }).then((r) => r.data);

/**
 * Returns the top highlights ranked by user likes.
 * Takes no arguments.
 * Sends a GET request to the '/highlights/trending' endpoint.
 * Returns a Promise that resolves to an array of the top 3 trending highlight objects.
 */
export const getTrendingHighlights = () =>
  api.get('/highlights/trending').then((r) => r.data);

/**
 * Returns a list of highlights awaiting administrative approval.
 * Takes no arguments.
 * Sends an authenticated GET request to the '/highlights/pending' endpoint.
 * Returns a Promise that resolves to an array of pending highlight objects.
 */
export const getPendingHighlights = () =>
  api.get('/highlights/pending').then((r) => r.data);

/**
 * Submits a new highlight with video and thumbnail files via multi-part form data.
 * Receives a 'formData' object containing the files and highlight metadata.
 * Sends a POST request to '/highlights' with appropriate multipart headers.
 * Returns a Promise that resolves to the newly created highlight object.
 */
export const uploadHighlight = (formData) =>
  api.post('/highlights', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

/**
 * Toggles the 'like' status of a highlight for the current user.
 * Receives the 'id' string of the highlight to be liked or unliked.
 * Sends an authenticated POST request to the like endpoint for that highlight.
 * Returns a Promise that resolves to the updated highlight object.
 */
export const likeHighlight = (id) =>
  api.post(`/highlights/${id}/like`).then((r) => r.data);

/**
 * Promotes a pending highlight to 'approved' status, making it public.
 * Receives the 'id' string of the highlight to approve.
 * Sends an authenticated PATCH request to the admin approve endpoint.
 * Returns a Promise that resolves to the updated approved highlight object.
 */
export const approveHighlight = (id) =>
  api.patch(`/highlights/${id}/approve`).then((r) => r.data);

/**
 * Permanently deletes a highlight and its associated files.
 * Receives the 'id' string of the highlight to be deleted.
 * Sends an authenticated DELETE request to the highlight endpoint.
 * Returns a Promise that resolves to a confirmation object (e.g., { deleted: true }).
 */
export const deleteHighlight = (id) =>
  api.delete(`/highlights/${id}`).then((r) => r.data);

// ─── Chat ─────────────────────────────────────────────────────────────────────
/**
 * Fetches the message history for a specific chat channel.
 * Receives an optional 'channel' name string, defaulting to 'general'.
 * Sends a GET request to the '/chat/messages' endpoint with the channel query parameter.
 * Returns a Promise that resolves to an array of chat message objects.
 */
export const getChatMessages = (channel = 'general') =>
  api.get('/chat/messages', { params: { channel } }).then((r) => r.data);

/**
 * Retrieves the list of all available chat channels.
 * Takes no arguments.
 * Sends a GET request to the '/chat/channels' endpoint.
 * Returns a Promise that resolves to an array of channel objects.
 */
export const getChannels = () =>
  api.get('/chat/channels').then((r) => r.data);

/**
 * Creates a new custom chat channel.
 * Receives a 'data' object containing the channel details (like id and label).
 * Sends a POST request to the '/chat/channels' endpoint.
 * Returns a Promise that resolves to the newly created channel object.
 */
export const createChannel = (data) =>
  api.post('/chat/channels', data).then((r) => r.data);

/**
 * Removes a specific chat channel and all its messages.
 * Receives the 'id' string of the channel to delete.
 * Sends an authenticated DELETE request to the specific channel endpoint.
 * Returns a Promise that resolves to a confirmation object.
 */
export const deleteChannel = (id) =>
  api.delete(`/chat/channels/${id}`).then((r) => r.data);

// ─── Widgets ──────────────────────────────────────────────────────────────────
/**
 * Fetches a random football fact generated by the AI widget.
 * Takes no arguments.
 * Sends a GET request to the '/widgets/fact' endpoint.
 * Returns a Promise that resolves to an object containing the fact text.
 */
export const getAIFact = () =>
  api.get('/widgets/fact').then((r) => r.data);

export default api;
