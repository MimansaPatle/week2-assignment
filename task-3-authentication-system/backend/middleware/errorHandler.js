/**
 * Error handling
 * Every error leaves the API as JSON in one shape: { success: false, message }.
 * Stack traces and database messages are logged on the server only.
 */

const DATABASE_UNAVAILABLE = 'Service temporarily unavailable. Please try again shortly.';

/**
 * 404 handler for unknown routes
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

const isDatabaseDown = (err) =>
  /ServerSelection|Network|NotConnected|Topology/.test(err.name || '') ||
  /buffering timed out/.test(err.message || '');

/**
 * Global error handler
 * Express recognises it by its four arguments.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Request body that is not valid JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Request body is not valid JSON',
    });
  }

  // Request body larger than the limit set in app.js
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body is too large',
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  // Never log request bodies here: they can contain passwords.
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err.message);
  }

  if (isDatabaseDown(err)) {
    return res.status(503).json({
      success: false,
      message: DATABASE_UNAVAILABLE,
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

module.exports = {
  notFound,
  errorHandler,
  DATABASE_UNAVAILABLE,
};
