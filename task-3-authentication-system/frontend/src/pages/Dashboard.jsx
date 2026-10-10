import React, { useEffect, useMemo, useState } from 'react';
import { BrandMark } from '../components/AuthShell';
import { Spinner } from '../components/FormParts';
import { BRAND, SESSION_PROTECTIONS } from '../content/copy';
import { useAuth } from '../context/AuthContext';
import {
  firstName,
  formatClock,
  formatCountdown,
  formatMemberSince,
  formatUserId,
  initials,
  isToday,
  readTokenTimes,
} from '../utils/format';

// The warning appears for the last five minutes of a session.
const WARNING_SECONDS = 5 * 60;

const secondsUntil = (time) => Math.ceil((time - Date.now()) / 1000);

/**
 * Dashboard
 * The protected page. It is only rendered by ProtectedRoute, after the
 * server has confirmed the token.
 */
const Dashboard = () => {
  const { user, token, logout, expireSession } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // When this login started and when it ends, read from the token.
  const times = useMemo(() => readTokenTimes(token), [token]);
  const totalSeconds = times ? Math.round((times.expiresAt - times.issuedAt) / 1000) : 0;
  const [remaining, setRemaining] = useState(() => (times ? secondsUntil(times.expiresAt) : 0));

  useEffect(() => {
    document.title = `Dashboard - ${BRAND}`;
    return () => {
      document.title = `${BRAND} - Secure Authentication`;
    };
  }, []);

  // Count down to the end of the session. The end time is compared with the
  // clock on every tick, so the display stays right even if the browser
  // slows timers in a background tab.
  useEffect(() => {
    if (!times) return undefined;

    const tick = () => {
      const secondsLeft = secondsUntil(times.expiresAt);
      if (secondsLeft <= 0) {
        // The server stops accepting the token at the same moment.
        expireSession();
      } else {
        setRemaining(secondsLeft);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [times, expireSession]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    // Clearing the session makes ProtectedRoute send the user to the login page.
    await logout();
  };

  const totalMinutes = Math.round(totalSeconds / 60);
  const expiring = Boolean(times) && remaining <= WARNING_SECONDS;
  const countdown = times ? formatCountdown(remaining) : '—';
  const leftPercent = totalSeconds ? Math.max(0, Math.min(100, (remaining / totalSeconds) * 100)) : 0;

  let sessionState = 'active';
  let sessionLabel = 'Active';
  if (loggingOut) {
    sessionState = 'ending';
    sessionLabel = 'Ending';
  } else if (expiring) {
    sessionState = 'warning';
    sessionLabel = 'Ending soon';
  }

  const userInitials = initials(user.username);
  const greeting = `${isToday(user.createdAt) ? 'Welcome' : 'Hi'}, ${firstName(user.username)}`;

  const sessionRows = [
    { label: 'Logged in at', value: times ? formatClock(new Date(times.issuedAt)) : '—' },
    { label: 'Ends at', value: times ? formatClock(new Date(times.expiresAt)) : '—' },
    { label: 'Session length', value: times ? `${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'}` : '—' },
  ];

  const accountRows = [
    { label: 'Username', value: user.username },
    { label: 'User ID', value: formatUserId(user.id) },
    { label: 'Member since', value: formatMemberSince(user.createdAt) },
  ];

  return (
    <div className="page">
      <header className="topbar">
        <BrandMark />
        <div className="topbar__user">
          <span className="user-chip">
            <span className="avatar" aria-hidden="true">
              {userInitials}
            </span>
            <span className="user-chip__name">{user.username}</span>
          </span>
          <button
            type="button"
            className="button button--ghost logout"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut ? 'true' : 'false'}
          >
            {loggingOut && <Spinner />}
            <span>{loggingOut ? 'Logging out…' : 'Log out'}</span>
          </button>
        </div>
      </header>

      <main className={`dash${loggingOut ? ' dash--leaving' : ''}`} aria-busy={loggingOut ? 'true' : 'false'}>
        <div className="dash__head">
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1 className="dash__title">{greeting}</h1>
          </div>
          <span className="pill" role="status">
            <span className="dot" aria-hidden="true" />
            Logged in · members only
          </span>
        </div>

        {expiring && (
          <div className="banner banner--warn" role="alert">
            <span className="banner__glyph" aria-hidden="true">
              !
            </span>
            <div className="banner__text">
              <div className="banner__title">Your session ends in {countdown}</div>
              <div className="banner__body">Save anything you need. You'll have to log in again after that.</div>
            </div>
          </div>
        )}

        <div className="grid">
          <section className={`card card--session${expiring ? ' card--expiring' : ''}`} aria-labelledby="session-heading">
            <div className="card__head">
              <h2 className="card__title" id="session-heading">
                Session ends in
              </h2>
              <span className={`pill state state--${sessionState}`}>
                <span className="dot" aria-hidden="true" />
                {sessionLabel}
              </span>
            </div>
            <span className="countdown__value">{countdown}</span>
            <div
              className="countdown__track"
              role="progressbar"
              aria-label="Session time left"
              aria-valuemin={0}
              aria-valuemax={totalMinutes}
              aria-valuenow={Math.max(0, Math.ceil(remaining / 60))}
            >
              <div className="countdown__fill" style={{ width: `${leftPercent.toFixed(2)}%` }} />
            </div>
            <dl className="rows">
              {sessionRows.map((row) => (
                <div key={row.label} className="row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card" aria-labelledby="account-heading">
            <div className="card__head">
              <h2 className="card__title" id="account-heading">
                Your account
              </h2>
            </div>
            <div className="identity">
              <span className="avatar avatar--large" aria-hidden="true">
                {userInitials}
              </span>
              <div className="identity__text">
                <span className="identity__name">{user.username}</span>
                <span className="identity__email">{user.email}</span>
              </div>
            </div>
            <dl className="rows">
              {accountRows.map((row) => (
                <div key={row.label} className="row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card card--wide" aria-labelledby="protection-heading">
            <div className="card__head">
              <h2 className="card__title" id="protection-heading">
                How this session is protected
              </h2>
            </div>
            <ul className="tiles">
              {SESSION_PROTECTIONS.map((item) => (
                <li key={item.label} className="tile">
                  <span className="check" aria-hidden="true">
                    ✓
                  </span>
                  <span>{item.label}</span>
                  <span className="tile__meta">{item.meta}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
