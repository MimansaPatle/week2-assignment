import { useEffect } from 'react';
import { TOAST_DURATION_MS } from '../constants.js';

function Toast({ toast, onDismiss }) {
  // Each message removes itself after a few seconds.
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast--${toast.kind}`} role="status">
      <span className="toast__tick" aria-hidden="true">
        {toast.kind === 'warning' ? '!' : '✓'}
      </span>
      <span className="toast__text">{toast.message}</span>
      <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

// Short messages in the corner of the screen.
export default function ToastList({ toasts, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
