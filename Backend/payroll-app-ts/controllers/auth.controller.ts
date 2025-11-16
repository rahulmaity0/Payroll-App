// controllers/auth.controller.ts
import { Request, Response } from 'express';
import User from '../models/user.model';
import Employee from '../models/employee.model';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Utility function to generate a JWT
const generateToken = (id: string, role: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in .env file');
  }

  return jwt.sign({ id, role }, jwtSecret, {
    expiresIn: '1d', // Token expires in 1 day
  });
};

// --- Login Controller ---
export const loginUser = async (req: Request, res: Response) => {
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
      token: generateToken(user._id.toString(), user.role),
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// --- Register HR Controller ---
export const registerHR = async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, employeeId } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check if employeeId already exists (if provided)
    if (employeeId) {
      const employeeExists = await Employee.findOne({ employeeId });
      if (employeeExists) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Auto-generate employeeId if not provided
    let newEmployeeId = employeeId || 'HR001';
    if (!employeeId) {
      // Find max HR employeeId
      const hrEmployees = await Employee.find({ employeeId: { $regex: '^HR\\d+$' } }).select('employeeId');
      const nums = hrEmployees.map((d) => {
        const m = d.employeeId.match(/^HR0*(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      });
      const max = nums.length ? Math.max(...nums) : 0;
      newEmployeeId = 'HR' + String(max + 1).padStart(3, '0');
    }

    // Create Employee profile for HR
    const hrEmployee = new Employee({
      employeeId: newEmployeeId,
      firstName: firstName || 'HR',
      lastName: lastName || 'Admin',
      personalEmail: email,
      designation: 'HR Manager',
      joiningDate: new Date(),
    });
    await hrEmployee.save();

    // Create User account with 'hr' role
    const hrUser = new User({
      email,
      password, // Will be hashed by pre-save hook
      role: 'hr',
      employee: hrEmployee._id,
    });
    await hrUser.save();

    res.status(201).json({
      message: 'HR user registered successfully',
      _id: hrUser._id,
      email: hrUser.email,
      role: hrUser.role,
      employeeId: hrEmployee.employeeId,
      token: generateToken(hrUser._id.toString(), hrUser.role),
    });
  } catch (error) {
    console.error('Register HR Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};