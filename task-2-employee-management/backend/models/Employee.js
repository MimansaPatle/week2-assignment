// Employee schema: the shape of one employee document and its validation rules.
const mongoose = require('mongoose');

const STATUSES = ['Active', 'Inactive'];
const MAX_SALARY = 100000000;
const EARLIEST_JOINING_DATE = new Date('1970-01-01');

const EMPLOYEE_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^[\d\s+\-().]+$/;

const hasLetter = (value) => /\p{L}/u.test(value);

function isRealisticPhone(value) {
  if (!value) return true;
  const digits = value.replace(/\D/g, '').length;
  return PHONE_PATTERN.test(value) && digits >= 7 && digits <= 15;
}

function isAllowedJoiningDate(value) {
  if (!value) return true;
  const latest = new Date();
  latest.setFullYear(latest.getFullYear() + 1);
  return value >= EARLIEST_JOINING_DATE && value <= latest;
}

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required.'],
      unique: true,
      trim: true,
      // Stored in upper case, so "emp-001" and "EMP-001" count as the same ID.
      uppercase: true,
      match: [EMPLOYEE_ID_PATTERN, 'Employee ID must be 2 to 20 letters, numbers or hyphens.'],
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be 2 to 80 characters.'],
      maxlength: [80, 'Full name must be 2 to 80 characters.'],
      validate: { validator: hasLetter, message: 'Full name must contain a letter.' },
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long.'],
      match: [EMAIL_PATTERN, 'Enter a valid email address, like name@company.com.'],
    },
    phone: {
      type: String,
      trim: true,
      validate: { validator: isRealisticPhone, message: 'Enter a phone number with 7 to 15 digits.' },
    },
    department: {
      type: String,
      trim: true,
      maxlength: [50, 'Department must be 50 characters or fewer.'],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [80, 'Job title must be 80 characters or fewer.'],
    },
    joiningDate: {
      type: Date,
      validate: {
        validator: isAllowedJoiningDate,
        message: 'Joining date must be between 1970 and one year from today.',
      },
    },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative.'],
      max: [MAX_SALARY, 'Salary must be at most 100,000,000.'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be Active or Inactive.' },
      default: 'Active',
    },
  },
  {
    // Adds createdAt and updatedAt.
    timestamps: true,
    // Indexes are built in config/db.js, once the database is connected.
    autoIndex: false,
    toJSON: {
      // The JSON sent to the frontend: "id" instead of "_id", and the joining
      // date as a plain YYYY-MM-DD string.
      transform(document, json) {
        json.id = String(json._id);
        delete json._id;
        delete json.__v;
        json.joiningDate = json.joiningDate ? json.joiningDate.toISOString().slice(0, 10) : null;
        return json;
      },
    },
  },
);

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;
module.exports.STATUSES = STATUSES;
