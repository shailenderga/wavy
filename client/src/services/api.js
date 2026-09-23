import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const envApiUrl = import.meta.env.VITE_API_URL;
const DEFAULT_PROD_URL = 'https://wavy-1tnr.onrender.com';

export const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') return true;
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return true;
  } catch (e) {
    // ignore
  }
  if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') return true;
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') return true;
  return false;
};

// If VITE_API_URL is explicitly set, use it.
// If running in local Vite dev server with proxy (localhost:5173), use '/api'.
// In all other environments (Native Android app, deployed app, etc.), default to live production backend!
let baseURL = `${DEFAULT_PROD_URL}/api`;

if (envApiUrl) {
  baseURL = envApiUrl.endsWith('/api') ? envApiUrl : `${envApiUrl.replace(/\/+$/, '')}/api`;
} else if (import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
  baseURL = '/api';
}

const api = axios.create({
  baseURL,
  timeout: 30000,
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

