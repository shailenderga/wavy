import axios from 'axios';

const envApiUrl = import.meta.env.VITE_API_URL;
let baseURL = '/api';
if (envApiUrl) {
  baseURL = envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api`;
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  checkUsername: (username) => api.get('/auth/check-username', { params: { username } }),
  getMe: () => api.get('/auth/me'),
  getAllUsers: () => api.get('/auth/users'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  deleteAccount: () => api.delete('/auth/account'),
};

export const roomAPI = {
  getRooms: () => api.get('/rooms'),
  createChannel: (data) => api.post('/rooms/channel', data),
  getOrCreateDirectRoom: (targetUserId) => api.post('/rooms/direct', { targetUserId }),
};

export const messageAPI = {
  getRoomMessages: (roomId) => api.get(`/messages/${roomId}`),
  sendMessage: (roomId, content) => api.post(`/messages/${roomId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  clearRoomMessages: (roomId) => api.delete(`/messages/room/${roomId}/clear`),
};

export const contactAPI = {
  searchUsers: (query) => api.get('/contacts/search', { params: { q: query } }),
  getUserProfile: (userId) => api.get(`/contacts/user/${userId}`),
  sendRequest: (data) => api.post('/contacts/request', data),
  getRequests: () => api.get('/contacts/requests'),
  respondRequest: (requestId, action) => api.post('/contacts/respond', { requestId, action }),
  getContacts: () => api.get('/contacts'),
};

export const storyAPI = {
  getStories: () => api.get('/stories'),
  createStory: (data) => api.post('/stories', data),
  recordView: (storyId) => api.post(`/stories/${storyId}/view`),
  getViewers: (storyId) => api.get(`/stories/${storyId}/viewers`),
  deleteStory: (storyId) => api.delete(`/stories/${storyId}`),
};

export const callAPI = {
  getCalls: () => api.get('/calls'),
  deleteCall: (callId) => api.delete(`/calls/${callId}`),
  clearCalls: () => api.delete('/calls'),
};

export default api;

