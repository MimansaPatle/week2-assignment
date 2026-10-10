import { DEFAULT_HUE, DEPARTMENT_HUES, DEPARTMENT_SHORT } from '../constants.js';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const longDate = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

const MS_PER_MONTH = 2.63e9;

export const MISSING = '—';

const hasNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// 1850000 -> "₹18,50,000"
export const formatSalary = (amount) => (hasNumber(amount) ? rupees.format(amount) : MISSING);

// Short form used in the list and the summary: "₹18.5L", "₹1.25Cr".
export function formatCompact(amount) {
  if (!hasNumber(amount)) return MISSING;
  if (amount >= 1e7) return `₹${(amount / 1e7).toFixed(2)}Cr`;
  if (amount >= 1e5) return `₹${(amount / 1e5).toFixed(1)}L`;
  return rupees.format(amount);
}

// "2021-03-15" -> a Date at local midnight.
const toDate = (isoDate) => new Date(`${isoDate}T00:00:00`);

// "2021-03-15" -> "15 March 2021"
export const formatDate = (isoDate) => (isoDate ? longDate.format(toDate(isoDate)) : MISSING);

// How long someone has been employed: "2 yrs 3 mo", "5 months", "Not started".
export function formatTenure(isoDate) {
  if (!isoDate) return MISSING;
  const months = Math.floor((Date.now() - toDate(isoDate)) / MS_PER_MONTH);
  if (months < 0) return 'Not started';
  if (months < 1) return 'This month';
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return `${years} ${years === 1 ? 'yr' : 'yrs'}${rest ? ` ${rest} mo` : ''}`;
}

// "Aarav Mehta" -> "AM"
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const departmentHue = (department) => DEPARTMENT_HUES[department] ?? DEFAULT_HUE;

export const shortDepartment = (department) => DEPARTMENT_SHORT[department] || department;
