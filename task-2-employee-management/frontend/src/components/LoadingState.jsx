const ROWS = [0, 1, 2, 3, 4, 5, 6];

// Placeholder rows shown while the employee list is being fetched.
export function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading employees">
      {ROWS.map((row) => (
        <div key={row} className="skeleton-row" style={{ animationDelay: `${row * 0.1}s` }}>
          <div className="skeleton-row__avatar" />
          <div className="skeleton-row__lines">
            <div className="skeleton-row__line" />
            <div className="skeleton-row__line skeleton-row__line--short" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Placeholder for the detail pane.
export function PaneSkeleton() {
  return (
    <div className="pane__body pane-skeleton" aria-hidden="true">
      <div className="pane-skeleton__tag" />
      <div className="pane-skeleton__title" />
      <div className="pane-skeleton__line" />
    </div>
  );
}
