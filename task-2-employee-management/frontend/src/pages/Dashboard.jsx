import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DepartmentTabs from '../components/DepartmentTabs.jsx';
import EmployeeDetail from '../components/EmployeeDetail.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import EmployeeList from '../components/EmployeeList.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import Header from '../components/Header.jsx';
import { PaneSkeleton } from '../components/LoadingState.jsx';
import StatsBar from '../components/StatsBar.jsx';
import ToastList from '../components/ToastList.jsx';
import { DEPARTMENTS, MOBILE_QUERY, PAGE_SIZE_DESKTOP, PAGE_SIZE_MOBILE } from '../constants.js';
import useMediaQuery from '../hooks/useMediaQuery.js';
import { createEmployee, deleteEmployee, getEmployees, updateEmployee } from '../services/employeeApi.js';

const compareText = new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare;

const isBlank = (value) => value === undefined || value === null || value === '';

// Compares two employees by one field. Employees without a value for that
// field always go last, whichever direction is chosen.
function compareBy(field, direction) {
  return (a, b) => {
    const [x, y] = [a[field], b[field]];
    if (isBlank(x) || isBlank(y)) return isBlank(x) - isBlank(y) || compareText(a.fullName, b.fullName);
    const result = field === 'salary' ? x - y : compareText(x, y);
    return (result || compareText(a.fullName, b.fullName)) * direction;
  };
}

export default function Dashboard() {
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // Every employee, as returned by the API. Search, department filter,
  // sorting and paging are applied to this list in the browser, because the
  // summary and the department counts need the full set anyway.
  const [employees, setEmployees] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [sort, setSort] = useState('fullName');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState('view'); // view | add | edit
  // On a phone the list and the pane are shown one at a time.
  const [paneOpen, setPaneOpen] = useState(false);

  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  // READ: load the list on start, on "Try again", and when a record turns
  // out to have been deleted elsewhere.
  useEffect(() => {
    const controller = new AbortController();

    getEmployees(controller.signal)
      .then((data) => {
        setEmployees(data);
        setLoadError('');
        setStatus('ready');
      })
      .catch((error) => {
        // An aborted request was replaced by a newer one; ignore it.
        if (error.name === 'AbortError') return;
        setLoadError(error.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  const retry = () => {
    setStatus('loading');
    reload();
  };

  const ready = status === 'ready';

  // Standard departments first, then any others found in the data.
  const departments = useMemo(() => {
    const extra = [...new Set(employees.map((employee) => employee.department).filter(Boolean))]
      .filter((name) => !DEPARTMENTS.includes(name))
      .sort(compareText);
    return [...DEPARTMENTS, ...extra];
  }, [employees]);

  const tabs = useMemo(() => {
    const counts = {};
    employees.forEach((employee) => {
      if (employee.department) counts[employee.department] = (counts[employee.department] || 0) + 1;
    });
    return [
      { key: '', label: 'Everyone', count: ready ? employees.length : '' },
      ...departments.map((name) => ({ key: name, label: name, count: ready ? counts[name] || 0 : '' })),
    ];
  }, [employees, departments, ready]);

  // SEARCH, FILTER and SORT
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees
      .filter(
        (employee) =>
          (!department || employee.department === department) &&
          (!term ||
            [employee.fullName, employee.employeeId, employee.email].some((value) => value.toLowerCase().includes(term))),
      )
      .sort(compareBy(sort, order === 'asc' ? 1 : -1));
  }, [employees, search, department, sort, order]);

  const pageSize = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP;
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = matches.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // The employee in the pane. With nothing chosen yet, the first one listed.
  const selected = employees.find((employee) => employee.id === selectedId) || matches[0] || employees[0] || null;

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeDepartment = (value) => {
    setDepartment(value);
    setPage(1);
  };

  const changeSort = (field) => {
    setSort(field);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setPage(1);
  };

  const selectEmployee = (id) => {
    setSelectedId(id);
    setMode('view');
    setPaneOpen(true);
  };

  // Adding needs the list to have loaded (for example to know the departments).
  const openAdd = () => {
    if (status === 'ready') setMode('add');
  };

  const closeForm = useCallback(() => {
    // After cancelling an edit the employee stays open; after cancelling an
    // add, a phone goes back to the list.
    if (mode === 'add') setPaneOpen(false);
    setMode('view');
  }, [mode]);

  const backToList = () => {
    setPaneOpen(false);
    setMode('view');
  };

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = (message, kind = 'success') => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, message, kind }]);
  };

  // A 404 means the record was deleted somewhere else. Close what is open,
  // say so, and reload the list so the stale row disappears. Any other
  // error is passed on to the form or dialog that is waiting for it.
  const handleMissing = (error) => {
    if (error.status !== 404) throw error;
    setMode('view');
    setSelectedId(null);
    setPaneOpen(false);
    showToast('That employee no longer exists. The list has been refreshed.', 'warning');
    reload();
    return null;
  };

  // CREATE and UPDATE (called by the form with validated data)
  const handleSave = async (payload) => {
    if (mode === 'edit') {
      const updated = await updateEmployee(selected.id, payload).catch(handleMissing);
      if (!updated) return;
      setEmployees((current) => current.map((employee) => (employee.id === updated.id ? updated : employee)));
      showToast('Employee updated successfully.');
    } else {
      const created = await createEmployee(payload);
      setEmployees((current) => [...current, created]);
      setSelectedId(created.id);
      setPaneOpen(true);
      showToast('Employee added successfully.');
    }
    setMode('view');
  };

  // DELETE (called only after the confirmation)
  const handleDelete = async (employee) => {
    const deleted = await deleteEmployee(employee.id).catch(handleMissing);
    if (!deleted) return;
    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    setSelectedId(null);
    setPaneOpen(false);
    showToast('Employee deleted successfully.');
  };

  // What to show. On a wide screen the list and the pane sit side by side.
  const isError = status === 'error';
  const isEmpty = ready && employees.length === 0;
  const isForm = ready && mode !== 'view';
  const isDetail = ready && mode === 'view' && Boolean(selected);
  const showPane = !isMobile || isError || isEmpty || isForm || (paneOpen && isDetail);
  const showList = !isError && !isEmpty && (!isMobile || !showPane);

  return (
    <div className="app">
      <Header search={search} onSearchChange={changeSearch} onAdd={openAdd} />
      <StatsBar employees={employees} ready={ready} />
      <DepartmentTabs items={tabs} selected={department} onSelect={changeDepartment} />

      <main className={`body${showList && showPane ? ' body--split' : ''}`}>
        {showList && (
          <EmployeeList
            status={status}
            rows={rows}
            matchCount={matches.length}
            totalCount={employees.length}
            selectedId={!isMobile && selected ? selected.id : null}
            sort={sort}
            order={order}
            page={currentPage}
            pageCount={pageCount}
            onSelect={selectEmployee}
            onSortChange={changeSort}
            onOrderToggle={() => setOrder((current) => (current === 'asc' ? 'desc' : 'asc'))}
            onPageChange={setPage}
            onClearFilters={clearFilters}
          />
        )}

        {showPane && (
          <section className="pane" aria-label="Employee details">
            {isError && <ErrorMessage message={loadError} onRetry={retry} />}
            {isEmpty && !isForm && <EmptyState onAdd={openAdd} />}
            {status === 'loading' && <PaneSkeleton />}

            {isMobile && (isDetail || mode === 'edit') && ready && (
              <button type="button" className="pane__back" onClick={backToList}>
                ← All employees
              </button>
            )}

            {isDetail && (
              <EmployeeDetail
                key={selected.id}
                employee={selected}
                onEdit={() => setMode('edit')}
                onDelete={handleDelete}
              />
            )}

            {isForm && (
              <EmployeeForm
                key={mode === 'edit' ? selected.id : 'new'}
                employee={mode === 'edit' ? selected : null}
                departments={departments}
                defaultDepartment={department}
                onSave={handleSave}
                onCancel={closeForm}
              />
            )}
          </section>
        )}
      </main>

      <ToastList toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
