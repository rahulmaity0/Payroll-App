// index.ts
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db'; // We will create this file next

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import employeeRoutes from './routes/employee.routes';
import hrRoutes from './routes/hr.routes';

import { morganMiddleware } from './config/logger';
import { errorLogger } from './middleware/error.middleware';
import { requestResponseLogger } from './middleware/request-response.middleware';

// Load env vars
dotenv.config();

// Connect to Database
connectDB();

const app: Express = express();

// Body Parser Middleware
app.use(express.json());

// Enable CORS
app.use(cors());

// Request/Response payload logging
app.use(requestResponseLogger);

// HTTP request logging
app.use(morganMiddleware);

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/hr', hrRoutes);

// Simple test route
app.get('/', (req: Request, res: Response) => {
  res.send('Payroll API Running');
});

app.use(errorLogger);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));