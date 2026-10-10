// Request handlers for employees. Each one reads the request, uses the
// Employee model and answers with JSON. Errors thrown here (or by Mongoose)
// are passed by Express to middleware/errorHandler.js.
const Employee = require('../models/Employee');
const { HttpError } = require('../middleware/errorHandler');

// The only fields a client may set. Anything else in the body is ignored.
const EDITABLE_FIELDS = [
  'employeeId',
  'fullName',
  'email',
  'phone',
  'department',
  'jobTitle',
  'joiningDate',
  'salary',
  'status',
];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Makes sorting by name ignore upper and lower case.
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Query-string values can arrive as arrays; only plain text is used.
const queryText = (value) => (typeof value === 'string' ? value.trim() : '');

// A joining date must be a real calendar date written as YYYY-MM-DD.
// Anything else becomes NaN, which Mongoose reports as an invalid date.
function parseJoiningDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value.trim())) return NaN;
  const date = new Date(`${value.trim()}T00:00:00.000Z`);
  const isSameDay = !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value.trim();
  return isSameDay ? date : NaN;
}

// Copies the editable fields out of the request body.
function pickFields(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  const fields = {};
  for (const field of EDITABLE_FIELDS) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    const isBlank = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');

    if (isBlank) {
      // A blank status keeps the current one; other blank fields are cleared
      // (required fields then fail validation with "... is required").
      if (field !== 'status') fields[field] = undefined;
    } else if (field === 'joiningDate') {
      fields[field] = parseJoiningDate(value);
    } else {
      fields[field] = value;
    }
  }
  return fields;
}

async function findEmployeeOr404(id) {
  const employee = await Employee.findById(id);
  if (!employee) throw new HttpError(404, 'Employee not found.');
  return employee;
}

// GET /api/employees?search=&department=&status=
async function getEmployees(req, res) {
  const search = queryText(req.query.search);
  const department = queryText(req.query.department);
  const status = queryText(req.query.status);

  const filter = {};
  if (search) {
    // Escaped so the text is matched literally, not as a regular expression.
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ fullName: pattern }, { employeeId: pattern }, { email: pattern }];
  }
  if (department) filter.department = department;
  if (status) filter.status = status;

  const employees = await Employee.find(filter).sort({ fullName: 1, _id: 1 }).collation(CASE_INSENSITIVE);
  res.status(200).json({ success: true, count: employees.length, data: employees });
}

// GET /api/employees/:id
async function getEmployee(req, res) {
  const employee = await findEmployeeOr404(req.params.id);
  res.status(200).json({ success: true, data: employee });
}

// POST /api/employees
async function createEmployee(req, res) {
  const employee = await Employee.create(pickFields(req.body));
  res.status(201).json({ success: true, message: 'Employee added successfully.', data: employee });
}

// PUT /api/employees/:id
async function updateEmployee(req, res) {
  const fields = pickFields(req.body);
  const employee = await findEmployeeOr404(req.params.id);
  employee.set(fields);
  // save() runs the schema validation again on the changed document.
  await employee.save();
  res.status(200).json({ success: true, message: 'Employee updated successfully.', data: employee });
}

// DELETE /api/employees/:id
async function deleteEmployee(req, res) {
  const employee = await Employee.findByIdAndDelete(req.params.id);
  if (!employee) throw new HttpError(404, 'Employee not found.');
  res.status(200).json({ success: true, message: 'Employee deleted successfully.', data: { id: req.params.id } });
}

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
