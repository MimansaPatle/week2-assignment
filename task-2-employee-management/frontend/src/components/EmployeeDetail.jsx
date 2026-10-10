import { useCallback, useState } from 'react';
import { MISSING, departmentHue, formatDate, formatSalary, formatTenure } from '../utils/format.js';
import ConfirmDialog from './ConfirmDialog.jsx';

// The right-hand pane for one employee, with the Edit and Delete actions.
// `onDelete` returns a promise; if it fails, the message is shown here.
export default function EmployeeDetail({ employee, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const cancelDelete = useCallback(() => {
    setConfirming(false);
    setError('');
  }, []);

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setError('');
    try {
      // On success this component is removed, so there is no state to reset.
      await onDelete(employee);
    } catch (failure) {
      setDeleting(false);
      setError(failure.message);
    }
  };

  const hasSalary = typeof employee.salary === 'number';
  const facts = [
    { label: 'Email', value: employee.email },
    { label: 'Phone', value: employee.phone || MISSING },
    { label: 'Annual salary', value: formatSalary(employee.salary), mono: true },
    { label: 'Monthly', value: hasSalary ? formatSalary(Math.round(employee.salary / 12)) : MISSING, mono: true },
    { label: 'Joined', value: formatDate(employee.joiningDate) },
    { label: 'Tenure', value: formatTenure(employee.joiningDate) },
  ];

  return (
    <article className="pane__body detail">
      <div className="detail__head">
        <div className="detail__tags">
          {employee.department && (
            <span className="tag" style={{ '--hue': departmentHue(employee.department) }}>
              <span className="dot" />
              {employee.department}
            </span>
          )}
          <span className={`status status--${employee.status === 'Inactive' ? 'inactive' : 'active'}`}>
            {employee.status}
          </span>
          <span className="detail__code">{employee.employeeId}</span>
        </div>
        <h2 className="display detail__name">{employee.fullName}</h2>
        <span className="detail__role">{employee.jobTitle || 'No job title'}</span>
      </div>

      <dl className="facts">
        {facts.map((fact) => (
          <div key={fact.label} className="fact">
            <dt className="eyebrow">{fact.label}</dt>
            <dd className={`fact__value${fact.mono ? ' fact__value--mono' : ''}`}>{fact.value}</dd>
          </div>
        ))}
      </dl>

      {confirming ? (
        <ConfirmDialog
          title={`Delete ${employee.fullName}?`}
          text="Are you sure? This record will be removed permanently."
          confirmLabel="Yes, delete"
          busyLabel="Deleting…"
          cancelLabel="Keep employee"
          busy={deleting}
          error={error}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      ) : (
        <div className="actions">
          <button type="button" className="button button--ink" onClick={onEdit}>
            Edit details
          </button>
          <button type="button" className="button button--danger-outline" onClick={() => setConfirming(true)}>
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
