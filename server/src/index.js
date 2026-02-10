const express = require('express');
const cors = require('cors');
const http = require('http');
const config = require('./config');
const logger = require('./utils/logger');
const { setupSocket } = require('./socket');

// Routes
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const tokenRoutes = require('./routes/token');
const callRoutes = require('./routes/calls');
const twilioRoutes = require('./routes/twilio');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Socket.IO
const io = setupSocket(server);
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/twilio', twilioRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});
