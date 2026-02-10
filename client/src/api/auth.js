import api from './client';

export const login = (username, password) =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

export const refresh = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken }).then((r) => r.data);

export const logout = () => api.post('/auth/logout').then((r) => r.data);
