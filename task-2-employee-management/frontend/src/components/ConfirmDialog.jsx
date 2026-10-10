import { useEffect, useRef } from 'react';

// Inline confirmation before a destructive action. The safe choice has the
// focus when it opens, and Escape cancels.
export default function ConfirmDialog({
  title,
  text,
  confirmLabel,
  busyLabel,
  cancelLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}) {
  const cancelButton = useRef(null);

  useEffect(() => {
    cancelButton.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="confirm" role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-text">
      <div className="confirm__text">
        <span className="confirm__title" id="confirm-title">
          {title}
        </span>
        <span id="confirm-text">{text}</span>
      </div>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}
      <div className="actions">
        <button type="button" className="button button--danger button--small" onClick={onConfirm} disabled={busy}>
          {busy ? busyLabel : confirmLabel}
        </button>
        <button
          ref={cancelButton}
          type="button"
          className="button button--outline button--small"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
