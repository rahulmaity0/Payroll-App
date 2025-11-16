// routes/user.routes.js
const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validator.middleware'); // We will create this

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
  handleValidationErrors, // Middleware to catch validation errors
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
  changeMyPassword // <-- ADD THIS
);

module.exports = router;