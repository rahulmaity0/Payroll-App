// routes/hr.routes.ts
import { Router } from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validator.middleware';
import { protect, authorize } from '../middleware/auth.middleware';
import multer from 'multer';

// Import all your HR controller functions
import {
  onboardEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployeeProfile,
  getSalaryDetails,
  updateSalaryDetails,
  getEmployeeAttendance,
  createAttendanceRecord,
  updateAttendanceRecord,
  uploadPayroll,
  generatePayslips,
  downloadPayslipForEmployee,
  resetUserPassword, // Make sure to import this
} from '../controllers/hr.controller';

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

const router = Router();

// --- Protect all HR routes ---
router.use(protect);
router.use(authorize('hr'));

// --- Employee Management Routes ---
router.post(
  '/onboard',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('designation').notEmpty().withMessage('Designation is required'),
    body('joiningDate').isISO8601().withMessage('Joining date must be a valid date'),
    body('annualCTC').isNumeric().withMessage('Annual CTC must be a number'),
  ],
  handleValidationErrors,
  onboardEmployee
);

router.get('/employees', getAllEmployees);

router.get(
  '/employees/:id',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getEmployeeById
);

router.put(
  '/employees/:id',
  [
    param('id').isMongoId().withMessage('Invalid Employee ID'),
    body('designation').optional().notEmpty().withMessage('Designation is required'),
    body('department').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  updateEmployeeProfile
);

// --- Salary Management Routes ---
router.get(
  '/employees/:id/salary',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getSalaryDetails
);

router.put(
  '/employees/:id/salary',
  [
    param('id').isMongoId().withMessage('Invalid Employee ID'),
    body('annualCTC').isNumeric().withMessage('Annual CTC must be a number'),
    body('earnings').isArray().withMessage('Earnings must be an array'),
    body('deductions').isArray().withMessage('Deductions must be an array'),
  ],
  handleValidationErrors,
  updateSalaryDetails
);

// --- Attendance Management Routes ---
router.post(
  '/upload/payroll',
  upload.single('payrollFile'),
  uploadPayroll
);

// Alias route kept for backward-compatibility / frontend variations
router.post(
  '/attendance/upload',
  upload.single('payrollFile'),
  uploadPayroll
);

router.get(
  '/employees/:id/attendance',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getEmployeeAttendance
);

router.post(
  '/attendance',
  [
    body('employee').isMongoId().withMessage('Invalid Employee ID'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be valid'),
    body('totalWorkingDays').isNumeric().withMessage('Total working days is required'),
    body('daysPresent').isNumeric().withMessage('Days present is required'),
  ],
  handleValidationErrors,
  createAttendanceRecord
);

router.put(
  '/attendance/:attId',
  [
    param('attId').isMongoId().withMessage('Invalid Attendance Record ID'),
    body('totalWorkingDays').optional().isNumeric(),
    body('daysPresent').optional().isNumeric(),
    body('leaveWithoutPay').optional().isNumeric(),
  ],
  handleValidationErrors,
  updateAttendanceRecord
);

// --- Payroll & Password Routes ---
router.post(
  '/payroll/generate',
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be a valid number'),
  ],
  handleValidationErrors,
  generatePayslips
);

router.get(
  '/payslips/:id/download',
  [param('id').isMongoId().withMessage('Invalid Payslip ID')],
  handleValidationErrors,
  downloadPayslipForEmployee
);

router.put(
  '/users/:id/reset-password',
  [
    param('id').isMongoId().withMessage('Invalid User ID'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  handleValidationErrors,
  resetUserPassword
);

export default router;