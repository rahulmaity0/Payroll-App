// controllers/user.controller.ts
import { Request, Response } from 'express';
import * as UserService from '../services/user.service'; // Import as a module

// @desc    View my own profile
// @route   GET /api/users/profile
// @access  Private (Employee or HR)
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    // req.user is attached by 'protect' middleware. We use '!' to assert it exists.
    // req.user.employee is the ID of the employee record.
    const profile = await UserService.getMyProfile(req.user!.employee);
    res.status(200).json(profile);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// @desc    Update my own profile
// @route   PUT /api/users/profile
// @access  Private (Employee or HR)
export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const updatedProfile = await UserService.updateMyProfile(
      req.user!.employee,
      req.body
    );
    res.status(200).json(updatedProfile);
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

// @desc    Change user's own password
// @route   PUT /api/users/password
// @access  Private (Employee or HR)
export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // req.user._id is the ID of the User document
    await UserService.changeMyPassword(
      req.user!._id,
      oldPassword,
      newPassword
    );

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};