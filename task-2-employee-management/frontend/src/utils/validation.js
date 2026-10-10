// Form validation. These rules mirror backend/models/Employee.js, which is
// the authority: the API re-checks everything that is sent to it.

export const FIELDS = [
  'fullName',
  'employeeId',
  'email',
  'phone',
  'jobTitle',
  'joiningDate',
  'status',
  'department',
  'salary',
];

export const EMPTY_FORM = {
  fullName: '',
  employeeId: '',
  email: '',
  phone: '',
  jobTitle: '',
  joiningDate: '',
  status: 'Active',
  department: '',
  salary: '',
};

export const MAX_SALARY = 100000000;
const EARLIEST_JOINING_DATE = '1970-01-01';

const pad = (number) => String(number).padStart(2, '0');

// The latest joining date allowed: one year from today, as YYYY-MM-DD.
export function latestJoiningDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const clean = (value) => String(value ?? '').trim();

function validateFullName(value) {
  const text = clean(value);
  if (!text) return 'Full name is required.';
  if (text.length < 2 || text.length > 80) return 'Full name must be 2 to 80 characters.';
  if (!/\p{L}/u.test(text)) return 'Full name must contain a letter.';
  return '';
}

function validateEmployeeId(value) {
  const text = clean(value);
  if (!text) return 'Employee ID is required.';
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/.test(text)) return 'Employee ID must be 2 to 20 letters, numbers or hyphens.';
  return '';
}

function validateEmail(value) {
  const text = clean(value);
  if (!text) return 'Email is required.';
  if (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) {
    return 'Enter a valid email address, like name@company.com.';
  }
  return '';
}

function validatePhone(value) {
  const text = clean(value);
  if (!text) return '';
  const digits = text.replace(/\D/g, '').length;
  if (!/^[\d\s+\-().]+$/.test(text) || digits < 7 || digits > 15) return 'Enter a phone number with 7 to 15 digits.';
  return '';
}

function validateJobTitle(value) {
  return clean(value).length > 80 ? 'Job title must be 80 characters or fewer.' : '';
}

function validateJoiningDate(value) {
  if (!value) return '';
  if (value < EARLIEST_JOINING_DATE || value > latestJoiningDate()) {
    return 'Joining date must be between 1970 and one year from today.';
  }
  return '';
}

function validateSalary(value) {
  const text = clean(value);
  if (!text) return '';
  const amount = Number(text);
  if (Number.isNaN(amount)) return 'Salary must be a number.';
  if (amount < 0) return 'Salary cannot be negative.';
  if (amount > MAX_SALARY) return 'Salary must be at most 100,000,000.';
  return '';
}

// Returns { field: message } containing only the invalid fields.
export function validateEmployee(values) {
  const messages = {
    fullName: validateFullName(values.fullName),
    employeeId: validateEmployeeId(values.employeeId),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    jobTitle: validateJobTitle(values.jobTitle),
    joiningDate: validateJoiningDate(values.joiningDate),
    salary: validateSalary(values.salary),
  };
  return Object.fromEntries(Object.entries(messages).filter(([, message]) => message));
}

// Fills the form from an employee returned by the API.
export function toFormValues(employee) {
  return {
    fullName: employee.fullName ?? '',
    employeeId: employee.employeeId ?? '',
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    jobTitle: employee.jobTitle ?? '',
    joiningDate: employee.joiningDate ?? '',
    status: employee.status ?? 'Active',
    department: employee.department ?? '',
    salary: employee.salary === undefined || employee.salary === null ? '' : String(employee.salary),
  };
}

// Converts form values (all text) into the JSON body the API expects.
// Blank optional fields are sent as "", which the API stores as "not set".
export function toPayload(values) {
  const salary = clean(values.salary);
  return {
    fullName: clean(values.fullName),
    employeeId: clean(values.employeeId),
    email: clean(values.email),
    phone: clean(values.phone),
    jobTitle: clean(values.jobTitle),
    joiningDate: values.joiningDate,
    status: values.status,
    department: values.department,
    salary: salary === '' ? '' : Number(salary),
  };
}
