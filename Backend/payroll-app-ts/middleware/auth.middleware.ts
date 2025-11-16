// middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user.model';
import dotenv from 'dotenv';

dotenv.config();

// Define a type for the decoded JWT payload
interface JwtPayload {
  id: string;
  role: string;
}

// --- THIS IS THE KEY ---
// Extend the default Express Request interface to include our 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: IUser; // 'user' is optional and of type IUser
    }
  }
}
// --- END KEY ---

// Middleware to protect routes (check if user is logged in)
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in .env file');
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token and type the decoded payload
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      // Attach user to the request object
      // We use select('-password') to exclude the password
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res
          .status(401)
          .json({ message: 'Not authorized, user not found' });
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
export const authorize = (role: 'employee' | 'hr') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // We can safely access req.user because of the 'protect' middleware
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        message: `Role '${
          req.user?.role
        }' is not authorized for this action`,
      });
    }
    next();
  };
};