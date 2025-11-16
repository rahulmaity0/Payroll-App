// middleware/request-response.middleware.ts
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

// Middleware to log request and response payloads (optimized for performance)
export const requestResponseLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Capture the request body and query
  const requestData = {
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString(),
  };

  // Log incoming request asynchronously (non-blocking)
  setImmediate(() => {
    logger.debug(`[REQUEST] ${req.method} ${req.originalUrl}`, {
      logType: 'payload', // Custom property for filtering
      request: requestData,
    });
  });

  // Store the original json and send functions
  const originalJson = res.json;
  const originalSend = res.send;

  // Override json method (most common for APIs)
  res.json = function (data: any) {
    const responseTime = Date.now() - startTime;
    
    // Log outgoing response asynchronously (non-blocking)
    setImmediate(() => {
      logger.debug(`[RESPONSE] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTime}ms`, {
        logType: 'payload', // Custom property for filtering
        response: {
          status: res.statusCode,
          responseTime: responseTime,
          timestamp: new Date().toISOString(),
          body: data, // <-- Log the actual response body
        },
      });
    });

    // Call the original json function
    return originalJson.call(this, data);
  };

  // Override send method (fallback)
  res.send = function (data: any) {
    const responseTime = Date.now() - startTime;
    
    // Log outgoing response asynchronously (non-blocking)
    setImmediate(() => {
      logger.debug(`[RESPONSE] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTime}ms`, {
        logType: 'payload', // Custom property for filtering
        response: {
          status: res.statusCode,
          responseTime: responseTime,
          timestamp: new Date().toISOString(),
          body: data, // <-- Log the actual response body
        },
      });
    });

    // Call the original send function
    return originalSend.call(this, data);
  };

  next();
};
