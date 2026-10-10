import { SORT_OPTIONS } from '../constants.js';
import { departmentHue, formatCompact, initials, shortDepartment } from '../utils/format.js';
import { ListSkeleton } from './LoadingState.jsx';

function EmployeeRow({ employee, selected, onSelect }) {
  const subtitle = [employee.jobTitle, employee.department && shortDepartment(employee.department)]
    .filter(Boolean)
    .join(' · ');

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(employee.id);
    }
  };

  return (
    <li
      className="row"
      role="option"
      aria-selected={selected ? 'true' : 'false'}
      tabIndex={0}
      onClick={() => onSelect(employee.id)}
      onKeyDown={onKeyDown}
    >
      <div className="avatar" aria-hidden="true" style={{ '--hue': departmentHue(employee.department) }}>
        {initials(employee.fullName)}
      </div>
      <div className="row__text">
        <span className="row__name">{employee.fullName}</span>
        <span className="row__sub">{subtitle || employee.email}</span>
      </div>
      <div className="row__end">
        <span className="row__salary">{formatCompact(employee.salary)}</span>
        {employee.status === 'Inactive' && <span className="row__status">Inactive</span>}
      </div>
    </li>
  );
}

function Pager({ page, pageCount, onPageChange }) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <div className="pager">
      <button type="button" className="pager__step" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        ← Prev
      </button>
      <div className="pager__pages">
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            className="pager__page"
            aria-current={number === page ? 'page' : undefined}
            aria-label={`Page ${number}`}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
      </div>
      <button type="button" className="pager__step" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
        Next →
      </button>
    </div>
  );
}

// The left-hand column: count, sorting, the employee rows and paging.
export default function EmployeeList({
  status,
  rows,
  matchCount,
  totalCount,
  selectedId,
  sort,
  order,
  page,
  pageCount,
  onSelect,
  onSortChange,
  onOrderToggle,
  onPageChange,
  onClearFilters,
}) {
  const ready = status === 'ready';
  const ascending = order === 'asc';

  return (
    <div className="list">
      <div className="list__bar">
        <span className="list__count" aria-live="polite">
          {ready ? `${matchCount} of ${totalCount} ${totalCount === 1 ? 'person' : 'people'}` : 'Loading…'}
        </span>
        <div className="list__sort">
          <select
            className="list__select"
            aria-label="Sort by"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                Sort by {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="list__order"
            onClick={onOrderToggle}
            aria-label={ascending ? 'Ascending; switch to descending' : 'Descending; switch to ascending'}
          >
            {ascending ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {!ready && <ListSkeleton />}

      {ready && matchCount === 0 && (
        <div className="no-match">
          <span className="no-match__title">No one matches that.</span>
          <span className="no-match__text">Try another name, ID or email, or a different department.</span>
          <button type="button" className="button button--outline button--small" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {ready && matchCount > 0 && (
        <ul className="rows" role="listbox" aria-label="Employees">
          {rows.map((employee) => (
            <EmployeeRow
              key={employee.id}
              employee={employee}
              selected={employee.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}

      {ready && pageCount > 1 && <Pager page={page} pageCount={pageCount} onPageChange={onPageChange} />}
    </div>
  );
}
