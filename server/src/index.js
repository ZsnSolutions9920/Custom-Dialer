const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const config = require('./config');
const logger = require('./utils/logger');
const { setupSocket } = require('./socket');

// Routes
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const agentRoutes = require('./routes/agents');
const tokenRoutes = require('./routes/token');
const callRoutes = require('./routes/calls');
const contactRoutes = require('./routes/contacts');
const phoneListRoutes = require('./routes/phoneLists');
const twilioRoutes = require('./routes/twilio');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(helmet());
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
app.use('/api/contacts', authMiddleware, contactRoutes);
app.use('/api/phone-lists', authMiddleware, phoneListRoutes);
app.use('/api/twilio', twilioRoutes);

// Serve React frontend in production
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

server.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port}`);
});
