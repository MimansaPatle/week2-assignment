// Central error handling: every error leaves the API as JSON in one shape,
//   { success: false, message, errors? }
// and no stack trace or database detail is sent to the client.
const mongoose = require('mongoose');

// An error with an HTTP status that is safe to show to the user.
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const DATABASE_UNAVAILABLE = 'The database is unavailable. Please try again shortly.';

const CAST_MESSAGES = {
  salary: 'Salary must be a number.',
  joiningDate: 'Enter a valid date in YYYY-MM-DD format.',
};

const DUPLICATE_MESSAGES = {
  employeeId: 'An employee with this Employee ID already exists.',
};

// Turns a Mongoose validation error into { field: message }.
function fieldErrors(validationError) {
  const errors = {};
  for (const [field, problem] of Object.entries(validationError.errors)) {
    errors[field] = problem.name === 'CastError' ? CAST_MESSAGES[field] || 'This value is not valid.' : problem.message;
  }
  return errors;
}

function isDatabaseDown(error) {
  return (
    /ServerSelection|Network|NotConnected|Topology/.test(error.name || '') ||
    /bufferCommands|buffering timed out/.test(error.message || '')
  );
}

// Requests to an address that does not exist.
function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises an error handler by its four arguments.
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  // Body sent with Content-Type: application/json that is not valid JSON.
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body is not valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large.' });
  }

  if (error instanceof HttpError) {
    const body = { success: false, message: error.message };
    if (error.errors) body.errors = error.errors;
    return res.status(error.status).json(body);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Please correct the highlighted fields.',
      errors: fieldErrors(error),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: 'The request contains a value that is not valid.' });
  }

  // MongoDB's duplicate-key error, raised by the unique index.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'employeeId';
    const message = DUPLICATE_MESSAGES[field] || 'This value is already in use.';
    return res.status(409).json({ success: false, message, errors: { [field]: message } });
  }

  if (isDatabaseDown(error)) {
    console.error(`Database error: ${error.message}`);
    return res.status(503).json({ success: false, message: DATABASE_UNAVAILABLE });
  }

  console.error(error);
  return res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
}

module.exports = { HttpError, notFound, errorHandler, DATABASE_UNAVAILABLE };
