const express = require('express');
const authMiddleware = require('../middleware/auth');
const { generateAccessToken } = require('../services/tokenService');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const token = generateAccessToken(req.agent.twilioIdentity);
    res.json({ token, identity: req.agent.twilioIdentity });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

module.exports = router;
