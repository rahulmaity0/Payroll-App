// middleware/validator.middleware.js
const { validationResult } = require('express-validator');

// Middleware to catch and handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};