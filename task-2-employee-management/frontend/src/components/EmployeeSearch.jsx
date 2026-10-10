// Search box in the header. Filtering itself happens in Dashboard.
export default function EmployeeSearch({ value, onChange }) {
  return (
    <label className="search">
      <span className="search__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        className="search__input"
        aria-label="Search employees"
        placeholder="Find by name, ID or email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button type="button" className="search__clear" onClick={() => onChange('')} aria-label="Clear search">
          clear
        </button>
      )}
    </label>
  );
}
