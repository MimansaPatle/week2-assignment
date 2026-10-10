// Runs before every test file (see "jest.setupFiles" in package.json).
//
// These values are set before the app loads backend/.env, and values that
// are already set are never replaced by the file. So the tests always use
// their own database and their own secret, never the development ones.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/authentication_system_mern_test';
process.env.JWT_SECRET = 'test-only-secret-used-by-the-automated-tests-0123456789';
process.env.JWT_EXPIRES_IN = '15m';
process.env.FRONTEND_URL = 'http://localhost:5173';
// The lowest bcrypt cost keeps the tests fast. The app itself uses 12.
process.env.BCRYPT_ROUNDS = '4';
