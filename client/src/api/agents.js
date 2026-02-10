import api from './client';

export const getAgents = () => api.get('/agents').then((r) => r.data);

export const updateStatus = (id, status) =>
  api.patch(`/agents/${id}/status`, { status }).then((r) => r.data);

export const getMyProfile = () =>
  api.get('/agents/me').then((r) => r.data);

export const updateMyProfile = (data) =>
  api.patch('/agents/me', data).then((r) => r.data);
