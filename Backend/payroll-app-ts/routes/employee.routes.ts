// routes/employee.routes.ts
import { Router } from 'express';
import {
  viewMyPayslips,
  downloadPayslip,
  viewMyAttendance,
  downloadMyAttendance,
} from '../controllers/employee.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { query, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validator.middleware';

const router = Router();

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
// @desc    Get payslip details with attendance summary and salary breakdown (JSON for frontend PDF generation)
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

// @route   GET /api/employee/attendance/download
router.get(
  '/attendance/download',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  downloadMyAttendance
);

export default router;