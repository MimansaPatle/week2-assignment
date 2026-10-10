// All the fixed text of the app in one place.

export const BRAND = 'Nexus';

export const PASSWORD_HINT = 'At least 8 characters, with uppercase, lowercase and a number.';

// What the app does to protect an account. Each line describes something the
// backend really does (see "Security Decisions" in the README).
//   label  what happens, in plain words
//   meta   the technique, shown small beside it
export const PROTECTIONS = [
  { label: 'Passwords are hashed', meta: 'bcrypt' },
  { label: 'Every request is verified', meta: 'signed JWT' },
  { label: 'Logging out cancels the token', meta: 'revoked' },
  { label: 'Too many wrong passwords are blocked', meta: 'rate limit' },
];

// The same idea for the dashboard, about the session that is open now.
export const SESSION_PROTECTIONS = [
  { label: 'Password stored as a hash', meta: 'bcrypt' },
  { label: 'Token checked on every request', meta: 'signed JWT' },
  { label: 'Token cancelled at log out', meta: 'revoked' },
  { label: 'Only you can see this page', meta: 'protected route' },
];

// Messages shown under a form field.
export const MSG = {
  emailEmpty: 'Enter your email.',
  emailBad: "That email doesn't look right. Check for typos.",
  userEmpty: 'Choose a username.',
  userBad: 'Use 3–30 letters, numbers, underscores or hyphens.',
  pwEmpty: 'Create a password.',
  pwWeak: `Too weak. ${PASSWORD_HINT}`,
  pwLong: 'Use 72 characters or fewer.',
  confirmEmpty: 'Type your password again.',
  mismatch: "Passwords don't match.",
  dupEmail: 'This email already has an account. Try logging in.',
  dupUser: 'That username is taken.',
  idEmpty: 'Enter your email or username.',
  loginPwEmpty: 'Enter your password.',
};

// Banners shown above the forms. `kind` sets the colour and the icon:
// error, success, warn or info.
export const BANNERS = {
  credentials: { kind: 'error', title: 'Wrong email, username or password', body: '' },
  regServer: {
    kind: 'error',
    title: "We couldn't create your account",
    body: 'Something went wrong on our end. Please try again.',
  },
  loginServer: {
    kind: 'error',
    title: "We couldn't log you in",
    body: 'Something went wrong on our end. Please try again.',
  },
  unreachable: {
    kind: 'error',
    title: "We couldn't reach the server",
    body: 'Check that the backend is running, then try again.',
  },
  tooMany: {
    kind: 'error',
    title: 'Too many attempts',
    body: 'Please try again in a few minutes.',
  },
  loginSuccess: { kind: 'success', title: 'Logged in. Opening your dashboard…', body: '' },
  registered: { kind: 'success', title: 'Account created', body: 'Log in to get started.' },
  loggedOut: { kind: 'info', title: "You're logged out", body: '' },
  expired: { kind: 'warn', title: 'Your session expired', body: 'Log in again to continue.' },
  required: {
    kind: 'info',
    title: 'Please log in first',
    body: 'You need an account to see the dashboard.',
  },
};

// Picks the banner for a failed request that has no field messages.
export const bannerForError = (error, fallback) => {
  if (error.status === 0) return BANNERS.unreachable;
  if (error.status === 429) return BANNERS.tooMany;
  return fallback;
};
