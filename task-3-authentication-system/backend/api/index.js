// Entry point used by Vercel, where the API runs as a serverless function.
// server.js is still what runs locally (npm start / npm run dev).
const { validateEnv } = require('../config/env');
const createApp = require('../app');
const connectDB = require('../config/db');

const app = createApp();

// Vercel sits in front of the app, so the visitor's address comes from the
// X-Forwarded-For header. The rate limiter needs this to tell visitors apart.
app.set('trust proxy', 1);

// One connection attempt is shared by all requests handled by this instance
let connecting = null;

module.exports = async (req, res) => {
  try {
    validateEnv();
    if (!connectDB.isDatabaseConnected()) {
      connecting = connecting || connectDB();
      await connecting;
    }
  } catch (error) {
    // The app itself answers 503 on /api/auth while the database is down
    connecting = null;
    console.error(error.message);
  }

  return app(req, res);
};
