// Optional sample data for trying the app out.
//   npm run seed              add the samples if the collection is empty
//   npm run seed -- --reset   delete every employee first, then add the samples
require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Employee = require('./models/Employee');

const SAMPLES = [
  ['Aarav Mehta', 'Engineering', 'Senior Software Engineer', 1850000, '2021-03-15', 'Active'],
  ['Priya Nair', 'Human Resources', 'HR Business Partner', 1120000, '2020-08-01', 'Active'],
  ['Rohan Desai', 'Finance', 'Financial Analyst', 960000, '2023-01-09', 'Active'],
  ['Ananya Iyer', 'Marketing', 'Content Strategist', 840000, '2022-06-20', 'Active'],
  ['Kabir Singh', 'Sales', 'Account Executive', 1010000, '2024-02-12', 'Active'],
  ['Meera Joshi', 'Engineering', 'QA Engineer', 780000, '2023-09-04', 'Inactive'],
  ['Vikram Rao', 'Operations', 'Operations Manager', 1430000, '2019-11-18', 'Active'],
  ['Isha Kapoor', 'Engineering', 'Frontend Developer', 1240000, '2022-10-03', 'Active'],
  ['Dev Patel', 'Finance', 'Accounts Payable Specialist', 620000, '2025-04-21', 'Active'],
  ['Sana Sheikh', 'Marketing', 'Growth Marketer', 990000, '2024-07-08', 'Active'],
  ['Arjun Pillai', 'Sales', 'Sales Development Rep', 540000, '2025-12-01', 'Inactive'],
  ['Neha Kulkarni', 'Operations', 'Logistics Coordinator', 680000, '2026-06-12', 'Active'],
].map(([fullName, department, jobTitle, salary, joiningDate, status], index) => ({
  employeeId: `EMP-${String(index + 1).padStart(4, '0')}`,
  fullName,
  email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@ledger.example`,
  phone: `+91 98765 4${String(3201 + index)}`,
  department,
  jobTitle,
  joiningDate,
  salary,
  status,
}));

async function seed() {
  const reset = process.argv.includes('--reset');
  await connectDB();

  if (reset) {
    const { deletedCount } = await Employee.deleteMany({});
    console.log(`Removed ${deletedCount} existing employees.`);
  } else if ((await Employee.countDocuments()) > 0) {
    console.log('The employees collection already has data. Use "npm run seed -- --reset" to replace it.');
    return;
  }

  // create() runs the same validation as the API.
  await Employee.create(SAMPLES);
  console.log(`Added ${SAMPLES.length} sample employees.`);
}

seed()
  .catch((error) => {
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
