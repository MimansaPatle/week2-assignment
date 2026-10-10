// Load backend/.env before anything else reads process.env
require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const { isDatabaseConnected } = require('./config/db');
const { notFound, errorHandler, DATABASE_UNAVAILABLE } = require('./middleware/errorHandler');

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Build a rate limiter that answers with the API's usual JSON shape
 */
const createLimiter = (max, options = {}) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many attempts. Please try again in a few minutes.',
    },
    ...options,
  });

/**
 * Create the Express application
 * server.js starts it; the tests create their own copies.
 *
 * Options (used by the tests):
 *   loginRateLimit     failed logins allowed per 15 minutes, per IP address
 *   registerRateLimit  registrations allowed per 15 minutes, per IP address
 *   apiRateLimit       requests to /api/auth allowed per 15 minutes, per IP address
 */
const createApp = (options = {}) => {
  const {
    loginRateLimit = Number(process.env.LOGIN_RATE_LIMIT) || 10,
    registerRateLimit = Number(process.env.REGISTER_RATE_LIMIT) || 10,
    apiRateLimit = Number(process.env.API_RATE_LIMIT) || 300,
  } = options;

  const app = express();

  // ==================== MIDDLEWARE ====================

  // Security headers
  app.use(helmet());

  // CORS configuration: only the configured frontend may call the API from a
  // browser. Several addresses can be listed, separated by commas.
  // A browser sends its origin without a trailing slash, so one written in
  // FRONTEND_URL ("http://localhost:5173/") is removed; otherwise it would
  // never match and every request would be blocked.
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const corsOptions = {
    origin: allowedOrigins,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));

  // Body parser, with a small size limit
  app.use(express.json({ limit: '10kb' }));

  // ==================== ROUTES ====================

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      database: isDatabaseConnected() ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  });

  // Rate limiting for auth endpoints.
  // Login only counts failed attempts, so normal use is never blocked, while
  // password guessing from one address is slowed down.
  const apiLimiter = createLimiter(apiRateLimit);
  const loginLimiter = createLimiter(loginRateLimit, { skipSuccessfulRequests: true });
  const registerLimiter = createLimiter(registerRateLimit);

  // Answer at once when MongoDB is not reachable, instead of leaving the request waiting
  const requireDatabase = (req, res, next) => {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ success: false, message: DATABASE_UNAVAILABLE });
    }
    next();
  };

  app.use('/api/auth', apiLimiter, requireDatabase);
  app.use('/api/auth/login', loginLimiter);
  app.use('/api/auth/register', registerLimiter);
  app.use('/api/auth', authRoutes);

  // ==================== ERROR HANDLER ====================

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
