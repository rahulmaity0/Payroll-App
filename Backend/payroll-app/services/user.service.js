// services/user.service.js
const Employee = require('../models/employee.model');
const User = require('../models/user.model');

// Service to get a user's own profile
// The 'employeeId' comes from the 'req.user.employee' (linked in the JWT)
exports.getMyProfile = async (employeeId) => {
  if (!employeeId) {
    throw new Error('No employee record linked to this user.');
  }
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee profile not found.');
  }
  return employee;
};

// Service to update a user's own profile
exports.updateMyProfile = async (employeeId, updateData) => {
  const employee = await this.getMyProfile(employeeId); // Re-use our own service

  // Define which fields an employee is allowed to update
  // They shouldn't update their employeeId, designation, or joiningDate
  const allowedUpdates = [
    'personalEmail',
    'phone',
    'address',
    'bankDetails',
    'taxInfo',
  ];

  // Filter updateData to only include allowed fields
  const updates = {};
  for (const key in updateData) {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  }

  // Update the employee record
  const updatedEmployee = await Employee.findByIdAndUpdate(
    employee._id,
    { $set: updates },
    { new: true, runValidators: true } // Return the new doc and run schema validators
  );

  return updatedEmployee;
};

// Service to change a user's own password
exports.changeMyPassword = async (userId, oldPassword, newPassword) => {
  // Find the user by their ID (from the token)
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Check if the old password matches
  const isMatch = await user.matchPassword(oldPassword);
  if (!isMatch) {
    throw new Error('Incorrect old password');
  }

  // Set the new password
  user.password = newPassword;
  
  // Save the user. The pre-save hook in user.model.js will hash it.
  await user.save();
};