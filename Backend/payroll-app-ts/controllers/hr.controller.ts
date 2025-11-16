// controllers/hr.controller.ts
import { Request, Response } from 'express';
import * as HRService from '../services/hr.service';
import fs from 'fs';
import readline from 'readline';

// --- Employee Controllers ---
export const onboardEmployee = async (req: Request, res: Response) => {
  try {
    const result = await HRService.onboardEmployee(req.body);
    res.status(201).json({
      message: 'Employee onboarded successfully',
      data: result,
    });
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await HRService.getAllEmployees();
    res.status(200).json(employees);
  } catch (error) {
    const message = (error as Error).message;
    res.status(500).json({ message });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const employee = await HRService.getEmployeeById(req.params.id);
    res.status(200).json(employee);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

export const updateEmployeeProfile = async (req: Request, res: Response) => {
  try {
    const updatedEmployee = await HRService.updateEmployeeProfile(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedEmployee);
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

// --- Salary Controllers ---
export const getSalaryDetails = async (req: Request, res: Response) => {
  try {
    const salary = await HRService.getSalaryDetails(req.params.id);
    res.status(200).json(salary);
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

export const updateSalaryDetails = async (req: Request, res: Response) => {
  try {
    const updatedSalary = await HRService.updateSalaryDetails(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedSalary);
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

// --- Attendance Controllers ---
export const getEmployeeAttendance = async (req: Request, res: Response) => {
  try {
    const attendance = await HRService.getEmployeeAttendance(req.params.id);
    res.status(200).json(attendance);
  } catch (error) {
    const message = (error as Error).message;
    res.status(500).json({ message });
  }
};

export const createAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const record = await HRService.createAttendanceRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    // Handle specific MongoDB duplicate key error
    if ((error as any).code === 11000) {
      return res
        .status(400)
        .json({ message: 'Attendance record already exists for this month.' });
    }
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

export const updateAttendanceRecord = async (req: Request, res: Response) => {
  try {
    const updatedRecord = await HRService.updateAttendanceRecord(
      req.params.attId,
      req.body
    );
    res.status(200).json(updatedRecord);
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

// --- Payroll Controllers ---
export const uploadPayroll = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    // Read optional query params to control behavior
    const mode = (req.query.mode as string) || undefined; // 'daily'|'monthly'
    const action = (req.query.action as string) || undefined; // 'preview'|'append'|'overwrite'
    const dedupeStrategy = (req.query.dedupeStrategy as string) || undefined; // 'skip'|'update'|'error'
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const delimiter = (req.query.delimiter as string) || ',';

    const filePath = req.file.path;

    // Read first non-empty line from uploaded file to inspect headers (safe for large files)
    const readFirstNonEmptyLine = (): Promise<string> =>
      new Promise((resolve, reject) => {
        const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
        const rl = readline.createInterface({ input: stream });

        const onLine = (line: string) => {
          if (line && line.trim()) {
            rl.close();
            stream.destroy();
            resolve(line);
          }
        };

        rl.on('line', onLine);
        rl.on('close', () => resolve(''));
        rl.on('error', (err) => {
          stream.destroy();
          reject(err);
        });
      });

    const headerLine = await readFirstNonEmptyLine();
    const headers = headerLine ? headerLine.split(delimiter).map((h) => h.trim().toLowerCase()) : [];

    // Basic required headers
    const requiredDaily = ['employeeid', 'date'];
    const requiredMonthly = ['employeeid', 'month', 'year'];

    // Narrow and validate query params
    const modeOpt = mode === 'daily' || mode === 'monthly' ? (mode as 'daily' | 'monthly') : undefined;
    const actionOpt = action === 'preview' || action === 'append' || action === 'overwrite' ? (action as 'preview' | 'append' | 'overwrite') : undefined;
    const dedupeOpt = dedupeStrategy === 'skip' || dedupeStrategy === 'update' || dedupeStrategy === 'error' ? (dedupeStrategy as 'skip' | 'update' | 'error') : undefined;

    // Attempt to auto-detect mode if not provided
    let detectedMode: 'daily' | 'monthly' | undefined;
    if (headers.length) {
      if (headers.includes('date') || headers.includes('checkin') || headers.includes('checkout')) {
        detectedMode = 'daily';
      } else if (headers.includes('month') && headers.includes('year')) {
        detectedMode = 'monthly';
      }
    }

    // If mode provided, ensure headers match expectations
    const finalMode = modeOpt || detectedMode;
    if (finalMode === 'daily') {
      const missing = requiredDaily.filter((h) => !headers.includes(h));
      if (missing.length) {
        return res.status(400).json({ message: `CSV missing required daily headers: ${missing.join(', ')}` });
      }
    } else if (finalMode === 'monthly') {
      const missing = requiredMonthly.filter((h) => !headers.includes(h));
      if (missing.length) {
        return res.status(400).json({ message: `CSV missing required monthly headers: ${missing.join(', ')}` });
      }
    } else {
      // If we couldn't detect mode, ask client to provide mode or include standard headers
      return res.status(400).json({ message: 'Unable to detect CSV format. Provide `mode=daily|monthly` or include standard headers (e.g., employeeId,date or employeeId,month,year).' });
    }

    const result = await HRService.processPayrollUpload(req.file.path, {
      mode: finalMode,
      action: actionOpt,
      dedupeStrategy: dedupeOpt,
      year,
      month,
    });

    // Use 201 if actual writes occurred (action != preview)
    const statusCode = action && action !== 'preview' ? 201 : 200;
    res.status(statusCode).json(result);
  } catch (error) {
    const message = (error as Error).message;
    res.status(500).json({ message });
  }
};

export const generatePayslips = async (req: Request, res: Response) => {
  try {
    const { month, year, force } = req.body;
    
    // Validate inputs
    if (!month || !year) {
      return res.status(400).json({ 
        message: 'Month and year are required fields.' 
      });
    }

    const result = await HRService.generatePayslips(month, year, { force });
    
    res.status(200).json({
      message: `Payroll run for ${month}/${year} completed successfully.`,
      ...result,
    });
  } catch (error) {
    const message = (error as Error).message;
    res.status(400).json({ message });
  }
};

export const downloadPayslipForEmployee = async (
  req: Request,
  res: Response
) => {
  try {
    const payslipId = req.params.id;
    const doc = await HRService.downloadEmployeePayslip(payslipId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${payslipId}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};

// --- Password Reset Controller ---
export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id; // This is the User _id
    const { newPassword } = req.body;

    await HRService.resetUserPassword(userId, newPassword);

    res.status(200).json({ message: 'User password reset successfully' });
  } catch (error) {
    const message = (error as Error).message;
    res.status(404).json({ message });
  }
};