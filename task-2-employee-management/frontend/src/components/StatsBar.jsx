import { MISSING, formatCompact } from '../utils/format.js';

// Summary figures, worked out from the employees the API returned.
export default function StatsBar({ employees, ready }) {
  const salaries = employees.map((employee) => employee.salary).filter((salary) => typeof salary === 'number');
  const payroll = salaries.reduce((sum, salary) => sum + salary, 0);
  const active = employees.filter((employee) => employee.status === 'Active').length;

  const stats = [
    { label: 'Headcount', value: String(employees.length) },
    { label: 'Active', value: String(active) },
    { label: 'Annual payroll', value: formatCompact(payroll) },
    { label: 'Average salary', value: salaries.length ? formatCompact(Math.round(payroll / salaries.length)) : MISSING },
  ];

  return (
    <section className="stats" aria-label="Summary">
      {stats.map((stat) => (
        <div key={stat.label} className="stat">
          <span className="eyebrow">{stat.label}</span>
          <span className="stat__value">{ready ? stat.value : MISSING}</span>
        </div>
      ))}
    </section>
  );
}
