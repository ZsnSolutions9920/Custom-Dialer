import api from './client';

export const getCallLogs = (page = 1, limit = 20, filters = {}) =>
  api.get('/calls', { params: { page, limit, ...filters } }).then((r) => r.data);

export const getCallStats = (days = 7, agentId = null) =>
  api.get('/calls/stats', { params: { days, ...(agentId && { agentId }) } }).then((r) => r.data);

export const getCallVolume = (days = 7, agentId = null) =>
  api.get('/calls/stats/volume', { params: { days, ...(agentId && { agentId }) } }).then((r) => r.data);

export const getStatusBreakdown = (days = 7, agentId = null) =>
  api.get('/calls/stats/status-breakdown', { params: { days, ...(agentId && { agentId }) } }).then((r) => r.data);

export const getAgentLeaderboard = (days = 7) =>
  api.get('/calls/stats/agent-leaderboard', { params: { days } }).then((r) => r.data);

export const getTodayCallCount = () =>
  api.get('/calls/stats/today-count').then((r) => r.data);

export const updateCallNotes = (callId, data) =>
  api.patch(`/calls/${callId}/notes`, data).then((r) => r.data);

export const exportCallsCsv = async (filters = {}) => {
  const response = await api.get('/calls/export', { params: filters, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'call-logs.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const toggleHold = (conferenceSid, participantCallSid, hold) =>
  api.post('/calls/hold', { conferenceSid, participantCallSid, hold }).then((r) => r.data);

export const initiateTransfer = (conferenceName, targetAgentId, type) =>
  api.post('/calls/transfer', { conferenceName, targetAgentId, type }).then((r) => r.data);

export const completeTransfer = (conferenceName, targetAgentId) =>
  api.post('/calls/transfer/complete', { conferenceName, targetAgentId }).then((r) => r.data);

export const hangup = (conferenceName) =>
  api.post('/calls/hangup', { conferenceName }).then((r) => r.data);

export const getTwilioToken = () =>
  api.get('/token').then((r) => r.data);

export const getRecordingUrl = (callId) => `/api/calls/${callId}/recording`;
