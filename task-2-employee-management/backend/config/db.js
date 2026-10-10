// MongoDB connection, kept apart from the routes.
const mongoose = require('mongoose');

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/employee_management_mern';
const RETRY_DELAY_MS = 5000;

async function connectDB(uri = process.env.MONGODB_URI || DEFAULT_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // Build each model's indexes now that the database is reachable. The unique
  // index on employeeId is what makes MongoDB itself refuse a duplicate ID.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));
  return mongoose.connection;
}

// Used by server.js: keeps trying until MongoDB is reachable, so the API can
// be started before the database. Once connected, Mongoose reconnects by
// itself if the connection drops.
async function connectWithRetry() {
  try {
    const connection = await connectDB();
    console.log(`MongoDB connected: database "${connection.name}"`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    console.error(`Trying again in ${RETRY_DELAY_MS / 1000} seconds...`);
    setTimeout(connectWithRetry, RETRY_DELAY_MS).unref();
  }
}

// 1 means connected (Mongoose readyState).
const isConnected = () => mongoose.connection.readyState === 1;

module.exports = { connectDB, connectWithRetry, isConnected };
