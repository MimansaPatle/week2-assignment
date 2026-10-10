import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { Banner, Field, SubmitButton } from '../components/FormParts';
import { BANNERS, BRAND, bannerForError } from '../content/copy';
import { useAuth } from '../context/AuthContext';
import { registrationErrorsFromApi, validateRegistration } from '../utils/validation';

const EMPTY = { email: '', username: '', password: '', confirm: '' };
const FIELD_ORDER = ['email', 'username', 'password', 'confirm'];

// How long the "You're all set" panel stays before the login page opens.
const LOGIN_DELAY_MS = 2200;

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  // The new username, once the account exists.
  const [createdUsername, setCreatedUsername] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const inputs = useRef({});

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    inputs.current.email?.focus();
  }, []);

  // Move the cursor after the form has re-rendered. Doing it straight away
  // would fail when a request has just ended, because the inputs are still
  // disabled at that moment.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus();
  }, [focusRequest]);

  const goToLogin = () => navigate('/login', { state: { banner: 'registered', identifier: createdUsername } });

  // After a successful registration, move on to the login page by itself.
  useEffect(() => {
    if (!createdUsername) return undefined;
    const timer = setTimeout(goToLogin, LOGIN_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdUsername]);

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const showErrors = (found) => {
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) setFocusRequest({ field: first });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    setBanner(null);
    const found = validateRegistration(values);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const user = await register(values.username.trim(), values.email.trim(), values.password, values.confirm);
      setCreatedUsername(user.username);
    } catch (error) {
      setLoading(false);
      // 400 (invalid data) and 409 (duplicate account) carry field messages.
      const fieldErrors = registrationErrorsFromApi(error.fields || {}, error.status);
      if (Object.keys(fieldErrors).length > 0) showErrors(fieldErrors);
      else setBanner(bannerForError(error, BANNERS.regServer));
    }
  };

  const fieldProps = (field) => ({
    id: field,
    value: values[field],
    onChange: (value) => setValue(field, value),
    error: errors[field],
    disabled: loading,
    inputRef: (element) => {
      inputs.current[field] = element;
    },
  });

  if (createdUsername) {
    return (
      <AuthShell
        eyebrow="Account created"
        title="You're all set"
        switchPrompt="Already have an account?"
        switchLabel="Log in"
        switchTo="/login"
      >
        <div className="success" role="status">
          <span className="check check--large" aria-hidden="true">
            ✓
          </span>
          <p className="success__text">
            Welcome to {BRAND}, <strong>{createdUsername}</strong>. Taking you to log in…
          </p>
          <div className="success__track">
            <div className="success__fill" style={{ animationDuration: `${LOGIN_DELAY_MS}ms` }} />
          </div>
          <button type="button" className="button button--ghost button--wide" onClick={goToLogin}>
            Go to log in
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Register"
      title="Create your account"
      lead="It takes a minute. You can log in straight after."
      note="Your password is hashed before it is saved"
      switchPrompt="Already have an account?"
      switchLabel="Log in"
      switchTo="/login"
    >
      {banner && <Banner banner={banner} />}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <Field {...fieldProps('email')} label="Email" type="email" autoComplete="email" placeholder="you@example.com" />
        <Field {...fieldProps('username')} label="Username" autoComplete="username" placeholder="dana_ruiz" />
        <Field {...fieldProps('password')} label="Password" password showStrength autoComplete="new-password" />
        <Field {...fieldProps('confirm')} label="Confirm password" password autoComplete="new-password" />
        <SubmitButton label="Create account" loadingLabel="Creating account…" loading={loading} />
      </form>
    </AuthShell>
  );
};

export default Register;
