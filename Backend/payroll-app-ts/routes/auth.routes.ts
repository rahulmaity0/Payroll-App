// routes/auth.routes.ts
import { Router } from 'express';
import { loginUser, registerHR } from '../controllers/auth.controller';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validator.middleware';

const router = Router();

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

// @route   POST /api/auth/register-hr
// @desc    Register new HR user
// @access  Public
router.post(
  '/register-hr',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('employeeId').optional().isString(),
  ],
  handleValidationErrors,
  registerHR
);

export default router;