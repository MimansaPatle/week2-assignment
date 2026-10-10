// Standard departments, in the order they appear in the tabs and the form.
// The API accepts any department name; one that is not listed here still
// gets its own tab when an employee has it.
export const DEPARTMENTS = ['Engineering', 'Finance', 'Human Resources', 'Marketing', 'Operations', 'Sales'];

// Each department has a colour hue, used for its dot, avatar and tag.
export const DEPARTMENT_HUES = {
  Engineering: 265,
  Finance: 160,
  'Human Resources': 350,
  Marketing: 310,
  Operations: 75,
  Sales: 215,
};
export const DEFAULT_HUE = 100;

// Shorter names for tight spaces such as the list rows.
export const DEPARTMENT_SHORT = { 'Human Resources': 'HR' };

export const STATUSES = ['Active', 'Inactive'];

export const SORT_OPTIONS = [
  { key: 'fullName', label: 'name' },
  { key: 'employeeId', label: 'employee ID' },
  { key: 'department', label: 'department' },
  { key: 'jobTitle', label: 'job title' },
  { key: 'salary', label: 'salary' },
  { key: 'joiningDate', label: 'joining date' },
];

export const PAGE_SIZE_DESKTOP = 9;
export const PAGE_SIZE_MOBILE = 6;

// Below this width the list and the detail pane are shown one at a time.
// Keep in step with the media query in styles.css.
export const MOBILE_QUERY = '(max-width: 859.98px)';

export const TOAST_DURATION_MS = 3800;
