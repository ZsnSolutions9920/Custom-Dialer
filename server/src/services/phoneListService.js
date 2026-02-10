const pool = require('../db/pool');

async function createList({ name, agentId, entries }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: listRows } = await client.query(
      `INSERT INTO phone_lists (name, agent_id, total_count)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, agentId, entries.length]
    );
    const list = listRows[0];

    if (entries.length > 0) {
      const values = [];
      const placeholders = [];
      let idx = 1;
      for (const entry of entries) {
        placeholders.push(`($${idx++}, $${idx++}, $${idx++})`);
        values.push(list.id, entry.phone_number, entry.name || null);
      }
      await client.query(
        `INSERT INTO phone_list_entries (list_id, phone_number, name)
         VALUES ${placeholders.join(', ')}`,
        values
      );
    }

    await client.query('COMMIT');
    return list;
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
     ORDER BY id ASC
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

async function deleteList(listId) {
  const { rowCount } = await pool.query('DELETE FROM phone_lists WHERE id = $1', [listId]);
  return rowCount > 0;
}

module.exports = {
  createList,
  getLists,
  getListEntries,
  markEntryCalled,
  deleteList,
};
