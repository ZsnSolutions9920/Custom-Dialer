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
