const pool = require('../db/pool');
const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

// ─── SMTP Config CRUD ───────────────────────────────────────────────

async function getSmtpConfigs(agentId) {
  const { rows } = await pool.query(
    'SELECT id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, imap_host, imap_port, imap_secure, created_at FROM smtp_configs WHERE agent_id = $1 ORDER BY is_default DESC, created_at DESC',
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
  const { label, host, port, secure, username, password, from_email, from_name, imap_host, imap_port, imap_secure } = config;
  const { rows } = await pool.query(
    `INSERT INTO smtp_configs (agent_id, label, host, port, secure, username, password, from_email, from_name, is_default, imap_host, imap_port, imap_secure)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)
     RETURNING id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, imap_host, imap_port, imap_secure, created_at`,
    [agentId, label || 'Default', host, port || 587, secure || false, username, password, from_email, from_name || '', imap_host || null, imap_port || 993, imap_secure !== false]
  );
  return rows[0];
}

async function updateSmtpConfig(id, agentId, config) {
  const { label, host, port, secure, username, password, from_email, from_name, is_default, imap_host, imap_port, imap_secure } = config;
  if (is_default) {
    await pool.query('UPDATE smtp_configs SET is_default = false WHERE agent_id = $1 AND id != $2', [agentId, id]);
  }
  const setParts = ['label=$2', 'host=$3', 'port=$4', 'secure=$5', 'username=$6', 'from_email=$8', 'from_name=$9', 'is_default=$10', 'imap_host=$12', 'imap_port=$13', 'imap_secure=$14', 'updated_at=NOW()'];
  const params = [id, label, host, port, secure, username, password, from_email, from_name, is_default, agentId, imap_host || null, imap_port || 993, imap_secure !== false];
  // Only update password if provided
  if (password) {
    setParts.push('password=$7');
  }
  const { rows } = await pool.query(
    `UPDATE smtp_configs SET ${setParts.join(', ')} WHERE id = $1 AND agent_id = $11
     RETURNING id, agent_id, label, host, port, secure, username, from_email, from_name, is_default, imap_host, imap_port, imap_secure, created_at`,
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

// ─── Uploaded Sheet Recipients ───────────────────────────────────────

async function addCampaignRecipients(campaignId, recipients) {
  if (recipients.length === 0) return;
  const values = [];
  const placeholders = [];
  let idx = 1;
  for (const r of recipients) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++})`);
    values.push(campaignId, r.email, JSON.stringify(r.data || {}));
  }
  await pool.query(
    `INSERT INTO email_campaign_recipients (campaign_id, email, data) VALUES ${placeholders.join(', ')}`,
    values
  );
}

async function getUploadedRecipients(campaignId) {
  const { rows } = await pool.query(
    'SELECT * FROM email_campaign_recipients WHERE campaign_id = $1 AND status = \'pending\' ORDER BY id ASC',
    [campaignId]
  );
  return rows;
}

async function updateUploadedRecipientStatus(id, status, error = null) {
  await pool.query(
    `UPDATE email_campaign_recipients SET status = $1, error_message = $2${status === 'sent' ? ', sent_at = NOW()' : ''} WHERE id = $3`,
    [status, error, id]
  );
}

// ─── Variable Resolution ────────────────────────────────────────────

function resolveVariables(template, entry) {
  if (!template) return '';
  let result = template;
  // Standard variables for lead-sheet entries
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

// Resolve variables from uploaded sheet data (arbitrary column keys)
function resolveUploadedVariables(template, data) {
  if (!template || !data) return template || '';
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'gi');
    result = result.replace(regex, value != null ? String(value) : '');
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

  // Determine recipient source: lead sheet or uploaded sheet
  const useLeadSheet = !!campaign.source_list_id;
  let recipientList;

  if (useLeadSheet) {
    const entries = await getRecipients({ listId: campaign.source_list_id, statusFilter: campaign.status_filter });
    recipientList = entries.map((e) => ({ email: e.primary_email, name: e.name, resolve: (tpl) => resolveVariables(tpl, e) }));
  } else {
    const uploaded = await getUploadedRecipients(campaignId);
    recipientList = uploaded.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.data?.name || r.data?.Name || r.email,
      resolve: (tpl) => resolveUploadedVariables(tpl, r.data),
      uploaded: true,
    }));
  }

  await updateCampaignStatus(campaignId, 'sending', { total_recipients: recipientList.length });

  const room = `agent:${agentId}`;
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipientList.length; i++) {
    const r = recipientList[i];
    const subject = r.resolve(campaign.subject);
    const html = r.resolve(campaign.body);

    try {
      await sendEmail(smtpConfig, { to: r.email, subject, html });
      sentCount++;
      if (r.uploaded) {
        await updateUploadedRecipientStatus(r.id, 'sent');
      }
      await addCampaignLog(campaignId, { email: r.email, name: r.name, status: 'sent' });
    } catch (err) {
      failedCount++;
      if (r.uploaded) {
        await updateUploadedRecipientStatus(r.id, 'failed', err.message);
      }
      await addCampaignLog(campaignId, { email: r.email, name: r.name, status: 'failed', error: err.message });
    }

    io.to(room).emit('email:progress', {
      campaignId,
      current: i + 1,
      total: recipientList.length,
      sentCount,
      failedCount,
      currentEmail: r.email,
    });

    if (i < recipientList.length - 1 && campaign.delay_ms > 0) {
      await new Promise((res) => setTimeout(res, campaign.delay_ms));
    }
  }

  await updateCampaignStatus(campaignId, 'completed', { sent_count: sentCount, failed_count: failedCount });
  io.to(room).emit('email:complete', { campaignId, sentCount, failedCount });
  return { sentCount, failedCount };
}

// ─── Inbox: Fetch emails via IMAP ───────────────────────────────────

async function fetchInboxEmails(agentId) {
  const configs = await getSmtpConfigs(agentId);
  const config = configs[0];
  if (!config) throw new Error('No email account configured');
  if (!config.imap_host) throw new Error('IMAP not configured. Update your email settings with IMAP host.');

  const fullConfig = await getSmtpConfig(config.id, agentId);

  const client = new ImapFlow({
    host: config.imap_host,
    port: config.imap_port || 993,
    secure: config.imap_secure !== false,
    auth: { user: fullConfig.username, pass: fullConfig.password },
    logger: false,
  });

  await client.connect();

  try {
    // Get the highest UID we already have for this agent's inbox
    const { rows: lastRow } = await pool.query(
      "SELECT MAX(uid) AS max_uid FROM emails WHERE agent_id = $1 AND folder = 'inbox'",
      [agentId]
    );
    const lastUid = lastRow[0]?.max_uid || 0;

    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch messages newer than what we have, up to 50
      const range = lastUid > 0 ? `${lastUid + 1}:*` : '1:*';
      let count = 0;
      const maxFetch = 50;

      for await (const message of client.fetch(range, {
        uid: true,
        envelope: true,
        source: true,
        flags: true,
      })) {
        if (count >= maxFetch) break;
        // Skip if we already have this UID
        if (message.uid <= lastUid) continue;

        const parsed = await simpleParser(message.source);

        const fromAddr = parsed.from?.value?.[0]?.address || '';
        const fromName = parsed.from?.value?.[0]?.name || '';
        const toAddr = parsed.to?.value?.[0]?.address || config.from_email;
        const msgId = parsed.messageId || null;
        const isRead = message.flags?.has('\\Seen') || false;
        const hasAttach = parsed.attachments?.length > 0 || false;

        // Check for duplicate message_id
        if (msgId) {
          const { rows: dup } = await pool.query(
            'SELECT id FROM emails WHERE agent_id = $1 AND message_id = $2 LIMIT 1',
            [agentId, msgId]
          );
          if (dup.length > 0) continue;
        }

        await pool.query(
          `INSERT INTO emails (agent_id, message_id, folder, from_address, from_name, to_address, subject, body_html, body_text, is_read, has_attachments, email_date, uid)
           VALUES ($1, $2, 'inbox', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [agentId, msgId, fromAddr, fromName, toAddr, parsed.subject || '(No Subject)', parsed.html || null, parsed.text || null, isRead, hasAttach, parsed.date || new Date(), message.uid]
        );
        count++;
      }
    } finally {
      lock.release();
    }

    // Also fetch sent folder
    try {
      const sentLock = await client.getMailboxLock('[Gmail]/Sent Mail').catch(() =>
        client.getMailboxLock('Sent').catch(() =>
          client.getMailboxLock('INBOX.Sent')
        )
      );

      if (sentLock) {
        try {
          const { rows: lastSentRow } = await pool.query(
            "SELECT MAX(uid) AS max_uid FROM emails WHERE agent_id = $1 AND folder = 'sent'",
            [agentId]
          );
          const lastSentUid = lastSentRow[0]?.max_uid || 0;
          const sentRange = lastSentUid > 0 ? `${lastSentUid + 1}:*` : '1:*';
          let sentCount = 0;

          for await (const message of client.fetch(sentRange, {
            uid: true,
            envelope: true,
            source: true,
          })) {
            if (sentCount >= 50) break;
            if (message.uid <= lastSentUid) continue;

            const parsed = await simpleParser(message.source);
            const toAddr = parsed.to?.value?.[0]?.address || '';
            const msgId = parsed.messageId || null;

            if (msgId) {
              const { rows: dup } = await pool.query(
                'SELECT id FROM emails WHERE agent_id = $1 AND message_id = $2 LIMIT 1',
                [agentId, msgId]
              );
              if (dup.length > 0) continue;
            }

            await pool.query(
              `INSERT INTO emails (agent_id, message_id, folder, from_address, from_name, to_address, subject, body_html, body_text, is_read, has_attachments, email_date, uid)
               VALUES ($1, $2, 'sent', $3, $4, $5, $6, $7, $8, true, $9, $10, $11)`,
              [agentId, msgId, config.from_email, config.from_name || '', toAddr, parsed.subject || '(No Subject)', parsed.html || null, parsed.text || null, parsed.attachments?.length > 0 || false, parsed.date || new Date(), message.uid]
            );
            sentCount++;
          }
        } finally {
          sentLock.release();
        }
      }
    } catch {
      // Sent folder not found or not accessible — skip silently
    }
  } finally {
    await client.logout();
  }
}

async function getEmails(agentId, { folder = 'all', page = 1, limit = 30, search = '' }) {
  const offset = (page - 1) * limit;
  const params = [agentId];
  let folderClause = '';
  if (folder !== 'all') {
    params.push(folder);
    folderClause = ` AND folder = $${params.length}`;
  }

  let searchClause = '';
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    const idx = params.length;
    searchClause = ` AND (subject ILIKE $${idx} OR from_address ILIKE $${idx} OR from_name ILIKE $${idx} OR to_address ILIKE $${idx})`;
  }

  const { rows } = await pool.query(
    `SELECT id, message_id, folder, from_address, from_name, to_address, subject, is_read, has_attachments, email_date, created_at
     FROM emails
     WHERE agent_id = $1 ${folderClause} ${searchClause}
     ORDER BY email_date DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM emails WHERE agent_id = $1 ${folderClause} ${searchClause}`,
    params
  );

  return { emails: rows, total: countRows[0].count, page, limit };
}

async function getEmailById(id, agentId) {
  const { rows } = await pool.query(
    'SELECT * FROM emails WHERE id = $1 AND agent_id = $2',
    [id, agentId]
  );
  return rows[0] || null;
}

async function markEmailRead(id, agentId) {
  await pool.query('UPDATE emails SET is_read = true WHERE id = $1 AND agent_id = $2', [id, agentId]);
}

async function getUnreadCount(agentId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM emails WHERE agent_id = $1 AND folder = 'inbox' AND is_read = false",
    [agentId]
  );
  return rows[0].count;
}

// Also save sent emails locally when sending via compose/campaign
async function saveSentEmail(agentId, { to, subject, html, messageId }) {
  const configs = await getSmtpConfigs(agentId);
  const config = configs[0];
  await pool.query(
    `INSERT INTO emails (agent_id, message_id, folder, from_address, from_name, to_address, subject, body_html, is_read, email_date)
     VALUES ($1, $2, 'sent', $3, $4, $5, $6, $7, true, NOW())`,
    [agentId, messageId || null, config?.from_email || '', config?.from_name || '', to, subject, html]
  );
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
  resolveUploadedVariables,
  addCampaignRecipients,
  getUploadedRecipients,
  updateUploadedRecipientStatus,
  sendEmail,
  runCampaign,
  fetchInboxEmails,
  getEmails,
  getEmailById,
  markEmailRead,
  getUnreadCount,
  saveSentEmail,
};
