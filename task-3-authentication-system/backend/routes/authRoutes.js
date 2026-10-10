const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getCurrentUser,
  logout,
} = require('../controllers/authController');
const {
  validateRegister,
  validateLogin,
} = require('../middleware/validateRequest');
const { protect } = require('../middleware/authMiddleware');

/**
 * POST /api/auth/register
 * Register a new user
 * Body: { username, email, password, confirmPassword }
 * Returns: { success, message, user }
 * Status: 201 Created
 */
router.post('/register', validateRegister, register);

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 * Body: { email, password }  ("email" may hold the email address or the username)
 * Returns: { success, message, token, user }
 * Status: 200 OK
 */
router.post('/login', validateLogin, login);

/**
 * GET /api/auth/me
 * Get current authenticated user
 * Headers: Authorization: Bearer <token>
 * Returns: { success, user }
 * Status: 200 OK
 * Protected: Yes (requires valid JWT)
 */
router.get('/me', protect, getCurrentUser);

/**
 * POST /api/auth/logout
 * Logout user and revoke the token used for the request
 * Headers: Authorization: Bearer <token>
 * Returns: { success, message }
 * Status: 200 OK
 * Protected: Yes (requires valid JWT)
 */
router.post('/logout', protect, logout);

module.exports = router;
