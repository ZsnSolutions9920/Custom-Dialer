import api from './client';

export const clockIn = () => api.post('/attendance/clock-in').then((r) => r.data);

export const clockOut = () => api.post('/attendance/clock-out').then((r) => r.data);

export const getCurrentSession = () => api.get('/attendance/current').then((r) => r.data);

export const getHistory = (agentId) =>
  api.get(`/attendance/history/${agentId}`).then((r) => r.data);

export const verifyAdmin = (username, password) =>
  api.post('/attendance/admin-verify', { username, password }).then((r) => r.data);
