const User = require('../models/User');
const RevokedToken = require('../models/RevokedToken');
const { verifyToken } = require('../utils/jwt');

const unauthorized = (res, message, code) =>
  res.status(401).json({ success: false, message, code });

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Attaches the user and the token payload to the request object
 *
 * A request is refused (401) when the token is missing, malformed, signed
 * with another key, expired, revoked by a logout, or belongs to an account
 * that no longer exists.
 */
const protect = async (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided', 'TOKEN_MISSING');
  }

  const token = authHeader.substring(7).trim(); // Remove 'Bearer ' prefix

  // Verify signature and expiry
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expired', 'TOKEN_EXPIRED');
    }
    return unauthorized(res, 'Invalid token', 'TOKEN_INVALID');
  }

  if (typeof decoded.userId !== 'string' || typeof decoded.jti !== 'string') {
    return unauthorized(res, 'Invalid token', 'TOKEN_INVALID');
  }

  try {
    // Refuse a token that was logged out
    const revoked = await RevokedToken.exists({ jti: decoded.jti });
    if (revoked) {
      return unauthorized(res, 'Token has been revoked', 'TOKEN_REVOKED');
    }

    // The account must still exist
    const user = await User.findById(decoded.userId);
    if (!user) {
      return unauthorized(res, 'Invalid token', 'TOKEN_INVALID');
    }

    // Attach user and token details to request
    req.user = user;
    req.userId = decoded.userId;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    // A user id that is not a valid ObjectId cannot belong to anyone
    if (error.name === 'CastError') {
      return unauthorized(res, 'Invalid token', 'TOKEN_INVALID');
    }
    next(error);
  }
};

module.exports = { protect };
