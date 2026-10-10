// Load backend/.env before anything else reads process.env
const { validateEnv } = require('./config/env');
const createApp = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

// Start server
const startServer = async () => {
  try {
    // Stop early, with a clear message, if a required setting is missing
    validateEnv();

    // Connect to MongoDB
    await connectDB();

    // Start Express server
    const server = createApp().listen(PORT, () => {
      console.log(`\n✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
    });

    server.on('error', (error) => {
      const reason = error.code === 'EADDRINUSE' ? `port ${PORT} is already in use` : error.message;
      console.error(`Failed to start server: ${reason}`);
      process.exit(1);
    });
  } catch (error) {
    console.error(`\n✗ ${error.message}\n`);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
