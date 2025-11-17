// routes/employee.routes.ts
import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  viewMyPayslips,
  downloadPayslip,
  viewMyAttendance,
  downloadMyAttendance,
  getMyDailyAttendance,
  markMyAttendance,
  updateMyDailyAttendance,
  deleteMyDailyAttendance,
  downloadMyDailyAttendance,
} from '../controllers/employee.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { query, param, body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validator.middleware';

const router = Router();

// All routes here are for 'employee' role only
router.use(protect);
router.use(authorize('employee'));

// ==========================================================
// --- PROFILE ROUTES ---
// ==========================================================

// @route   GET /api/employee/profile
// @desc    Get my profile with salary breakdown
router.get('/profile', getMyProfile);

// @route   PUT /api/employee/profile
// @desc    Update my profile (employee-editable fields only)
router.put(
  '/profile',
  [
    body('personalEmail').optional().isEmail().withMessage('Must be valid email'),
    body('phone').optional().isString(),
    body('address').optional().isObject(),
    body('bankDetails').optional().isObject(),
    body('dob').optional().isISO8601().withMessage('Must be valid date'),
  ],
  handleValidationErrors,
  updateMyProfile
);

// ==========================================================
// --- PAYSLIP ROUTES ---
// ==========================================================

// @route   GET /api/employee/payslips
// @desc    View all my payslips (filter by year)
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

// ==========================================================
// --- MONTHLY ATTENDANCE ROUTES (Legacy) ---
// ==========================================================

// @route   GET /api/employee/attendance
// @desc    View my monthly attendance records
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
// @desc    Download my monthly attendance as CSV
router.get(
  '/attendance/download',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  downloadMyAttendance
);

// ==========================================================
// --- DAILY ATTENDANCE ROUTES (Employee Self-Service) ---
// ==========================================================

// @route   GET /api/employee/attendance/daily
// @desc    Get my daily attendance records
router.get(
  '/attendance/daily',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  getMyDailyAttendance
);

// @route   POST /api/employee/attendance/daily
// @desc    Mark my daily attendance (self-mark)
router.post(
  '/attendance/daily',
  [
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
    body('status').isIn(['P', 'A', 'LOP', 'PL']).withMessage('Invalid status'),
    body('checkIn').optional().matches(/^\d{2}:\d{2}$/).withMessage('Check-in must be HH:mm'),
    body('checkOut').optional().matches(/^\d{2}:\d{2}$/).withMessage('Check-out must be HH:mm'),
    body('hoursWorked').optional().isFloat({ min: 0, max: 24 }),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  markMyAttendance
);

// @route   PUT /api/employee/attendance/daily/:recordId
// @desc    Update my existing daily attendance record
router.put(
  '/attendance/daily/:recordId',
  [
    param('recordId').isMongoId().withMessage('Invalid record ID'),
    body('status').optional().isIn(['P', 'A', 'LOP', 'PL']).withMessage('Invalid status'),
    body('checkIn').optional().matches(/^\d{2}:\d{2}$/).withMessage('Check-in must be HH:mm'),
    body('checkOut').optional().matches(/^\d{2}:\d{2}$/).withMessage('Check-out must be HH:mm'),
    body('hoursWorked').optional().isFloat({ min: 0, max: 24 }),
    body('notes').optional().isString().isLength({ max: 500 }),
  ],
  handleValidationErrors,
  updateMyDailyAttendance
);

// @route   DELETE /api/employee/attendance/daily/:recordId
// @desc    Delete my daily attendance record
router.delete(
  '/attendance/daily/:recordId',
  [param('recordId').isMongoId().withMessage('Invalid record ID')],
  handleValidationErrors,
  deleteMyDailyAttendance
);

// @route   GET /api/employee/attendance/daily/download
// @desc    Download my daily attendance as CSV
router.get(
  '/attendance/daily/download',
  [
    query('year').optional().isInt({ min: 2000 }),
    query('month').optional().isInt({ min: 1, max: 12 }),
  ],
  handleValidationErrors,
  downloadMyDailyAttendance
);

export default router;