const express = require('express');
const phoneListService = require('../services/phoneListService');
const logger = require('../utils/logger');

const router = express.Router();

// Create a new phone list
router.post('/', async (req, res) => {
  try {
    const { name, entries } = req.body;
    if (!name || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'name and a non-empty entries array are required' });
    }
    const list = await phoneListService.createList({
      name,
      agentId: req.agent.id,
      entries,
    });
    res.status(201).json(list);
  } catch (err) {
    logger.error(err, 'Error creating phone list');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all lists for the authenticated agent
router.get('/', async (req, res) => {
  try {
    const lists = await phoneListService.getLists(req.agent.id);
    res.json(lists);
  } catch (err) {
    logger.error(err, 'Error fetching phone lists');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get paginated entries for a list
router.get('/:id/entries', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await phoneListService.getListEntries({
      listId: req.params.id,
      page,
      limit,
    });
    res.json(result);
  } catch (err) {
    logger.error(err, 'Error fetching list entries');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single entry by ID
router.get('/entries/:entryId', async (req, res) => {
  try {
    const entry = await phoneListService.getEntry(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    logger.error(err, 'Error fetching entry');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark an entry as called
router.patch('/:entryId/called', async (req, res) => {
  try {
    const entry = await phoneListService.markEntryCalled(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json(entry);
  } catch (err) {
    logger.error(err, 'Error marking entry as called');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a list
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await phoneListService.deleteList(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'List not found' });
    res.json({ ok: true });
  } catch (err) {
    logger.error(err, 'Error deleting phone list');
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
