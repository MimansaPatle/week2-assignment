// Shown when the database has no employees at all.
export default function EmptyState({ onAdd }) {
  return (
    <div className="pane__body notice">
      <span className="eyebrow">Page one</span>
      <h2 className="display">The ledger is empty.</h2>
      <p className="notice__text">Add your first employee to start the directory.</p>
      <button type="button" className="button button--accent" onClick={onAdd}>
        + Add employee
      </button>
    </div>
  );
}
