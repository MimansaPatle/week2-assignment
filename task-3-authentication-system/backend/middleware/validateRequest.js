const validator = require('validator');

const USERNAME_PATTERN = /^[a-z0-9_-]+$/;
const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password, so longer ones are
// refused instead of being silently cut short.
const PASSWORD_MAX_BYTES = 72;
const EMAIL_MAX_LENGTH = 254;

/**
 * Read a field as text.
 * Anything that is not a string (for example an object such as {"$ne": ""},
 * which MongoDB would treat as a query operator) is treated as missing.
 */
const text = (body, field) => (body && typeof body[field] === 'string' ? body[field] : '');

const validationFailed = (res, fields, message = 'Validation failed') =>
  res.status(400).json({ success: false, message, fields });

/**
 * Check one password against the strength rules.
 * Returns an error message, or null when the password is acceptable.
 */
const passwordProblem = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return 'Password must not exceed 72 characters';
  return null;
};

/**
 * Validate registration request
 * Sanitizes the input (trim, lower case) and reports every invalid field.
 */
const validateRegister = (req, res, next) => {
  // Usernames and emails are stored in lower case, so "Dana" and "dana" are
  // the same account. Passwords are never trimmed or altered.
  const username = text(req.body, 'username').trim().toLowerCase();
  const email = text(req.body, 'email').trim().toLowerCase();
  const password = text(req.body, 'password');
  const confirmPassword = text(req.body, 'confirmPassword');

  const fields = {};

  // Validate username
  if (!username) {
    fields.username = 'Username is required';
  } else if (username.length < 3) {
    fields.username = 'Username must be at least 3 characters long';
  } else if (username.length > 30) {
    fields.username = 'Username must not exceed 30 characters';
  } else if (!USERNAME_PATTERN.test(username)) {
    fields.username = 'Username can only contain letters, numbers, underscores, and hyphens';
  }

  // Validate email
  if (!email) {
    fields.email = 'Email is required';
  } else if (email.length > EMAIL_MAX_LENGTH || !validator.isEmail(email)) {
    fields.email = 'Please provide a valid email address';
  }

  // Validate password strength (minimum 8 characters, at least one uppercase, one lowercase, one number)
  if (!password) {
    fields.password = 'Password is required';
  } else if (passwordProblem(password)) {
    fields.password = passwordProblem(password);
  }

  // Check password confirmation
  if (!confirmPassword) {
    fields.confirmPassword = 'Confirm password is required';
  } else if (password !== confirmPassword) {
    fields.confirmPassword = 'Passwords do not match';
  }

  if (Object.keys(fields).length > 0) {
    return validationFailed(res, fields);
  }

  // Attach validated data to request
  req.validatedData = { username, email, password };

  next();
};

/**
 * Validate login request
 * The "email" field holds either the email address or the username.
 */
const validateLogin = (req, res, next) => {
  const identifier = text(req.body, 'email').trim().toLowerCase();
  const password = text(req.body, 'password');

  const fields = {};
  if (!identifier) fields.email = 'Email or username is required';
  if (!password) fields.password = 'Password is required';

  if (Object.keys(fields).length > 0) {
    return validationFailed(res, fields, 'Email and password are required');
  }

  // Attach validated data to request
  req.validatedData = { email: identifier, password };

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
};
