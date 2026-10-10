// The Express application: middleware, routes and error handling.
// server.js starts it; the tests import it without starting a real server.
const express = require('express');
const cors = require('cors');

const { isConnected } = require('./config/db');
const employeeRoutes = require('./routes/employeeRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

function createApp() {
  const app = express();

  // Only the listed frontend addresses may call the API from a browser.
  const origins = (process.env.CLIENT_ORIGIN || DEFAULT_CLIENT_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins }));

  // Parse JSON request bodies.
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'ok',
      database: isConnected() ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api/employees', employeeRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
