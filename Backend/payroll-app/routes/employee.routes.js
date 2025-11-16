// routes/employee.routes.js
const express = require('express');
const router = express.Router();
const {
  viewMyPayslips,
  downloadPayslip,
  viewMyAttendance,
  downloadMyAttendance, // Import new controller
} = require('../controllers/employee.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validator.middleware');

// All routes here are for 'employee' role only
router.use(protect);
router.use(authorize('employee'));

// @route   GET /api/employee/payslips
router.get(
  '/payslips',
  [query('year').optional().isInt({ min: 2000 }).withMessage('Year must be valid')],
  handleValidationErrors,
  viewMyPayslips
);

// @route   GET /api/employee/payslips/:id/download
router.get(
  '/payslips/:id/download',
  [param('id').isMongoId().withMessage('Invalid Payslip ID')],
  handleValidationErrors,
  downloadPayslip
);

// @route   GET /api/employee/attendance
router.get(
  '/attendance',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  viewMyAttendance
);

// @route   GET /api/employee/attendance/download  <-- NEW ROUTE
router.get(
  '/attendance/download',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  downloadMyAttendance
);

module.exports = router;