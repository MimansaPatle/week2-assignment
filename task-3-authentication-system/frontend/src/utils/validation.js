// Form validation. These rules mirror backend/middleware/validateRequest.js,
// which is the authority: the API re-checks everything that is sent to it.
import { MSG } from '../content/copy';

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,30}$/;
const PASSWORD_MAX_BYTES = 72;

/**
 * Password strength from 0 to 4, shown by the meter.
 * One point each for: 8+ characters, both upper and lower case, a digit,
 * a symbol. Shorter than 8 characters is always 1.
 */
export const passwordScore = (password) => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return password.length < 8 ? 1 : Math.max(score, 1);
};

/**
 * The server's rule: 8+ characters with an uppercase letter, a lowercase
 * letter and a number.
 */
const meetsPasswordRule = (password) =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

/**
 * Each validator returns { field: message } containing only the invalid fields.
 */
export const validateRegistration = ({ email, username, password, confirm }) => {
  const errors = {};

  if (!email.trim()) errors.email = MSG.emailEmpty;
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = MSG.emailBad;

  if (!username.trim()) errors.username = MSG.userEmpty;
  else if (!USERNAME_PATTERN.test(username.trim())) errors.username = MSG.userBad;

  if (!password) errors.password = MSG.pwEmpty;
  else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) errors.password = MSG.pwLong;
  else if (!meetsPasswordRule(password)) errors.password = MSG.pwWeak;

  if (!confirm) errors.confirm = MSG.confirmEmpty;
  else if (confirm !== password) errors.confirm = MSG.mismatch;

  return errors;
};

export const validateLogin = ({ identifier, password }) => {
  const errors = {};
  if (!identifier.trim()) errors.identifier = MSG.idEmpty;
  if (!password) errors.password = MSG.loginPwEmpty;
  return errors;
};

/**
 * Turn the field messages returned by the API into this app's wording and
 * field names (the API calls the confirmation "confirmPassword").
 */
export const registrationErrorsFromApi = (fields = {}, status) => {
  const errors = {};
  if (fields.email) errors.email = status === 409 ? MSG.dupEmail : fields.email;
  if (fields.username) errors.username = status === 409 ? MSG.dupUser : fields.username;
  if (fields.password) errors.password = fields.password;
  if (fields.confirmPassword) errors.confirm = fields.confirmPassword;
  return errors;
};
