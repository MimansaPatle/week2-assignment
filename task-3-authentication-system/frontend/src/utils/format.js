const pad = (number) => String(number).padStart(2, '0');

const longDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Seconds as "MM:SS", e.g. 812 -> "13:32".
export const formatCountdown = (seconds) => {
  const safe = Math.max(0, seconds);
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
};

// A Date as "HH:MM" in the visitor's own time zone.
export const formatClock = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const isToday = (isoString) => new Date(isoString).toDateString() === new Date().toDateString();

// "Today" or "12 March 2026".
export const formatMemberSince = (isoString) => (isToday(isoString) ? 'Today' : longDate.format(new Date(isoString)));

// First part of a username, capitalised: "dana_ruiz" -> "Dana".
export const firstName = (username) => {
  const first = username.split(/[._-]/).find(Boolean) || username;
  return first.charAt(0).toUpperCase() + first.slice(1);
};

// "dana_ruiz" -> "DR", "sam" -> "SA".
export const initials = (username) => {
  const parts = username.split(/[._-]/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : username.slice(0, 2);
  return letters.toUpperCase();
};

// Short display form of the database id: "NX-7F3A-92C1".
export const formatUserId = (id) => {
  const tail = id.slice(-8).toUpperCase();
  return `NX-${tail.slice(0, 4)}-${tail.slice(4)}`;
};

/**
 * Read the issue and expiry times out of a JWT.
 * The middle part of a token is plain base64 text that anyone can read; only
 * the server can check that it is genuine. It is used here just to show the
 * countdown, never to decide whether the user is logged in.
 */
export const readTokenTimes = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null;
    return { issuedAt: payload.iat * 1000, expiresAt: payload.exp * 1000 };
  } catch (error) {
    return null;
  }
};
