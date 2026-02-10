import api from './client';

export const getCallLogs = (page = 1, limit = 50) =>
  api.get('/calls', { params: { page, limit } }).then((r) => r.data);

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
