// controllers/user.controller.js
const UserService = require('../services/user.service');

// @desc    View my own profile
// @route   GET /api/users/profile
// @access  Private (Employee or HR)
exports.getMyProfile = async (req, res) => {
  try {
    // req.user.employee is attached by your 'protect' middleware
    const profile = await UserService.getMyProfile(req.user.employee);
    res.status(200).json(profile);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    Update my own profile
// @route   PUT /api/users/profile
// @access  Private (Employee or HR)
exports.updateMyProfile = async (req, res) => {
  try {
    const updatedProfile = await UserService.updateMyProfile(
      req.user.employee,
      req.body
    );
    res.status(200).json(updatedProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Change user's own password
// @route   PUT /api/users/password
// @access  Private (Employee or HR)
exports.changeMyPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    // req.user._id comes from the 'protect' middleware
    await UserService.changeMyPassword(req.user._id, oldPassword, newPassword);
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};