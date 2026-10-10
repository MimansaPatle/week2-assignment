const path = require('path');
const dotenv = require('dotenv');

/**
 * Environment configuration
 *
 * Loads backend/.env using an absolute path, so the settings are found no
 * matter which folder the server is started from. Variables that are already
 * set in the real environment are kept (this is how the tests point the app
 * at a separate database).
 */
const ENV_FILE = path.join(__dirname, '..', '.env');
dotenv.config({ path: ENV_FILE });

const JWT_SECRET_PLACEHOLDER = 'replace_with_a_strong_random_secret';
const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Check that the required settings are present and usable.
 * Returns a list of problems; an empty list means the configuration is fine.
 */
const findConfigProblems = () => {
  const problems = [];
  const { MONGODB_URI, JWT_SECRET } = process.env;

  if (!MONGODB_URI) {
    problems.push('MONGODB_URI is not set (example: mongodb://127.0.0.1:27017/authentication_system_mern)');
  }

  if (!JWT_SECRET) {
    problems.push('JWT_SECRET is not set');
  } else if (JWT_SECRET === JWT_SECRET_PLACEHOLDER) {
    problems.push('JWT_SECRET still has the placeholder value from .env.example');
  } else if (JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
    problems.push(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters long`);
  }

  return problems;
};

/**
 * Stop with a clear message if the configuration is incomplete.
 * There is deliberately no fallback JWT secret.
 */
const validateEnv = () => {
  const problems = findConfigProblems();
  if (problems.length === 0) return;

  const lines = [
    'Configuration error. The server cannot start:',
    ...problems.map((problem) => `  - ${problem}`),
    '',
    `Create ${ENV_FILE} by copying .env.example, then set the values above.`,
    'Generate a JWT secret with:',
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  ];
  throw new Error(lines.join('\n'));
};

module.exports = {
  ENV_FILE,
  JWT_SECRET_PLACEHOLDER,
  findConfigProblems,
  validateEnv,
};
