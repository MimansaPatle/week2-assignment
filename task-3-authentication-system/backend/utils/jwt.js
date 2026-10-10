const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ALGORITHM = 'HS256';

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return process.env.JWT_SECRET;
};

/**
 * Generate JWT token
 * @param {string} userId - User ID to encode in token
 * @returns {string} Signed JWT token
 *
 * The token carries the user id and a random token id (jti). The jti is what
 * logout stores to revoke this one token. No personal data is put in it.
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, getSecret(), {
    algorithm: ALGORITHM,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    jwtid: crypto.randomUUID(),
  });
};

/**
 * Verify JWT token
 * @param {string} token - Token to verify
 * @returns {object} Decoded token payload
 *
 * Checks the signature and the expiry. Naming the algorithm stops a forged
 * token from choosing its own (for example "none").
 */
const verifyToken = (token) => {
  return jwt.verify(token, getSecret(), { algorithms: [ALGORITHM] });
};

module.exports = {
  generateToken,
  verifyToken,
};
