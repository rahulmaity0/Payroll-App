// services/user.service.ts
import Employee, { IEmployee } from '../models/employee.model';
import User, { IUser } from '../models/user.model';
import { Types } from 'mongoose';

// Service to get a user's own profile
// The 'employeeId' comes from the 'req.user.employee' (linked in the JWT)
export const getMyProfile = async (
  employeeId: string | Types.ObjectId
): Promise<IEmployee> => {
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
export const updateMyProfile = async (
  employeeId: string | Types.ObjectId,
  updateData: any // Using 'any' as req.body can contain anything
): Promise<IEmployee> => {
  // getMyProfile will throw an error if not found
  const employee = await getMyProfile(employeeId);

  // Define which fields an employee is allowed to update
  const allowedUpdates: string[] = [
    'personalEmail',
    'phone',
    'address',
    'bankDetails',
    'taxInfo',
  ];

  // Filter updateData to only include allowed fields
  const updates: Record<string, any> = {};
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

  if (!updatedEmployee) {
    throw new Error('Employee not found during update.');
  }
  return updatedEmployee;
};

// Service to change a user's own password
export const changeMyPassword = async (
  userId: string | Types.ObjectId,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
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

  // Save the user. The pre-save hook in user.model.ts will hash it.
  await user.save();
};