const pool = require('../db/pool');

async function insertEntries(client, listId, entries) {
  if (entries.length === 0) return;
  const values = [];
  const placeholders = [];
  let idx = 1;
  for (const entry of entries) {
    placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    values.push(
      listId,
      entry.phone_number,
      entry.name || null,
      entry.primary_email || null,
      JSON.stringify(entry.metadata || {})
    );
  }
  await client.query(
    `INSERT INTO phone_list_entries (list_id, phone_number, name, primary_email, metadata)
     VALUES ${placeholders.join(', ')}`,
    values
  );
}

async function createList({ name, agentId, totalCount }) {
  const { rows } = await pool.query(
    `INSERT INTO phone_lists (name, agent_id, total_count)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, agentId, totalCount]
  );
  return rows[0];
}

async function addEntries(listId, entries) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await insertEntries(client, listId, entries);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getLists(agentId) {
  const { rows } = await pool.query(
    `SELECT pl.*,
            COUNT(CASE WHEN ple.called THEN 1 END)::int AS called_count
     FROM phone_lists pl
     LEFT JOIN phone_list_entries ple ON ple.list_id = pl.id
     WHERE pl.agent_id = $1
     GROUP BY pl.id
     ORDER BY pl.created_at DESC`,
    [agentId]
  );
  return rows;
}

async function getListEntries({ listId, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    `SELECT * FROM phone_list_entries
     WHERE list_id = $1
     ORDER BY
       CASE status
         WHEN 'follow_up'       THEN 1
         WHEN 'no_answer'       THEN 2
         WHEN 'pending'         THEN 3
         WHEN 'called'          THEN 4
         WHEN 'not_interested'  THEN 5
         WHEN 'do_not_contact'  THEN 6
         ELSE 7
       END,
       id ASC
     LIMIT $2 OFFSET $3`,
    [listId, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*) FROM phone_list_entries WHERE list_id = $1',
    [listId]
  );

  return { entries: rows, total: parseInt(countRows[0].count, 10), page, limit };
}

async function markEntryCalled(entryId) {
  const { rows } = await pool.query(
    `UPDATE phone_list_entries
     SET called = true, called_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [entryId]
  );
  return rows[0] || null;
}

async function getEntry(entryId) {
  const { rows } = await pool.query(
    'SELECT * FROM phone_list_entries WHERE id = $1',
    [entryId]
  );
  return rows[0] || null;
}

async function updateEntryStatus(entryId, status, followUpAt = null) {
  const effectiveFollowUp = status === 'follow_up' ? followUpAt : null;
  const { rows } = await pool.query(
    `UPDATE phone_list_entries SET status = $1, follow_up_at = $2 WHERE id = $3 RETURNING *`,
    [status, effectiveFollowUp, entryId]
  );
  return rows[0] || null;
}

async function getFollowUps(agentId, start, end) {
  const { rows } = await pool.query(
    `SELECT ple.id, ple.name, ple.phone_number, ple.follow_up_at, ple.status,
            pl.name AS list_name
     FROM phone_list_entries ple
     JOIN phone_lists pl ON pl.id = ple.list_id
     WHERE pl.agent_id = $1
       AND ple.follow_up_at >= $2
       AND ple.follow_up_at < $3
       AND ple.status = 'follow_up'
     ORDER BY ple.follow_up_at ASC`,
    [agentId, start, end]
  );
  return rows;
}

async function deleteList(listId) {
  const { rowCount } = await pool.query('DELETE FROM phone_lists WHERE id = $1', [listId]);
  return rowCount > 0;
}

module.exports = {
  createList,
  addEntries,
  getLists,
  getListEntries,
  getEntry,
  markEntryCalled,
  updateEntryStatus,
  getFollowUps,
  deleteList,
};
