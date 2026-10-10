// Shown in place of the directory when the employee list cannot be loaded.
export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="pane__body notice" role="alert">
      <span className="eyebrow eyebrow--danger">Connection lost</span>
      <h2 className="display">The server isn't answering.</h2>
      <p className="notice__text">
        We couldn't load the employee list. Nothing has been lost. Check that the API and database are running, then
        try again.
      </p>
      {message && <p className="notice__detail">{message}</p>}
      <button type="button" className="button button--ink" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
