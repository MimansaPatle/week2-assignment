import React, { useState } from 'react';
import { PASSWORD_HINT } from '../content/copy';
import { STRENGTH_LABELS, passwordScore } from '../utils/validation';

const GLYPHS = { error: '!', warn: '!', success: '✓', info: 'i' };

/**
 * Spinner
 * Small rotating ring used inside buttons and on the checking screen.
 */
export const Spinner = ({ large = false }) => (
  <span className={`spinner${large ? ' spinner--large' : ''}`} aria-hidden="true" />
);

/**
 * Banner
 * Message box above a form. Errors and warnings interrupt screen readers;
 * the others are announced politely.
 */
export const Banner = ({ banner }) => {
  const urgent = banner.kind === 'error' || banner.kind === 'warn';

  return (
    <div className={`banner banner--${banner.kind}`} role={urgent ? 'alert' : 'status'}>
      <span className="banner__glyph" aria-hidden="true">
        {GLYPHS[banner.kind]}
      </span>
      <div className="banner__text">
        <div className="banner__title">{banner.title}</div>
        {banner.body && <div className="banner__body">{banner.body}</div>}
      </div>
    </div>
  );
};

/**
 * Field
 * One labelled input with its error message.
 *   password      adds a Show/Hide button
 *   showStrength  adds the strength meter and the password hint
 *   invalid       marks the field red without a message of its own (used
 *                 when the login as a whole was refused)
 */
export const Field = ({
  id,
  label,
  value,
  onChange,
  error = '',
  invalid = false,
  type = 'text',
  password = false,
  showStrength = false,
  placeholder = '',
  autoComplete,
  disabled = false,
  inputRef,
}) => {
  const [revealed, setRevealed] = useState(false);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isInvalid = Boolean(error) || invalid;
  const score = showStrength ? passwordScore(value) : 0;

  let describedBy;
  if (error) describedBy = errorId;
  else if (showStrength) describedBy = hintId;

  return (
    <div className={`field${isInvalid ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      <div className="field__control">
        <input
          ref={inputRef}
          id={id}
          name={id}
          className={`field__input${password ? ' field__input--password' : ''}`}
          type={password ? (revealed ? 'text' : 'password') : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={isInvalid ? 'true' : 'false'}
          aria-describedby={describedBy}
        />
        {password && (
          <button
            type="button"
            className="field__toggle"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed ? 'true' : 'false'}
            aria-controls={id}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {showStrength && (
        <div className={`meter meter--${score}`}>
          <div className="meter__bars" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className={`meter__bar${step <= score ? ' meter__bar--on' : ''}`} />
            ))}
          </div>
          <span className="meter__label">{STRENGTH_LABELS[score]}</span>
        </div>
      )}

      {error && (
        <div className="field__error" id={errorId}>
          <span className="field__error-mark" aria-hidden="true">
            !
          </span>
          <span className="field__error-text">{error}</span>
        </div>
      )}

      {showStrength && !error && (
        <div className="field__hint" id={hintId}>
          {PASSWORD_HINT}
        </div>
      )}
    </div>
  );
};

/**
 * SubmitButton
 * The main form button. It shows one of three states:
 *   ready    the label and an arrow
 *   loading  a spinner and the busy label, not clickable
 *   done     a tick and the done label, not clickable
 */
export const SubmitButton = ({ label, loadingLabel, doneLabel, loading = false, done = false }) => {
  let state = 'ready';
  let text = label;
  let before = null;
  let after = <span aria-hidden="true">→</span>;

  if (done) {
    state = 'done';
    text = doneLabel;
    before = <span aria-hidden="true">✓</span>;
    after = null;
  } else if (loading) {
    state = 'loading';
    text = loadingLabel;
    before = <Spinner />;
    after = null;
  }

  return (
    <button
      type="submit"
      className={`button button--primary button--wide submit submit--${state}`}
      disabled={loading || done}
      aria-busy={loading ? 'true' : 'false'}
    >
      {before}
      <span>{text}</span>
      {after}
    </button>
  );
};
