const mongoose = require('mongoose');

/**
 * Connect to MongoDB
 * Uses MONGODB_URI from environment variables
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  let conn;
  try {
    conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    throw new Error(
      `MongoDB connection failed: ${error.message}\n` +
        'Check that MongoDB is running (Windows: run "net start MongoDB" in an ' +
        'Administrator terminal) and that MONGODB_URI in backend/.env is correct.'
    );
  }

  // Build the unique indexes now, so MongoDB itself refuses a second account
  // with the same email or username.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));

  console.log(`✓ MongoDB connected: ${conn.connection.host}`);
  console.log(`✓ Database: ${conn.connection.name}`);
  return conn;
};

/**
 * True while the database connection is open (Mongoose readyState 1)
 */
const isDatabaseConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.isDatabaseConnected = isDatabaseConnected;
