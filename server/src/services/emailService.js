const pool = require('../db/pool');
const nodemailer = require('nodemailer');

// ─── SMTP Config CRUD ───────────────────────────────────────────────

async function getSmtpConfigs(agentId) {
  const { rows } = await pool.query(
    'SELECT id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, created_at FROM smtp_configs WHERE agent_id = $1 ORDER BY is_default DESC, created_at DESC',
    [agentId]
  );
  return rows;
}

async function getSmtpConfig(id, agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM smtp_configs WHERE id = $1 AND agent_id = $2',
    [id, agentId]
  );
  return rows[0] || null;
}

async function saveSmtpConfig(agentId, config) {
  const { label, host, port, secure, username, password, from_email, from_name } = config;
  // Enforce one SMTP config per account — check if one already exists
  const { rows: existing } = await pool.query('SELECT id FROM smtp_configs WHERE agent_id = $1 LIMIT 1', [agentId]);
  if (existing.length > 0) {
    // Update existing instead of creating a new one
    return updateSmtpConfig(existing[0].id, agentId, config);
  }
  const { rows } = await pool.query(
    `INSERT INTO smtp_configs (agent_id, label, host, port, secure, username, password, from_email, from_name, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
     RETURNING id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, created_at`,
    [agentId, label || 'Default', host, port || 587, secure || false, username, password, from_email, from_name || '']
  );
  return rows[0];
}

async function updateSmtpConfig(id, agentId, config) {
  const { label, host, port, secure, username, password, from_email, from_name, is_default } = config;
  if (is_default) {
    await pool.query('UPDATE smtp_configs SET is_default = false WHERE agent_id = $1 AND id != $2', [agentId, id]);
  }
  const setParts = ['label=$2', 'host=$3', 'port=$4', 'secure=$5', 'username=$6', 'from_email=$8', 'from_name=$9', 'is_default=$10', 'updated_at=NOW()'];
  const params = [id, label, host, port, secure, username, password, from_email, from_name, is_default, agentId];
  // Only update password if provided
  if (password) {
    setParts.push('password=$7');
  }
  const { rows } = await pool.query(
    `UPDATE smtp_configs SET ${setParts.join(', ')} WHERE id = $1 AND agent_id = $11
     RETURNING id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, created_at`,
    params
  );
  return rows[0] || null;
}

async function deleteSmtpConfig(id, agentId) {
  const { rowCount } = await pool.query('DELETE FROM smtp_configs WHERE id = $1 AND agent_id = $2', [id, agentId]);
  return rowCount > 0;
}

async function testSmtpConnection(id, agentId) {
  const config = await getSmtpConfig(id, agentId);
  if (!config) throw new Error('SMTP config not found');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  });
  await transporter.verify();
  return true;
}

// ─── Email Template CRUD ────────────────────────────────────────────

async function getTemplates(agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM email_templates WHERE agent_id = $1 ORDER BY updated_at DESC',
    [agentId]
  );
  return rows;
}

async function getTemplate(id, agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM email_templates WHERE id = $1 AND agent_id = $2',
    [id, agentId]
  );
  return rows[0] || null;
}

async function createTemplate(agentId, data) {
  const { name, subject, body } = data;
  const { rows } = await pool.query(
    'INSERT INTO email_templates (agent_id, name, subject, body) VALUES ($1, $2, $3, $4) RETURNING *',
    [agentId, name, subject, body]
  );
  return rows[0];
}

async function updateTemplate(id, agentId, data) {
  const { name, subject, body } = data;
  const { rows } = await pool.query(
    'UPDATE email_templates SET name=$1, subject=$2, body=$3, updated_at=NOW() WHERE id=$4 AND agent_id=$5 RETURNING *',
    [name, subject, body, id, agentId]
  );
  return rows[0] || null;
}

async function deleteTemplate(id, agentId) {
  const { rowCount } = await pool.query('DELETE FROM email_templates WHERE id = $1 AND agent_id = $2', [id, agentId]);
  return rowCount > 0;
}

// ─── Recipient Querying ─────────────────────────────────────────────

async function getRecipients({ listId, statusFilter }) {
  let clause = 'WHERE list_id = $1 AND primary_email IS NOT NULL AND primary_email != \'\'';
  const params = [listId];
  if (statusFilter && statusFilter.length > 0) {
    params.push(statusFilter);
    clause += ` AND status = ANY($${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT id, name, phone_number, primary_email, metadata FROM phone_list_entries ${clause} ORDER BY id ASC`,
    params
  );
  return rows;
}

async function countRecipients({ listId, statusFilter }) {
  let clause = 'WHERE list_id = $1 AND primary_email IS NOT NULL AND primary_email != \'\'';
  const params = [listId];
  if (statusFilter && statusFilter.length > 0) {
    params.push(statusFilter);
    clause += ` AND status = ANY($${params.length})`;
  }
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM phone_list_entries ${clause}`,
    params
  );
  return rows[0].count;
}

// ─── Campaign CRUD ──────────────────────────────────────────────────

async function createCampaign(agentId, data) {
  const { name, subject, body, smtp_config_id, delay_ms, source_list_id, status_filter } = data;
  const { rows } = await pool.query(
    `INSERT INTO email_campaigns (agent_id, smtp_config_id, name, subject, body, delay_ms, source_list_id, status_filter)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [agentId, smtp_config_id, name, subject, body, delay_ms || 3000, source_list_id || null, status_filter || null]
  );
  return rows[0];
}

async function getCampaigns(agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM email_campaigns WHERE agent_id = $1 ORDER BY created_at DESC',
    [agentId]
  );
  return rows;
}

async function getCampaign(id, agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM email_campaigns WHERE id = $1 AND agent_id = $2',
    [id, agentId]
  );
  return rows[0] || null;
}

async function updateCampaignStatus(id, status, extra = {}) {
  const sets = ['status = $2'];
  const params = [id, status];
  if (extra.total_recipients !== undefined) {
    params.push(extra.total_recipients);
    sets.push(`total_recipients = $${params.length}`);
  }
  if (status === 'sending') sets.push('started_at = NOW()');
  if (status === 'completed' || status === 'failed') sets.push('completed_at = NOW()');
  if (extra.sent_count !== undefined) {
    params.push(extra.sent_count);
    sets.push(`sent_count = $${params.length}`);
  }
  if (extra.failed_count !== undefined) {
    params.push(extra.failed_count);
    sets.push(`failed_count = $${params.length}`);
  }
  await pool.query(`UPDATE email_campaigns SET ${sets.join(', ')} WHERE id = $1`, params);
}

async function addCampaignLog(campaignId, { email, name, status, error }) {
  await pool.query(
    `INSERT INTO email_campaign_logs (campaign_id, recipient_email, recipient_name, status, error_message, sent_at)
     VALUES ($1, $2, $3, $4, $5, ${status === 'sent' ? 'NOW()' : 'NULL'})`,
    [campaignId, email, name || null, status, error || null]
  );
}

async function getCampaignLogs(campaignId, statusFilter) {
  let clause = 'WHERE campaign_id = $1';
  const params = [campaignId];
  if (statusFilter) {
    params.push(statusFilter);
    clause += ` AND status = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM email_campaign_logs ${clause} ORDER BY id ASC`,
    params
  );
  return rows;
}

// ─── Variable Resolution ────────────────────────────────────────────

function resolveVariables(template, entry) {
  if (!template) return '';
  let result = template;
  // Standard variables
  result = result.replace(/\{\{name\}\}/gi, entry.name || '');
  result = result.replace(/\{\{email\}\}/gi, entry.primary_email || '');
  result = result.replace(/\{\{phone\}\}/gi, entry.phone_number || '');
  // Metadata variables
  if (entry.metadata && typeof entry.metadata === 'object') {
    for (const [key, value] of Object.entries(entry.metadata)) {
      const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'gi');
      result = result.replace(regex, value || '');
    }
  }
  return result;
}

// ─── Send Single Email ──────────────────────────────────────────────

async function sendEmail(smtpConfig, { to, subject, html, attachments }) {
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: { user: smtpConfig.username, pass: smtpConfig.password },
  });
  const mailOptions = {
    from: smtpConfig.from_name ? `"${smtpConfig.from_name}" <${smtpConfig.from_email}>` : smtpConfig.from_email,
    to,
    subject,
    html,
  };
  if (attachments && attachments.length > 0) {
    mailOptions.attachments = attachments;
  }
  return transporter.sendMail(mailOptions);
}

// ─── Campaign Sender (called from route, emits progress via socket) ─

async function runCampaign(campaignId, agentId, io) {
  const campaign = await getCampaign(campaignId, agentId);
  if (!campaign) throw new Error('Campaign not found');

  const smtpConfig = await getSmtpConfig(campaign.smtp_config_id, agentId);
  if (!smtpConfig) throw new Error('SMTP config not found');

  const recipients = await getRecipients({
    listId: campaign.source_list_id,
    statusFilter: campaign.status_filter,
  });

  await updateCampaignStatus(campaignId, 'sending', { total_recipients: recipients.length });

  const room = `agent:${agentId}`;
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const entry = recipients[i];
    const subject = resolveVariables(campaign.subject, entry);
    const html = resolveVariables(campaign.body, entry);

    try {
      await sendEmail(smtpConfig, { to: entry.primary_email, subject, html });
      sentCount++;
      await addCampaignLog(campaignId, { email: entry.primary_email, name: entry.name, status: 'sent' });
    } catch (err) {
      failedCount++;
      await addCampaignLog(campaignId, { email: entry.primary_email, name: entry.name, status: 'failed', error: err.message });
    }

    // Emit progress
    io.to(room).emit('email:progress', {
      campaignId,
      current: i + 1,
      total: recipients.length,
      sentCount,
      failedCount,
      currentEmail: entry.primary_email,
    });

    // Delay between emails (skip after last)
    if (i < recipients.length - 1 && campaign.delay_ms > 0) {
      await new Promise((r) => setTimeout(r, campaign.delay_ms));
    }
  }

  await updateCampaignStatus(campaignId, 'completed', { sent_count: sentCount, failed_count: failedCount });

  io.to(room).emit('email:complete', { campaignId, sentCount, failedCount });
  return { sentCount, failedCount };
}

module.exports = {
  getSmtpConfigs,
  getSmtpConfig,
  saveSmtpConfig,
  updateSmtpConfig,
  deleteSmtpConfig,
  testSmtpConnection,
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getRecipients,
  countRecipients,
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaignStatus,
  addCampaignLog,
  getCampaignLogs,
  resolveVariables,
  sendEmail,
  runCampaign,
};
