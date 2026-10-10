import EmployeeSearch from './EmployeeSearch.jsx';

export default function Header({ search, onSearchChange, onAdd }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand__name">Ledger</span>
        <span className="eyebrow">People</span>
      </div>
      <EmployeeSearch value={search} onChange={onSearchChange} />
      <button type="button" className="button button--accent header__add" onClick={onAdd}>
        + Add employee
      </button>
    </header>
  );
}
