import api from './client';

// SMTP
export const getSmtpConfigs = () => api.get('/email/smtp').then((r) => r.data);
export const saveSmtpConfig = (config) => api.post('/email/smtp', config).then((r) => r.data);
export const updateSmtpConfig = (id, config) => api.put(`/email/smtp/${id}`, config).then((r) => r.data);
export const deleteSmtpConfig = (id) => api.delete(`/email/smtp/${id}`).then((r) => r.data);
export const testSmtpConnection = (id) => api.post(`/email/smtp/${id}/test`).then((r) => r.data);

// Templates
export const getEmailTemplates = () => api.get('/email/templates').then((r) => r.data);
export const createEmailTemplate = (data) => api.post('/email/templates', data).then((r) => r.data);
export const updateEmailTemplate = (id, data) => api.put(`/email/templates/${id}`, data).then((r) => r.data);
export const deleteEmailTemplate = (id) => api.delete(`/email/templates/${id}`).then((r) => r.data);

// Campaigns
export const getCampaigns = () => api.get('/email/campaigns').then((r) => r.data);
export const createCampaign = (data) => api.post('/email/campaigns', data).then((r) => r.data);
export const startCampaign = (id) => api.post(`/email/campaigns/${id}/start`).then((r) => r.data);
export const getCampaign = (id) => api.get(`/email/campaigns/${id}`).then((r) => r.data);
export const getCampaignLogs = (id, status) =>
  api.get(`/email/campaigns/${id}/logs`, { params: status ? { status } : {} }).then((r) => r.data);

// Recipients
export const previewRecipients = (data) => api.post('/email/recipients', data).then((r) => r.data);

// AI Generation
export const generateAiEmail = (data) => api.post('/email/generate-ai', data).then((r) => r.data);

// Send
export const sendTestEmail = (data) => api.post('/email/send-test', data).then((r) => r.data);
export const sendSingleEmail = (formData) =>
  api.post('/email/send-single', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);

// Inbox
export const syncInbox = (smtpConfigId) => api.post('/email/inbox/sync', smtpConfigId ? { smtpConfigId } : {}).then((r) => r.data);
export const getInboxEmails = ({ folder, page, limit, search, smtpConfigId } = {}) =>
  api.get('/email/inbox', { params: { folder, page, limit, search, smtpConfigId } }).then((r) => r.data);
export const getEmailDetail = (id) => api.get(`/email/inbox/${id}`).then((r) => r.data);
export const getUnreadCount = () => api.get('/email/inbox/unread-count').then((r) => r.data);
export const deleteEmail = (id) => api.delete(`/email/inbox/${id}`).then((r) => r.data);
export const replyToEmail = (id, data) => api.post(`/email/inbox/${id}/reply`, data).then((r) => r.data);
export const forwardEmail = (id, data) => api.post(`/email/inbox/${id}/forward`, data).then((r) => r.data);
export const getEmailThread = (id) => api.get(`/email/inbox/${id}/thread`).then((r) => r.data);
export const getListColumns = (listId) => api.get(`/email/list-columns/${listId}`).then((r) => r.data);

// Google OAuth
export const getGoogleOAuthUrl = () => api.get('/email/oauth/google/url').then((r) => r.data);
export const sendGoogleOAuthCode = (code) => api.post('/email/oauth/google/callback', { code }).then((r) => r.data);
export const getGoogleOAuthStatus = () => api.get('/email/oauth/google/status').then((r) => r.data);

// Tracking / Notifications
export const getTrackingEvents = ({ page, limit } = {}) =>
  api.get('/email/tracking/events', { params: { page, limit } }).then((r) => r.data);
export const getEmailTrackingStats = (emailId) =>
  api.get(`/email/tracking/email/${emailId}`).then((r) => r.data);
