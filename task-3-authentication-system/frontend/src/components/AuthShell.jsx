import React from 'react';
import { Link } from 'react-router-dom';
import { BRAND, PROTECTIONS } from '../content/copy';

export const BrandMark = () => (
  <div className="brand">
    <span className="brand__name">{BRAND}</span>
    <span className="brand__tag">Accounts</span>
  </div>
);

/**
 * AuthShell Component
 * Shared frame for the Register and Log in pages: the top bar, a wide
 * headline band, and under it the form on the left and the list of how an
 * account is protected on the right.
 *
 *   eyebrow        small label above the title
 *   title, lead    the headline and the sentence under it
 *   note           one line under the form
 *   switchPrompt,
 *   switchLabel,
 *   switchTo       the link to the other page, shown in the top bar
 */
const AuthShell = ({ eyebrow, title, lead, note, switchPrompt, switchLabel, switchTo, children }) => {
  return (
    <div className="page">
      <header className="topbar">
        <BrandMark />
        <p className="topbar__switch">
          <span className="topbar__prompt">{switchPrompt} </span>
          <Link to={switchTo} className="topbar__link">
            {switchLabel}
          </Link>
        </p>
      </header>

      <div className="auth">
        <header className="auth__head">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="auth__title">{title}</h1>
          {lead && <p className="auth__lead">{lead}</p>}
        </header>

        <main className="auth__form">
          <div className="auth__column">
            {children}

            {note && (
              <p className="auth__note">
                <span className="dot" aria-hidden="true" />
                {note}
              </p>
            )}
          </div>
        </main>

        <aside className="auth__panel" aria-label="Account security">
          <div className="facts">
            <span className="eyebrow">How your account is protected</span>
            <p className="facts__title">Your password is never stored in a form anyone can read.</p>
            <ul className="facts__list">
              {PROTECTIONS.map((item) => (
                <li key={item.label} className="fact">
                  <span className="check" aria-hidden="true">
                    ✓
                  </span>
                  <span>{item.label}</span>
                  <span className="fact__meta">{item.meta}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AuthShell;
