// routes/hr.routes.js
const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validator.middleware');
const { protect, authorize } = require('../middleware/auth.middleware');
const multer = require('multer');

// Import all your HR controller functions
const {
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
} = require('../controllers/hr.controller');

// Setup multer for file uploads
const upload = multer({ dest: 'uploads/' });

// --- Protect all HR routes ---
// All routes defined below will require a valid token (protect)
// and the 'hr' role (authorize)
router.use(protect);
router.use(authorize('hr'));

// --- Employee Management Routes ---

// @route   POST /api/hr/onboard
// @desc    Onboard a new employee (creates Employee, User, and Salary)
router.post(
  '/onboard',
  [
    // Validation for onboarding
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('designation').notEmpty().withMessage('Designation is required'),
    body('joiningDate').isISO8601().withMessage('Joining date must be a valid date'),
    body('annualCTC').isNumeric().withMessage('Annual CTC must be a number'),
  ],
  handleValidationErrors,
  onboardEmployee
);

// @route   GET /api/hr/employees
// @desc    View all employees
router.get('/employees', getAllEmployees);

// @route   GET /api/hr/employees/:id
// @desc    View a single employee's profile
router.get(
  '/employees/:id',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getEmployeeById
);

// @route   PUT /api/hr/employees/:id
// @desc    Edit an employee's profile
router.put(
  '/employees/:id',
  [
    param('id').isMongoId().withMessage('Invalid Employee ID'),
    // Add optional body validations for fields you allow HR to edit
    body('designation').optional().notEmpty().withMessage('Designation is required'),
    body('department').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  handleValidationErrors,
  updateEmployeeProfile
);

// --- Salary Management Routes ---

// @route   GET /api/hr/employees/:id/salary
// @desc    View employee salary details
router.get(
  '/employees/:id/salary',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getSalaryDetails
);

// @route   PUT /api/hr/employees/:id/salary
// @desc    Create or update employee salary details
router.put(
  '/employees/:id/salary',
  [
    param('id').isMongoId().withMessage('Invalid Employee ID'),
    body('annualCTC').isNumeric().withMessage('Annual CTC must be a number'),
    // You can add deep validation for earnings/deductions arrays
    body('earnings').isArray().withMessage('Earnings must be an array'),
    body('deductions').isArray().withMessage('Deductions must be an array'),
  ],
  handleValidationErrors,
  updateSalaryDetails
);

// --- Attendance Management Routes ---

// @route   POST /api/hr/upload/payroll
// @desc    Upload monthly attendance/payroll data (Bulk create)
router.post(
  '/upload/payroll',
  upload.single('payrollFile'), // 'payrollFile' is the form field name
  uploadPayroll
);

// @route   GET /api/hr/employees/:id/attendance
// @desc    View all attendance records for a specific employee
router.get(
  '/employees/:id/attendance',
  [param('id').isMongoId().withMessage('Invalid Employee ID')],
  handleValidationErrors,
  getEmployeeAttendance
);

// @route   POST /api/hr/attendance
// @desc    Manually create a single attendance record
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

// @route   PUT /api/hr/attendance/:attId
// @desc    Manually edit a single attendance record
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

// @route   POST /api/hr/payroll/generate
// @desc    Generate payslips for all employees for a specific month
router.post(
  '/payroll/generate',
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be a valid number'),
  ],
  handleValidationErrors,
  generatePayslips // <-- USE THE NEW CONTROLLER
);

// @route   GET /api/hr/payslips/:id/download
// @desc    Allow HR to download a specific payslip for any employee
router.get(
  '/payslips/:id/download',
  [param('id').isMongoId().withMessage('Invalid Payslip ID')],
  handleValidationErrors,
  downloadPayslipForEmployee // <-- USE THE NEW CONTROLLER
);

module.exports = router;