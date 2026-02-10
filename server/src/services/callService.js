const twilioClient = require('./twilioClient');
const pool = require('../db/pool');
const logger = require('../utils/logger');

async function createActiveCall({ callSid, conferenceSid, conferenceName, agentId, direction, from, to, status }) {
  const { rows } = await pool.query(
    `INSERT INTO active_calls (call_sid, conference_sid, conference_name, agent_id, direction, from_number, to_number, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (call_sid) DO UPDATE SET
       conference_sid = COALESCE(EXCLUDED.conference_sid, active_calls.conference_sid),
       conference_name = COALESCE(EXCLUDED.conference_name, active_calls.conference_name),
       status = EXCLUDED.status
     RETURNING *`,
    [callSid, conferenceSid, conferenceName, agentId, direction, from, to, status || 'initiated']
  );
  return rows[0];
}

async function getActiveCallByAgent(agentId) {
  const { rows } = await pool.query('SELECT * FROM active_calls WHERE agent_id = $1', [agentId]);
  return rows[0] || null;
}

async function getActiveCallBySid(callSid) {
  const { rows } = await pool.query('SELECT * FROM active_calls WHERE call_sid = $1', [callSid]);
  return rows[0] || null;
}

async function getActiveCallByConference(conferenceName) {
  const { rows } = await pool.query('SELECT * FROM active_calls WHERE conference_name = $1 LIMIT 1', [conferenceName]);
  return rows[0] || null;
}

async function removeActiveCall(callSid) {
  await pool.query('DELETE FROM active_calls WHERE call_sid = $1', [callSid]);
}

async function removeActiveCallsByConference(conferenceName) {
  await pool.query('DELETE FROM active_calls WHERE conference_name = $1', [conferenceName]);
}

async function createCallLog({ callSid, conferenceSid, direction, agentId, from, to, status }) {
  const { rows } = await pool.query(
    `INSERT INTO call_logs (call_sid, conference_sid, direction, agent_id, from_number, to_number, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (call_sid) DO UPDATE SET
       conference_sid = COALESCE(EXCLUDED.conference_sid, call_logs.conference_sid),
       status = EXCLUDED.status
     RETURNING *`,
    [callSid, conferenceSid, direction, agentId, from, to, status || 'initiated']
  );
  return rows[0];
}

async function updateCallLog(callSid, updates) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    const column = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    fields.push(`${column} = $${idx}`);
    values.push(val);
    idx++;
  }
  values.push(callSid);

  if (fields.length === 0) return null;

  const { rows } = await pool.query(
    `UPDATE call_logs SET ${fields.join(', ')} WHERE call_sid = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function getCallLogs({ page = 1, limit = 50 }) {
  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT cl.*, a.display_name as agent_name
     FROM call_logs cl
     LEFT JOIN agents a ON cl.agent_id = a.id
     ORDER BY cl.started_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: countRows } = await pool.query('SELECT COUNT(*) FROM call_logs');
  return { calls: rows, total: parseInt(countRows[0].count, 10), page, limit };
}

async function toggleHold(conferenceSid, callSid, hold) {
  const conferences = await twilioClient.conferences(conferenceSid).participants.list();
  // Find the external participant (non-client)
  for (const p of conferences) {
    if (p.callSid === callSid) {
      await twilioClient.conferences(conferenceSid).participants(callSid).update({ hold });
      logger.info({ conferenceSid, callSid, hold }, 'Toggled hold');
      return { held: hold };
    }
  }
  throw new Error('Participant not found in conference');
}

async function holdParticipant(conferenceSid, participantCallSid, hold) {
  await twilioClient.conferences(conferenceSid).participants(participantCallSid).update({
    hold,
    holdUrl: hold ? `${require('../config').serverBaseUrl}/api/twilio/hold-music` : undefined,
  });
  return { held: hold };
}

async function hangupConference(conferenceName) {
  // Find the conference by friendly name
  const conferences = await twilioClient.conferences.list({
    friendlyName: conferenceName,
    status: 'in-progress',
  });

  for (const conf of conferences) {
    const participants = await twilioClient.conferences(conf.sid).participants.list();
    for (const p of participants) {
      await twilioClient.conferences(conf.sid).participants(p.callSid).remove();
    }
    logger.info({ conferenceName, conferenceSid: conf.sid }, 'Conference ended');
  }
}

async function addParticipantToConference(conferenceName, to, from) {
  const participant = await twilioClient.conferences(conferenceName)
    .participants
    .create({
      to,
      from,
      earlyMedia: true,
      endConferenceOnExit: false,
    });
  return participant;
}

module.exports = {
  createActiveCall,
  getActiveCallByAgent,
  getActiveCallBySid,
  getActiveCallByConference,
  removeActiveCall,
  removeActiveCallsByConference,
  createCallLog,
  updateCallLog,
  getCallLogs,
  toggleHold,
  holdParticipant,
  hangupConference,
  addParticipantToConference,
};
