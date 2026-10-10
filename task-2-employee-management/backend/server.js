// Entry point: loads the settings, connects to MongoDB and starts the API.
//   npm start      run once
//   npm run dev    restart automatically when a file changes
require('dotenv').config({ quiet: true });

const createApp = require('./app');
const { connectWithRetry } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
  console.log(`Health check:  http://localhost:${PORT}/api/health`);
});

server.on('error', (error) => {
  const reason = error.code === 'EADDRINUSE' ? `port ${PORT} is already in use` : error.message;
  console.error(`Could not start the API: ${reason}.`);
  process.exit(1);
});

connectWithRetry();
