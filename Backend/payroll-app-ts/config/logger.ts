// config/logger.ts
import winston from 'winston';
import morgan from 'morgan';
// Ensure the logs directory exists
import fs from 'fs';
import path from 'path';
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom format to filter logs based on a 'logType' property
const payloadFilter = winston.format((info, opts) => {
  return info.logType === 'payload' ? info : false;
});
const nonPayloadFilter = winston.format((info, opts) => {
  return info.logType !== 'payload' ? info : false;
});

// 1. Define Log Format
const consoleFormat = winston.format.printf(
  ({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  }
);

// 2. Create the Winston Logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Log stack traces
    winston.format.json()
  ),
  transports: [
    // Write errors to error.log
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    // Write general logs (but not payloads) to all.log
    new winston.transports.File({
      filename: path.join(logDir, 'all.log'),
      level: 'debug',
      format: winston.format.combine(nonPayloadFilter()),
    }),
    // Write only payload logs to payloads.log
    new winston.transports.File({
      filename: path.join(logDir, 'payloads.log'),
      level: 'debug',
      format: winston.format.combine(payloadFilter()),
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Add colors
        consoleFormat
      ),
    })
  );
}

// 3. Create a stream object...
const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

// 4. Create the Morgan Middleware
export const morganMiddleware = morgan(
  ':method :url :status :response-time ms - :res[content-length]',
  {
    stream,
  }
);

// 5. Export the main logger
export default logger;
