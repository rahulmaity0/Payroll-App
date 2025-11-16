// routes/user.routes.ts
import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validator.middleware';

const router = Router();

// @route   GET /api/users/profile
router.get('/profile', protect, getMyProfile);

// @route   PUT /api/users/profile
router.put(
  '/profile',
  protect,
  [
    // Validation rules
    body('personalEmail').optional().isEmail().withMessage('Must be a valid email'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address.street').optional().isString(),
    body('bankDetails.accountNumber').optional().isString(),
  ],
  handleValidationErrors,
  updateMyProfile
);

// @route   PUT /api/users/password
// @desc    Change user's own password
router.put(
  '/password',
  protect, // User must be logged in
  [
    body('oldPassword').notEmpty().withMessage('Old password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  handleValidationErrors,
  changeMyPassword
);

export default router;