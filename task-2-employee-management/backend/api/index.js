// Entry point used by Vercel, where the API runs as a serverless function.
// server.js is still what runs locally (npm start / npm run dev).
require('dotenv').config({ quiet: true });

const createApp = require('../app');
const { connectDB, isConnected } = require('../config/db');

const app = createApp();

// One connection attempt is shared by all requests handled by this instance.
let connecting = null;

module.exports = async (req, res) => {
  try {
    if (!isConnected()) {
      connecting = connecting || connectDB();
      await connecting;
    }
  } catch (error) {
    // The app itself answers 503 on /api/employees while the database is down.
    connecting = null;
    console.error(`MongoDB connection failed: ${error.message}`);
  }

  return app(req, res);
};
