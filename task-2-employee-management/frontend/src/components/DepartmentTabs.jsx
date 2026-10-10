import { departmentHue } from '../utils/format.js';

// Department filter. `items` is [{ key, label, count }]; the key "" means everyone.
export default function DepartmentTabs({ items, selected, onSelect }) {
  return (
    <nav className="tabs" aria-label="Departments">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="tab"
          aria-pressed={selected === item.key ? 'true' : 'false'}
          onClick={() => onSelect(item.key)}
        >
          <span
            className={`dot${item.key ? '' : ' dot--ink'}`}
            style={item.key ? { '--hue': departmentHue(item.key) } : undefined}
          />
          {item.label}
          <span className="tab__count">{item.count}</span>
        </button>
      ))}
    </nav>
  );
}
