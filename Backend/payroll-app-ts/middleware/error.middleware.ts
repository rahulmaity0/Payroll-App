// middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// This is the custom error handler
// It MUST have 4 arguments to be recognized by Express
export const errorLogger = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error using Winston
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method}`, {
    stack: err.stack,
  });

  // Send a generic error response to the client
  res.status(500).json({
    message: 'Internal Server Error',
  });
};