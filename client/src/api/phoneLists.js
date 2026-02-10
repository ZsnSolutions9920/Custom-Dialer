import api from './client';

export const uploadPhoneList = (data) =>
  api.post('/phone-lists', data).then((r) => r.data);

export const getPhoneLists = () =>
  api.get('/phone-lists').then((r) => r.data);

export const getListEntries = (listId, page = 1) =>
  api.get(`/phone-lists/${listId}/entries`, { params: { page } }).then((r) => r.data);

export const markEntryCalled = (entryId) =>
  api.patch(`/phone-lists/${entryId}/called`).then((r) => r.data);

export const deletePhoneList = (id) =>
  api.delete(`/phone-lists/${id}`).then((r) => r.data);
