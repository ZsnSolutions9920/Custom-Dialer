import api from './client';

export const createPhoneList = (data) =>
  api.post('/phone-lists', data).then((r) => r.data);

export const addListEntries = (listId, entries) =>
  api.post(`/phone-lists/${listId}/entries`, { entries }).then((r) => r.data);

export const getPhoneLists = () =>
  api.get('/phone-lists').then((r) => r.data);

export const getListEntries = (listId, page = 1, limit = 50) =>
  api.get(`/phone-lists/${listId}/entries`, { params: { page, limit } }).then((r) => r.data);

export const getEntry = (entryId) =>
  api.get(`/phone-lists/entries/${entryId}`).then((r) => r.data);

export const markEntryCalled = (entryId) =>
  api.patch(`/phone-lists/${entryId}/called`).then((r) => r.data);

export const deletePhoneList = (id) =>
  api.delete(`/phone-lists/${id}`).then((r) => r.data);
