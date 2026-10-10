// API tests. They start the real Express app and use a real MongoDB database
// that is separate from the app's own (and is deleted afterwards).
//   npm test
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const createApp = require('../app');
const { connectDB } = require('../config/db');
const Employee = require('../models/Employee');

const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/employee_management_mern_test';
const MISSING_ID = '507f1f77bcf86cd799439011';

let server;
let baseUrl;

const VALID = {
  employeeId: 'EMP-1001',
  fullName: 'Dana Ruiz',
  email: 'dana.ruiz@example.com',
  phone: '+91 98765 43210',
  department: 'Engineering',
  jobTitle: 'Software Developer',
  joiningDate: '2024-03-15',
  salary: 900000,
  status: 'Active',
};

async function api(method, path, body, { raw, headers } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Left as null; the assertions will show the problem.
  }
  return { status: response.status, json, text, headers: response.headers };
}

const create = (overrides = {}) => api('POST', '/api/employees', { ...VALID, ...overrides });

before(async () => {
  await connectDB(TEST_URI);
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  await Employee.deleteMany({});
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 1) await connectDB(TEST_URI);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ---------------------------------------------------------------- health

test('health endpoint reports the API and the database', async () => {
  const { status, json } = await api('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(json.success, true);
  assert.equal(json.status, 'ok');
  assert.equal(json.database, 'connected');
});

// ---------------------------------------------------------------- create

test('creates an employee and stores it in MongoDB', async () => {
  const { status, json } = await create();
  assert.equal(status, 201);
  assert.equal(json.success, true);
  assert.equal(json.message, 'Employee added successfully.');
  assert.match(json.data.id, /^[0-9a-f]{24}$/);
  assert.equal(json.data._id, undefined);
  assert.equal(json.data.__v, undefined);
  assert.equal(json.data.joiningDate, '2024-03-15');
  assert.ok(json.data.createdAt && json.data.updatedAt);

  const stored = await Employee.findById(json.data.id).lean();
  assert.equal(stored.fullName, 'Dana Ruiz');
  assert.equal(stored.salary, 900000);
  assert.ok(stored.joiningDate instanceof Date);
});

test('only the three required fields are needed; status defaults to Active', async () => {
  const { status, json } = await api('POST', '/api/employees', {
    employeeId: 'EMP-2',
    fullName: 'Sam Lee',
    email: 'sam@example.com',
  });
  assert.equal(status, 201);
  assert.equal(json.data.status, 'Active');
  assert.equal(json.data.joiningDate, null);
  assert.equal(json.data.salary, undefined);
});

test('normalises the employee ID to upper case, the email to lower case, and trims text', async () => {
  const { json } = await create({ employeeId: '  emp-77 ', email: '  Dana.Ruiz@Example.COM ', fullName: '  Dana Ruiz  ' });
  assert.equal(json.data.employeeId, 'EMP-77');
  assert.equal(json.data.email, 'dana.ruiz@example.com');
  assert.equal(json.data.fullName, 'Dana Ruiz');
});

test('blank optional fields are stored as missing, not as empty text', async () => {
  const { status, json } = await create({ phone: '', department: '  ', jobTitle: null, joiningDate: '', salary: '' });
  assert.equal(status, 201);
  const stored = await Employee.findById(json.data.id).lean();
  for (const field of ['phone', 'department', 'jobTitle', 'joiningDate', 'salary']) {
    assert.equal(stored[field], undefined, field);
  }
});

test('accepts a salary of 0 and a salary sent as numeric text', async () => {
  assert.equal((await create({ salary: 0 })).json.data.salary, 0);
  assert.equal((await create({ employeeId: 'EMP-3', salary: '750000' })).json.data.salary, 750000);
});

test('ignores fields the client is not allowed to set', async () => {
  const { status, json } = await create({ _id: MISSING_ID, role: 'admin', createdAt: '2000-01-01T00:00:00Z' });
  assert.equal(status, 201);
  assert.notEqual(json.data.id, MISSING_ID);
  assert.equal(json.data.role, undefined);
  assert.notEqual(json.data.createdAt.slice(0, 4), '2000');
});

// ---------------------------------------------------------------- validation

test('rejects an empty body with an error for each required field', async () => {
  const { status, json } = await api('POST', '/api/employees', {});
  assert.equal(status, 400);
  assert.equal(json.success, false);
  assert.deepEqual(Object.keys(json.errors).sort(), ['email', 'employeeId', 'fullName']);
  assert.equal(json.errors.fullName, 'Full name is required.');
  assert.equal(json.errors.employeeId, 'Employee ID is required.');
  assert.equal(json.errors.email, 'Email is required.');
  assert.equal(await Employee.countDocuments(), 0);
});

test('rejects an empty or blank name', async () => {
  for (const fullName of ['', '   ']) {
    const { status, json } = await create({ fullName });
    assert.equal(status, 400);
    assert.equal(json.errors.fullName, 'Full name is required.');
  }
});

test('rejects a name that is too short or has no letters', async () => {
  assert.equal((await create({ fullName: 'A' })).json.errors.fullName, 'Full name must be 2 to 80 characters.');
  assert.equal((await create({ fullName: '12345' })).json.errors.fullName, 'Full name must contain a letter.');
});

test('rejects a missing or malformed employee ID', async () => {
  assert.equal((await create({ employeeId: '' })).json.errors.employeeId, 'Employee ID is required.');
  for (const employeeId of ['A', 'EMP 001', 'EMP#1', 'X'.repeat(21)]) {
    const { status, json } = await create({ employeeId });
    assert.equal(status, 400, employeeId);
    assert.match(json.errors.employeeId, /2 to 20 letters, numbers or hyphens/);
  }
});

test('rejects an invalid email', async () => {
  for (const email of ['dana', 'dana@', 'dana@example', '@example.com', 'da na@example.com']) {
    const { status, json } = await create({ email });
    assert.equal(status, 400, email);
    assert.match(json.errors.email, /valid email/);
  }
});

test('rejects a negative salary, a salary that is too large and one that is not a number', async () => {
  assert.equal((await create({ salary: -1 })).json.errors.salary, 'Salary cannot be negative.');
  assert.equal((await create({ salary: 100000001 })).json.errors.salary, 'Salary must be at most 100,000,000.');
  const notNumber = await create({ salary: 'lots' });
  assert.equal(notNumber.status, 400);
  assert.equal(notNumber.json.errors.salary, 'Salary must be a number.');
});

test('rejects an impossible or out-of-range joining date', async () => {
  for (const joiningDate of ['not-a-date', '2024-02-30', '2024-13-01', '15/03/2024', 20240315]) {
    const { status, json } = await create({ joiningDate });
    assert.equal(status, 400, String(joiningDate));
    assert.equal(json.errors.joiningDate, 'Enter a valid date in YYYY-MM-DD format.');
  }
  for (const joiningDate of ['1969-12-31', '2999-01-01']) {
    const { status, json } = await create({ joiningDate });
    assert.equal(status, 400, joiningDate);
    assert.match(json.errors.joiningDate, /between 1970 and one year from today/);
  }
});

test('rejects an unknown status and an unrealistic phone number', async () => {
  assert.equal((await create({ status: 'Retired' })).json.errors.status, 'Status must be Active or Inactive.');
  for (const phone of ['12345', 'call me', '1'.repeat(16)]) {
    const { status, json } = await create({ phone });
    assert.equal(status, 400, phone);
    assert.match(json.errors.phone, /7 to 15 digits/);
  }
});

test('rejects query-operator objects sent in place of text', async () => {
  const { status, json } = await create({ fullName: { $ne: '' }, email: { $gt: '' } });
  assert.equal(status, 400);
  assert.ok(json.errors.fullName && json.errors.email);
  assert.equal(await Employee.countDocuments(), 0);
});

test('rejects invalid JSON and a body that is not an object', async () => {
  const broken = await api('POST', '/api/employees', undefined, { raw: '{"fullName": ' });
  assert.equal(broken.status, 400);
  assert.equal(broken.json.message, 'Request body is not valid JSON.');

  const array = await api('POST', '/api/employees', [VALID]);
  assert.equal(array.status, 400);
  assert.equal(array.json.message, 'Request body must be a JSON object.');

  const noBody = await api('POST', '/api/employees');
  assert.equal(noBody.status, 400);
  assert.equal(noBody.json.message, 'Request body must be a JSON object.');
});

// ---------------------------------------------------------------- duplicates

test('rejects a duplicate employee ID with 409, whatever its letter case', async () => {
  await create();
  for (const employeeId of ['EMP-1001', 'emp-1001', ' Emp-1001 ']) {
    const { status, json } = await create({ employeeId, email: 'other@example.com' });
    assert.equal(status, 409, employeeId);
    assert.equal(json.success, false);
    assert.equal(json.errors.employeeId, 'An employee with this Employee ID already exists.');
  }
  assert.equal(await Employee.countDocuments(), 1);
});

test('MongoDB itself enforces the unique employee ID', async () => {
  const indexes = await Employee.collection.indexes();
  const index = indexes.find((item) => item.key.employeeId === 1);
  assert.equal(index.unique, true);
});

// ---------------------------------------------------------------- read

test('lists employees from the database, sorted by name', async () => {
  await create({ employeeId: 'E-3', fullName: 'zara Khan' });
  await create({ employeeId: 'E-1', fullName: 'Aarav Mehta' });
  await create({ employeeId: 'E-2', fullName: 'Meera Joshi' });

  const { status, json } = await api('GET', '/api/employees');
  assert.equal(status, 200);
  assert.equal(json.count, 3);
  assert.deepEqual(json.data.map((employee) => employee.fullName), ['Aarav Mehta', 'Meera Joshi', 'zara Khan']);
});

test('returns an empty list when there are no employees', async () => {
  const { status, json } = await api('GET', '/api/employees');
  assert.equal(status, 200);
  assert.deepEqual(json, { success: true, count: 0, data: [] });
});

test('searches by name, employee ID or email, ignoring case', async () => {
  await create({ employeeId: 'ENG-01', fullName: 'Aarav Mehta', email: 'aarav@example.com' });
  await create({ employeeId: 'FIN-07', fullName: 'Rohan Desai', email: 'r.desai@ledger.example' });

  const names = async (search) =>
    (await api('GET', `/api/employees?search=${encodeURIComponent(search)}`)).json.data.map((employee) => employee.fullName);

  assert.deepEqual(await names('aarav'), ['Aarav Mehta']);
  assert.deepEqual(await names('fin-07'), ['Rohan Desai']);
  assert.deepEqual(await names('LEDGER.example'), ['Rohan Desai']);
  assert.deepEqual(await names('nobody'), []);
  // Special characters are matched literally, not as a regular expression.
  assert.deepEqual(await names('.*'), []);
});

test('filters by department and by status', async () => {
  await create({ employeeId: 'E-1', department: 'Engineering', status: 'Active' });
  await create({ employeeId: 'E-2', department: 'Finance', status: 'Inactive' });
  await create({ employeeId: 'E-3', department: 'Finance', status: 'Active' });

  const ids = async (query) => (await api('GET', `/api/employees?${query}`)).json.data.map((employee) => employee.employeeId).sort();
  assert.deepEqual(await ids('department=Finance'), ['E-2', 'E-3']);
  assert.deepEqual(await ids('status=Inactive'), ['E-2']);
  assert.deepEqual(await ids('department=Finance&status=Active'), ['E-3']);
  // A query parameter sent as an object or array is ignored instead of being used as a filter.
  assert.equal((await ids('department[$ne]=Finance')).length, 3);
});

test('fetches one employee by id', async () => {
  const created = (await create()).json.data;
  const { status, json } = await api('GET', `/api/employees/${created.id}`);
  assert.equal(status, 200);
  assert.deepEqual(json.data, created);
});

test('answers 404 for an employee that does not exist and 400 for a malformed id', async () => {
  const missing = await api('GET', `/api/employees/${MISSING_ID}`);
  assert.equal(missing.status, 404);
  assert.equal(missing.json.message, 'Employee not found.');

  const malformed = await api('GET', '/api/employees/not-an-id');
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.message, 'Invalid employee id.');
});

// ---------------------------------------------------------------- update

test('updates an employee and the change persists', async () => {
  const created = (await create()).json.data;
  const { status, json } = await api('PUT', `/api/employees/${created.id}`, {
    ...VALID,
    fullName: 'Dana R. Ruiz',
    jobTitle: 'Senior Developer',
    salary: 1200000,
    status: 'Inactive',
  });
  assert.equal(status, 200);
  assert.equal(json.message, 'Employee updated successfully.');
  assert.equal(json.data.id, created.id);

  const stored = await Employee.findById(created.id).lean();
  assert.equal(stored.fullName, 'Dana R. Ruiz');
  assert.equal(stored.jobTitle, 'Senior Developer');
  assert.equal(stored.salary, 1200000);
  assert.equal(stored.status, 'Inactive');
  assert.equal(await Employee.countDocuments(), 1);
});

test('an update can clear optional fields and keeps the ones it does not mention', async () => {
  const created = (await create()).json.data;
  const { status, json } = await api('PUT', `/api/employees/${created.id}`, { phone: '', salary: null, status: '' });
  assert.equal(status, 200);
  assert.equal(json.data.phone, undefined);
  assert.equal(json.data.salary, undefined);
  assert.equal(json.data.status, 'Active');
  assert.equal(json.data.fullName, 'Dana Ruiz');
  assert.equal(json.data.department, 'Engineering');
});

test('an update is validated like a new employee and leaves the record unchanged when invalid', async () => {
  const created = (await create()).json.data;
  const { status, json } = await api('PUT', `/api/employees/${created.id}`, { ...VALID, fullName: '', email: 'nope', salary: -5 });
  assert.equal(status, 400);
  assert.deepEqual(Object.keys(json.errors).sort(), ['email', 'fullName', 'salary']);

  const stored = await Employee.findById(created.id).lean();
  assert.equal(stored.fullName, 'Dana Ruiz');
  assert.equal(stored.email, 'dana.ruiz@example.com');
});

test('an update cannot take an employee ID that another employee has, but may keep its own', async () => {
  await create({ employeeId: 'EMP-1' });
  const second = (await create({ employeeId: 'EMP-2' })).json.data;

  const taken = await api('PUT', `/api/employees/${second.id}`, { ...VALID, employeeId: 'emp-1' });
  assert.equal(taken.status, 409);
  assert.equal(taken.json.errors.employeeId, 'An employee with this Employee ID already exists.');
  assert.equal((await Employee.findById(second.id).lean()).employeeId, 'EMP-2');

  const own = await api('PUT', `/api/employees/${second.id}`, { ...VALID, employeeId: 'EMP-2', fullName: 'Renamed Person' });
  assert.equal(own.status, 200);
});

test('updating a missing employee answers 404, a malformed id 400', async () => {
  const missing = await api('PUT', `/api/employees/${MISSING_ID}`, VALID);
  assert.equal(missing.status, 404);
  assert.equal(missing.json.message, 'Employee not found.');
  assert.equal(await Employee.countDocuments(), 0);

  assert.equal((await api('PUT', '/api/employees/123', VALID)).status, 400);
});

// ---------------------------------------------------------------- delete

test('deletes an employee from the database', async () => {
  const created = (await create()).json.data;
  const { status, json } = await api('DELETE', `/api/employees/${created.id}`);
  assert.equal(status, 200);
  assert.deepEqual(json, { success: true, message: 'Employee deleted successfully.', data: { id: created.id } });
  assert.equal(await Employee.countDocuments(), 0);
  assert.equal((await api('GET', `/api/employees/${created.id}`)).status, 404);
});

test('deleting a missing employee answers 404, a malformed id 400', async () => {
  const missing = await api('DELETE', `/api/employees/${MISSING_ID}`);
  assert.equal(missing.status, 404);
  assert.equal(missing.json.message, 'Employee not found.');
  assert.equal((await api('DELETE', '/api/employees/xyz')).status, 400);
});

// ---------------------------------------------------------------- other responses

test('unknown routes and unsupported methods answer 404 as JSON', async () => {
  const unknown = await api('GET', '/api/nothing-here');
  assert.equal(unknown.status, 404);
  assert.equal(unknown.json.success, false);

  const patch = await api('PATCH', `/api/employees/${MISSING_ID}`, {});
  assert.equal(patch.status, 404);
  assert.equal(patch.json.success, false);
});

test('error responses never contain a stack trace', async () => {
  const responses = [
    await api('POST', '/api/employees', undefined, { raw: '{oops' }),
    await api('GET', '/api/employees/not-an-id'),
    await create({ salary: 'x' }),
  ];
  for (const { text } of responses) {
    assert.doesNotMatch(text, /node_modules|\.js:\d+|at \w+ \(/);
  }
});

test('CORS allows the configured frontend and no other site', async () => {
  const allowed = await api('GET', '/api/health', undefined, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

  const other = await api('GET', '/api/health', undefined, { headers: { Origin: 'http://evil.example' } });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

// ---------------------------------------------------------------- database down
// Kept last: it disconnects from MongoDB on purpose.

test('answers 503 while the database is unavailable, and health says so', async () => {
  await mongoose.disconnect();
  try {
    for (const [method, path, body] of [
      ['GET', '/api/employees'],
      ['POST', '/api/employees', VALID],
      ['PUT', `/api/employees/${MISSING_ID}`, VALID],
      ['DELETE', `/api/employees/${MISSING_ID}`],
    ]) {
      const { status, json } = await api(method, path, body);
      assert.equal(status, 503, `${method} ${path}`);
      assert.equal(json.message, 'The database is unavailable. Please try again shortly.');
    }
    const health = await api('GET', '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.json.database, 'disconnected');
  } finally {
    await connectDB(TEST_URI);
  }
  assert.equal((await api('GET', '/api/employees')).status, 200);
});
