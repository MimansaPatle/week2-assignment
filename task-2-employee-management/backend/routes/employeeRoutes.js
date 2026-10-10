// REST routes for employees, mounted at /api/employees in app.js.
const express = require('express');
const {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');
const { requireDatabase, validateObjectId } = require('../middleware/checks');

const router = express.Router();

router.use(requireDatabase);

router.route('/').get(getEmployees).post(createEmployee);

router
  .route('/:id')
  .all(validateObjectId)
  .get(getEmployee)
  .put(updateEmployee)
  .delete(deleteEmployee);

module.exports = router;
