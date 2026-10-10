import { useEffect, useRef, useState } from 'react';
import { STATUSES } from '../constants.js';
import { departmentHue, formatCompact, formatSalary } from '../utils/format.js';
import {
  EMPTY_FORM,
  FIELDS,
  latestJoiningDate,
  toFormValues,
  toPayload,
  validateEmployee,
} from '../utils/validation.js';

// Add and Edit form. Pass `employee` to edit an existing record, or leave it
// out to add a new one. `onSave` receives the API payload and returns a
// promise; if the API rejects the data, its messages are shown on the fields.
export default function EmployeeForm({ employee = null, departments, defaultDepartment = '', onSave, onCancel }) {
  const isEditing = Boolean(employee);

  const [values, setValues] = useState(() =>
    employee ? toFormValues(employee) : { ...EMPTY_FORM, department: defaultDepartment },
  );
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [focusRequest, setFocusRequest] = useState(null);
  const inputs = useRef({});

  // Escape closes the form, unless a save is in progress.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [saving, onCancel]);

  // Move the cursor after the form has re-rendered. Doing it straight away
  // would fail when a save has just ended, because the inputs are still
  // disabled at that moment.
  useEffect(() => {
    if (focusRequest) inputs.current[focusRequest.field]?.focus();
  }, [focusRequest]);

  // A field shows its message once it has been visited or a save was tried.
  // Messages from the API stay until that field is changed.
  const found = validateEmployee(values);
  const errors = {};
  FIELDS.forEach((field) => {
    if (found[field] && (submitted || touched[field])) errors[field] = found[field];
    else if (serverErrors[field]) errors[field] = serverErrors[field];
  });
  const errorCount = Object.keys(errors).length;

  const setValue = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const markTouched = (field) => setTouched((current) => ({ ...current, [field]: true }));

  const focusFirst = (fieldErrors) => {
    const first = FIELDS.find((field) => fieldErrors[field]);
    if (first) setFocusRequest({ field: first });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;

    setSubmitted(true);
    setFormError('');
    if (Object.keys(found).length > 0) {
      focusFirst(found);
      return;
    }

    setSaving(true);
    try {
      // On success the parent closes this form.
      await onSave(toPayload(values));
    } catch (error) {
      setSaving(false);
      const fieldErrors = error.fieldErrors || {};
      setServerErrors(fieldErrors);
      // Problems that belong to no field (server down, record deleted) go above the form.
      if (!FIELDS.some((field) => fieldErrors[field])) setFormError(error.message);
      focusFirst(fieldErrors);
    }
  };

  const inputProps = (field) => ({
    id: `field-${field}`,
    name: field,
    value: values[field],
    onChange: (event) => setValue(field, event.target.value),
    onBlur: () => markTouched(field),
    disabled: saving,
    'aria-invalid': errors[field] ? 'true' : 'false',
    'aria-describedby': errors[field] ? `error-${field}` : undefined,
    ref: (element) => {
      inputs.current[field] = element;
    },
  });

  const fieldError = (field) =>
    errors[field] && (
      <span className="field__error" id={`error-${field}`}>
        {errors[field]}
      </span>
    );

  const fieldClass = (field, extra = '') => `field${extra}${errors[field] ? ' field--invalid' : ''}`;

  const salary = Number(values.salary);
  const showSalaryPreview = String(values.salary).trim() !== '' && salary > 0 && !errors.salary;

  let alert = '';
  if (formError) alert = formError;
  else if (errorCount > 0 && (submitted || Object.keys(serverErrors).length > 0)) {
    alert = `${errorCount} ${errorCount === 1 ? 'field needs' : 'fields need'} attention.`;
  }

  return (
    <form className="pane__body form" onSubmit={handleSubmit} noValidate aria-labelledby="form-title">
      <div className="form__head">
        <span className="eyebrow eyebrow--accent">{isEditing ? 'Editing record' : 'New record'}</span>
        <h2 className="display display--form" id="form-title">
          {isEditing ? employee.fullName : 'Add an employee'}
        </h2>
      </div>

      {alert && (
        <div className="alert" role="alert">
          {alert}
        </div>
      )}

      <div className="form__grid">
        <label className={fieldClass('fullName', ' field--wide')}>
          <span className="field__label">Full name</span>
          <input className="field__input field__input--name" placeholder="Mimansa Patle" autoFocus {...inputProps('fullName')} />
          {fieldError('fullName')}
        </label>

        <label className={fieldClass('employeeId')}>
          <span className="field__label">Employee ID</span>
          <input className="field__input field__input--mono" placeholder="EMP-0013" autoCapitalize="characters" {...inputProps('employeeId')} />
          {fieldError('employeeId')}
        </label>

        <label className={fieldClass('email')}>
          <span className="field__label">Email</span>
          <input className="field__input" type="email" placeholder="name@company.com" autoComplete="off" {...inputProps('email')} />
          {fieldError('email')}
        </label>

        <label className={fieldClass('phone')}>
          <span className="field__label">
            Phone <span className="field__optional">optional</span>
          </span>
          <input className="field__input" type="tel" inputMode="tel" placeholder="+91 98765 43210" autoComplete="off" {...inputProps('phone')} />
          {fieldError('phone')}
        </label>

        <label className={fieldClass('jobTitle')}>
          <span className="field__label">
            Job title <span className="field__optional">optional</span>
          </span>
          <input className="field__input" placeholder="Software Developer" {...inputProps('jobTitle')} />
          {fieldError('jobTitle')}
        </label>

        <label className={fieldClass('joiningDate')}>
          <span className="field__label">
            Joining date <span className="field__optional">optional</span>
          </span>
          <input className="field__input" type="date" min="1970-01-01" max={latestJoiningDate()} {...inputProps('joiningDate')} />
          {fieldError('joiningDate')}
        </label>

        <div className="field">
          <span className="field__label" id="status-label">
            Status
          </span>
          <div className="choices choices--two" role="radiogroup" aria-labelledby="status-label">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                className="choice"
                aria-checked={values.status === status ? 'true' : 'false'}
                onClick={() => setValue('status', status)}
                disabled={saving}
              >
                <span className={`dot dot--${status.toLowerCase()}`} />
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="field field--wide">
          <span className="field__label" id="department-label">
            Department <span className="field__optional">optional</span>
          </span>
          <div className="choices" role="radiogroup" aria-labelledby="department-label">
            {departments.map((department) => {
              const checked = values.department === department;
              return (
                <button
                  key={department}
                  type="button"
                  role="radio"
                  className="choice"
                  aria-checked={checked ? 'true' : 'false'}
                  // Choosing the selected department again clears it.
                  onClick={() => setValue('department', checked ? '' : department)}
                  disabled={saving}
                >
                  <span className="dot" style={{ '--hue': departmentHue(department) }} />
                  {department}
                </button>
              );
            })}
          </div>
        </div>

        <label className={fieldClass('salary', ' field--wide')}>
          <span className="field__label">
            Annual salary, INR <span className="field__optional">optional</span>
          </span>
          <span className="salary">
            <span className="salary__sign">₹</span>
            <input className="salary__input" type="number" inputMode="numeric" min="0" placeholder="60000" {...inputProps('salary')} />
          </span>
          {showSalaryPreview && (
            <span className="field__hint">
              {formatCompact(salary)} a year · {formatSalary(Math.round(salary / 12))} a month
            </span>
          )}
          {fieldError('salary')}
        </label>
      </div>

      <div className="actions form__actions">
        <button type="submit" className="button button--accent button--large" disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add employee'}
        </button>
        <button type="button" className="button button--outline button--large" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
