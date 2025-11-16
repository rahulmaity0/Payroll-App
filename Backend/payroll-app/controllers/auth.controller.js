// controllers/auth.controller.js
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Utility function to generate a JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '1d', // Token expires in 1 day
  });
};

// --- Login Controller ---
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide email and password' });
  }

  try {
    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // User is valid, send token and user info
    res.status(200).json({
      message: 'Login successful',
      _id: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employee, // The ID of the linked employee record
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};