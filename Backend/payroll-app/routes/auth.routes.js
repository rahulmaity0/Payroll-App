// routes/auth.routes.js
const express = require('express');
const router = express.Router();
// Only import loginUser
const { loginUser } = require('../controllers/auth.controller');

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

module.exports = router;