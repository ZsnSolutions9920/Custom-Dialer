import api from './client';

export const createPhoneList = (data) =>
  api.post('/phone-lists', data).then((r) => r.data);

export const addListEntries = (listId, entries) =>
  api.post(`/phone-lists/${listId}/entries`, { entries }).then((r) => r.data);

export const getPhoneLists = () =>
  api.get('/phone-lists').then((r) => r.data);

export const getListEntries = (listId, page = 1, limit = 50, search = '') =>
  api.get(`/phone-lists/${listId}/entries`, { params: { page, limit, search } }).then((r) => r.data);

export const getEntry = (entryId) =>
  api.get(`/phone-lists/entries/${entryId}`).then((r) => r.data);

export const markEntryCalled = (entryId) =>
  api.patch(`/phone-lists/${entryId}/called`).then((r) => r.data);

export const updateEntryStatus = (entryId, status, followUpAt = null, notes = null) =>
  api.patch(`/phone-lists/entries/${entryId}/status`, { status, followUpAt, notes }).then((r) => r.data);

export const getFollowUps = (start, end) =>
  api.get('/phone-lists/follow-ups', { params: { start, end } }).then((r) => r.data);

export const getNextDialableEntry = (listId, skipIds = [], minId = null, forceId = null) => {
  const params = {};
  if (skipIds.length > 0) params.skip = skipIds.join(',');
  if (minId != null) params.minId = minId;
  if (forceId != null) params.forceId = forceId;
  return api.get(`/phone-lists/${listId}/next-dialable`, { params }).then((r) => r.data);
};

export const getPowerDialProgress = (listId) =>
  api.get(`/phone-lists/${listId}/power-dial-progress`).then((r) => r.data);

export const deletePhoneList = (id) =>
  api.delete(`/phone-lists/${id}`).then((r) => r.data);
