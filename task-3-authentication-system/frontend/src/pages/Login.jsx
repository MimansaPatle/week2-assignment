import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Banner, Field, SubmitButton } from '../components/FormParts';
import { BANNERS, bannerForError } from '../content/copy';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../utils/validation';

// How long the green "Logged in" state stays before the dashboard opens.
const DASHBOARD_DELAY_MS = 900;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, startSession, isAuthenticated, notice, setNotice } = useAuth();

  // Other pages send the user here with a reason (for example after
  // registering) and, after registering, the new username.
  const arrival = useRef(location.state || {}).current;

  const [values, setValues] = useState({ identifier: arrival.identifier || '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  // Set once the form has been submitted, so the arrival message goes away.
  const [submitted, setSubmitted] = useState(false);
  const [credentialsRejected, setCredentialsRejected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focusRequest, setFocusRequest] = useState(null);
  const identifierInput = useRef(null);
  const passwordInput = useRef(null);

  // Already logged in (or just logged in): go to the dashboard.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Forget the arrival details so they are not shown again after a refresh.
    if (location.state) navigate(location.pathname, { replace: true, state: null });
    // Start in the first field that still needs filling in.
    (arrival.identifier ? passwordInput : identifierInput).current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the cursor after the form has re-rendered. Doing it straight away
  // would fail when a request has just ended, because the inputs are still
  // disabled at that moment.
  useEffect(() => {
    if (focusRequest) (focusRequest.field === 'identifier' ? identifierInput : passwordInput).current?.focus();
  }, [focusRequest]);

  // The message to show before anything has been submitted.
  let arrivalBanner = null;
  if (arrival.banner === 'registered') arrivalBanner = BANNERS.registered;
  else if (notice) arrivalBanner = BANNERS[notice];
  else if (arrival.from === 'protected') arrivalBanner = BANNERS.required;

  const shownBanner = banner || (submitted ? null : arrivalBanner);

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setCredentialsRejected(false);
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const showErrors = (found) => {
    setErrors(found);
    setFocusRequest({ field: found.identifier ? 'identifier' : 'password' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || done) return;

    setSubmitted(true);
    setNotice(null);
    setBanner(null);
    setCredentialsRejected(false);

    const found = validateLogin(values);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const session = await login(values.identifier.trim(), values.password);
      setLoading(false);
      setDone(true);
      setBanner(BANNERS.loginSuccess);
      // Show the confirmation briefly, then open the session. The effect
      // above moves to the dashboard as soon as it is open.
      setTimeout(() => startSession(session), DASHBOARD_DELAY_MS);
    } catch (error) {
      setLoading(false);
      if (error.status === 401) {
        // Wrong password or unknown account: the same message for both.
        setBanner(BANNERS.credentials);
        setCredentialsRejected(true);
        setValues((current) => ({ ...current, password: '' }));
        setFocusRequest({ field: 'password' });
      } else if (error.status === 400 && error.fields) {
        // The API calls the first field "email" even when it holds a username.
        const fieldErrors = {};
        if (error.fields.email) fieldErrors.identifier = error.fields.email;
        if (error.fields.password) fieldErrors.password = error.fields.password;
        showErrors(fieldErrors);
      } else {
        setBanner(bannerForError(error, BANNERS.loginServer));
      }
    }
  };

  return (
    <AuthShell
      eyebrow="Log in"
      title="Welcome back"
      lead="Use your email or username to open your dashboard."
      note="Sessions are signed and expire automatically"
      switchPrompt="New here?"
      switchLabel="Create an account"
      switchTo="/register"
    >
      {shownBanner && <Banner banner={shownBanner} />}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field
          id="identifier"
          label="Email or username"
          value={values.identifier}
          onChange={(value) => setValue('identifier', value)}
          error={errors.identifier}
          invalid={credentialsRejected}
          autoComplete="username"
          placeholder="you@example.com"
          disabled={loading}
          inputRef={identifierInput}
        />
        <Field
          id="password"
          label="Password"
          value={values.password}
          onChange={(value) => setValue('password', value)}
          error={errors.password}
          invalid={credentialsRejected}
          password
          autoComplete="current-password"
          disabled={loading}
          inputRef={passwordInput}
        />
        <SubmitButton label="Log in" loadingLabel="Logging in…" doneLabel="Logged in" loading={loading} done={done} />
      </form>
    </AuthShell>
  );
};

export default Login;
