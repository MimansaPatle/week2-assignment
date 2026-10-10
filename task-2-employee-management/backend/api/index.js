// Entry point used by Vercel, where the API runs as a serverless function.
// server.js is still what runs locally (npm start / npm run dev).
require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');

const createApp = require('../app');
const { connectDB, isConnected } = require('../config/db');

const app = createApp();

// One connection attempt is shared by all requests handled by this instance.
let connecting = null;
let connectedOnce = false;

async function ensureConnected() {
  if (isConnected()) return;

  if (connectedOnce) {
    // Vercel pauses the function between requests, so the connection can look
    // lost for a moment. The driver reconnects by itself; a ping makes it
    // check right now instead of the request being answered with 503.
    await mongoose.connection.db.command({ ping: 1 });
    return;
  }

  connecting = connecting || connectDB();
  await connecting;
  connectedOnce = true;
}

module.exports = async (req, res) => {
  try {
    await ensureConnected();
  } catch (error) {
    // The app itself answers 503 on /api/employees while the database is down.
    connecting = null;
    console.error(`MongoDB connection failed: ${error.message}`);
  }

  return app(req, res);
};
