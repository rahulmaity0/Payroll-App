// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
require('dotenv').config();

// Middleware to protect routes (check if user is logged in)
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach user to the request object
      req.user = await User.findById(decoded.id).select('-password'); 
      
      if (!req.user) {
         return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to authorize based on role
exports.authorize = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ 
        message: `Role '${req.user.role}' is not authorized for this action` 
      });
    }
    next();
  };
};