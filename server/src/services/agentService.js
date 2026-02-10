const pool = require('../db/pool');

async function findByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM agents WHERE username = $1', [username]);
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
  return rows[0] || null;
}

async function findByIdentity(identity) {
  const { rows } = await pool.query('SELECT * FROM agents WHERE twilio_identity = $1', [identity]);
  return rows[0] || null;
}

async function listAll() {
  const { rows } = await pool.query(
    'SELECT id, username, display_name, twilio_identity, status FROM agents ORDER BY id'
  );
  return rows;
}

async function listAvailable() {
  const { rows } = await pool.query(
    "SELECT * FROM agents WHERE status = 'available' ORDER BY id"
  );
  return rows;
}

async function updateStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE agents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, display_name, twilio_identity, status',
    [status, id]
  );
  return rows[0] || null;
}

module.exports = { findByUsername, findById, findByIdentity, listAll, listAvailable, updateStatus };
