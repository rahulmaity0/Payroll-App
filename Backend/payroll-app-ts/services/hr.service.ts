// services/hr.service.ts
import Employee, { IEmployee } from '../models/employee.model';
import User, { IUser } from '../models/user.model';
import Salary, { ISalary } from '../models/salary.model';
import Attendance, {
  IAttendance,
  IVariableEarning,
  IVariableDeduction,
} from '../models/attendance.model';
import DailyAttendance, { IDailyAttendance } from '../models/dailyAttendance.model';
import Payslip, {
  IPayslip,
  IPayslipEarning,
  IPayslipDeduction,
} from '../models/payslip.model';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { Types } from 'mongoose';

// Special import for CommonJS modules with no default export or types
import csv = require('csv-parser');

// --- Type Definitions ---

// Interface for onboarding data from req.body
interface IOnboardData extends Partial<IEmployee> {
  email: string;
  password: string;
  annualCTC?: number;
}

// Interface for the CSV row data
interface ICsvRow {
  employeeId: string;
  month: string;
  year: string;
  totalDays: string;
  daysPresent: string;
  lop: string;
  overtimeHours?: string;
  variableEarnings?: string;
  variableDeductions?: string;
}

// Interface for the payroll generation result
interface IPayrollResult {
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings?: string[];
}

// Interface for payroll generation options
interface IPayrollOptions {
  month: number;
  year: number;
  force?: boolean; // Allow generation before month ends
}

// --- Employee Management ---

export const onboardEmployee = async (
  data: IOnboardData
): Promise<{ employee: IEmployee; user: IUser }> => {
  const {
    email,
    password, // Ignore password from request
    firstName,
    lastName,
    designation,
    joiningDate,
    personalEmail,
    annualCTC,
    ...otherDetails
  } = data;

  // 1. Check for duplicate user email
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User with this email already exists');

  // 2. Generate new employeeId with prefix EMP and next sequence
  let newEmployeeId = 'EMP001';
  try {
    // Try aggregation to compute max numeric suffix
    const agg = await Employee.aggregate([
      { $match: { employeeId: { $regex: '^EMP' } } },
      { $project: { numStr: { $substr: ['$employeeId', 3, { $subtract: [{ $strLenCP: '$employeeId' }, 3] }] } } },
      { $project: { num: { $toInt: '$numStr' } } },
      { $group: { _id: null, max: { $max: '$num' } } }
    ]);

    if (agg && agg.length && typeof agg[0].max === 'number') {
      const next = agg[0].max + 1;
      newEmployeeId = 'EMP' + String(next).padStart(3, '0');
    }
  } catch (err) {
    // Fallback: scan existing employeeIds if aggregation isn't supported
    const docs = await Employee.find({ employeeId: { $regex: '^EMP\\d+$' } }).select('employeeId');
    const nums = docs.map((d) => {
      const m = d.employeeId.match(/^EMP0*(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = nums.length ? Math.max(...nums) : 0;
    newEmployeeId = 'EMP' + String(max + 1).padStart(3, '0');
  }

  // 3. Ensure generated employeeId is unique (very rare race condition)
  const existingEmp = await Employee.findOne({ employeeId: newEmployeeId });
  if (existingEmp) {
    // If collision, increment until unique
    let counter = 1;
    let candidate: string;
    do {
      candidate = 'EMP' + String(counter + 1000).slice(1); // ensure padding if needed
      counter++;
    } while (await Employee.findOne({ employeeId: candidate }));
    newEmployeeId = candidate;
  }

  // 4. Create Employee
  const newEmployee = new Employee({
    employeeId: newEmployeeId,
    firstName,
    lastName,
    designation,
    joiningDate,
    personalEmail: personalEmail || email,
    ...otherDetails,
  });
  await newEmployee.save();

  // 5. Create User (Login) with default password
  const newUser = new User({
    email,
    password: 'password', // Default password - HR ignores any password in request
    role: 'employee',
    employee: newEmployee._id,
  });
  await newUser.save();

  // 4. Create Salary Structure (if CTC is provided)
  if (annualCTC) {
    const monthlyGross = annualCTC / 12;
    const basic = Math.round(monthlyGross * 0.5);
    const hra = Math.round(monthlyGross * 0.25);
    const special = monthlyGross - basic - hra;

    const newSalary = new Salary({
      employee: newEmployee._id,
      annualCTC,
      earnings: [
        { name: 'Basic', amount: basic },
        { name: 'HRA', amount: hra },
        { name: 'Special Allowance', amount: special },
      ],
      deductions: [
        { name: 'Provident Fund', amount: 1800, isPercent: false },
        { name: 'Professional Tax', amount: 200, isPercent: false },
      ],
    });
    await newSalary.save();
  }

  return { employee: newEmployee, user: newUser };
};

export const getAllEmployees = async (): Promise<IEmployee[]> => {
  return await Employee.find({ isActive: true }).select('-__v');
};

export const getEmployeeById = async (id: string): Promise<IEmployee> => {
  const employee = await Employee.findById(id);
  if (!employee) throw new Error('Employee not found');
  return employee;
};

export const updateEmployeeProfile = async (
  id: string,
  data: Partial<IEmployee>
): Promise<IEmployee> => {
  const updated = await Employee.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new Error('Employee not found');
  return updated;
};

// --- Salary Management ---

export const getSalaryDetails = async (
  employeeId: string
): Promise<ISalary> => {
  const salary = await Salary.findOne({ employee: employeeId });
  if (!salary) throw new Error('Salary details not found for this employee');
  return salary;
};

export const updateSalaryDetails = async (
  employeeId: string,
  data: Partial<ISalary>
): Promise<ISalary> => {
  const salary = await Salary.findOneAndUpdate(
    { employee: employeeId },
    { ...data, employee: employeeId },
    { new: true, upsert: true, runValidators: true }
  );
  if (!salary) {
    throw new Error('Could not create or update salary details.');
  }
  return salary;
};

// --- Attendance Management ---

export const getEmployeeAttendance = async (
  employeeId: string,
  filters?: { year?: number; month?: number }
): Promise<IAttendance[]> => {
  const query: any = { employee: employeeId };
  
  if (filters?.year) query.year = filters.year;
  if (filters?.month) query.month = filters.month;
  
  return await Attendance.find(query).sort({
    year: -1,
    month: -1,
  });
};

export const createAttendanceRecord = async (
  data: Partial<IAttendance>
): Promise<IAttendance> => {
  const exists = await Attendance.findOne({
    employee: data.employee,
    month: data.month,
    year: data.year,
  });
  if (exists) throw new Error('Attendance record already exists for this month');

  const attendance = new Attendance(data);
  return await attendance.save();
};

export const updateAttendanceRecord = async (
  id: string,
  data: Partial<IAttendance>
): Promise<IAttendance> => {
  const updated = await Attendance.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error('Attendance record not found');
  return updated;
};

export const deleteAttendanceRecord = async (
  id: string
): Promise<{ message: string }> => {
  const deleted = await Attendance.findByIdAndDelete(id);
  if (!deleted) throw new Error('Attendance record not found');
  return { message: 'Attendance record deleted successfully' };
};

export const getAttendanceSummary = async (
  month: number,
  year: number
): Promise<any[]> => {
  // Aggregate from DailyAttendance collection
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-31`;

  const summary = await DailyAttendance.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$employee',
        totalWorkingDays: { $sum: 1 },
        daysPresent: {
          $sum: {
            $cond: [{ $eq: ['$status', 'P'] }, 1, 0]
          }
        },
        leaveWithoutPay: {
          $sum: {
            $cond: [{ $eq: ['$status', 'LOP'] }, 1, 0]
          }
        },
        paidLeave: {
          $sum: {
            $cond: [{ $eq: ['$status', 'PL'] }, 1, 0]
          }
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ['$status', 'A'] }, 1, 0]
          }
        },
        holidays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'H'] }, 1, 0]
          }
        },
        weekOffs: {
          $sum: {
            $cond: [{ $eq: ['$status', 'WO'] }, 1, 0]
          }
        },
        overtimeHours: { $sum: { $ifNull: ['$overtimeHours', 0] } }
      }
    },
    {
      $lookup: {
        from: 'employee_details',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    {
      $unwind: '$employee'
    },
    {
      $project: {
        _id: 1,
        employee: {
          _id: '$employee._id',
          employeeId: '$employee.employeeId',
          firstName: '$employee.firstName',
          lastName: '$employee.lastName',
          designation: '$employee.designation'
        },
        month: month,
        year: year,
        totalWorkingDays: 1,
        daysPresent: 1,
        leaveWithoutPay: 1,
        paidLeave: 1,
        absent: 1,
        holidays: 1,
        weekOffs: 1,
        overtimeHours: 1
      }
    },
    {
      $sort: { 'employee.employeeId': 1 }
    }
  ]);

  return summary;
};

// ==========================================================
// --- DAILY ATTENDANCE SERVICES ---
// ==========================================================

export const getDailyAttendance = async (
  employeeId: string,
  year?: number,
  month?: number
): Promise<IDailyAttendance[]> => {
  // Build query
  let query: any = { employee: employeeId };

  // Add date range filter if year/month provided
  if (year && month) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;
    query.date = { $gte: startDate, $lte: endDate };
  } else if (year) {
    query.date = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
  }

  return await DailyAttendance.find(query).sort({ date: 1 });
};

export const setDailyAttendance = async (
  data: Partial<IDailyAttendance>
): Promise<IDailyAttendance> => {
  const { employee, date, status, checkIn, checkOut, hoursWorked, overtimeHours, notes } = data;

  // Validate required fields
  if (!employee || !date || !status) {
    throw new Error('Employee, date, and status are required');
  }

  // Upsert: Update if exists, create if not
  const record = await DailyAttendance.findOneAndUpdate(
    { employee, date }, // Filter: find by employee+date
    { employee, date, status, checkIn, checkOut, hoursWorked, overtimeHours, notes }, // Update data
    {
      upsert: true, // Create if doesn't exist
      new: true, // Return updated document
      runValidators: true, // Run schema validators
    }
  );

  return record;
};

export const updateDailyAttendance = async (
  recordId: string,
  data: Partial<IDailyAttendance>
): Promise<IDailyAttendance> => {
  const updated = await DailyAttendance.findByIdAndUpdate(recordId, data, {
    new: true,
    runValidators: true,
  });

  if (!updated) {
    throw new Error('Daily attendance record not found');
  }

  return updated;
};

export const deleteDailyAttendance = async (
  recordId: string
): Promise<{ message: string }> => {
  const record = await DailyAttendance.findByIdAndDelete(recordId);

  if (!record) {
    throw new Error('Daily attendance record not found');
  }

  return { message: 'Daily attendance record deleted successfully' };
};

// ==========================================================
// --- REVAMPED: Bulk Upload Logic ---
// ==========================================================
export const processPayrollUpload = async (
  filePath: string,
  options?: {
    mode?: 'daily' | 'monthly';
    action?: 'preview' | 'append' | 'overwrite';
    dedupeStrategy?: 'skip' | 'update' | 'error';
    year?: number;
    month?: number;
  }
): Promise<{
  message: string;
  mode?: string;
  action?: string;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
}> => {
  const results: any[] = [];
  const errors: string[] = [];

  // Helper function to safely parse JSON from CSV
  const parseJsonColumn = (
    jsonString: string | undefined,
    rowIdentifier: string
  ): any[] | null => {
    if (!jsonString || jsonString.trim() === '[]' || jsonString.trim() === '') {
      return [];
    }
    try {
      const validJsonString = jsonString.replace(/""/g, '"');
      return JSON.parse(validJsonString);
    } catch (e) {
      const message = (e as Error).message;
      errors.push(`Invalid JSON format in row for ${rowIdentifier}: ${message}`);
      return null;
    }
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        const mode = options?.mode
          ? options.mode
          : // auto-detect: if first row has 'date' -> daily, else monthly
            (results[0] && Object.keys(results[0]).some((k) => k.toLowerCase() === 'date') ? 'daily' : 'monthly');

        const action = options?.action || 'preview';
        const dedupe = options?.dedupeStrategy || 'skip';

        let processed = 0;
        let success = 0;
        let skipped = 0;
        let failed = 0;

        // Helper to parse variable columns (works for monthly)
        const parseVar = (val: any, id: string) => parseJsonColumn(val, id);

        // If overwrite for monthly, and not preview, we can delete existing records per row before upsert

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          processed++;
          const rowNum = i + 2; // header is row 1

          try {
            // Normalize keys
            const r: { [k: string]: any } = {};
            for (const key of Object.keys(row)) {
              r[key.trim().toLowerCase()] = row[key];
            }

            // Determine employee by employeeId or email
            const empKey = r['employeeid'] || r['employee_id'] || r['emp_id'] || r['email'];
            let employee = null as any;
            if (!empKey) {
              errors.push(`Row ${rowNum}: Missing employeeId or email`);
              failed++;
              continue;
            }

            if (empKey && empKey.toString().includes('@')) {
              employee = await Employee.findOne({ personalEmail: empKey.toString() }) || await Employee.findOne({ email: empKey.toString() });
            } else {
              employee = await Employee.findOne({ employeeId: empKey.toString() });
            }

            if (!employee) {
              errors.push(`Row ${rowNum}: Employee ${empKey} not found`);
              failed++;
              continue;
            }

            if (mode === 'monthly') {
              const monthVal = options?.month || parseInt(r['month']);
              const yearVal = options?.year || parseInt(r['year']);
              const totalWorkingDays = parseInt(r['totalworkingdays'] || r['totaldays'] || r['total_days']);
              const daysPresent = parseInt(r['dayspresent'] || r['days_present']);
              const lop = parseInt(r['leavewithoutpay'] || r['lwp'] || r['lop'] || '0');
              const overtimeHours = parseFloat(r['overtimehours'] || r['overtime'] || '0');

              if (!monthVal || !yearVal || isNaN(totalWorkingDays) || isNaN(daysPresent)) {
                errors.push(`Row ${rowNum}: Missing or invalid month/year/workingDays/daysPresent`);
                failed++;
                continue;
              }

              const varEarnings = parseVar(r['variableearnings'] || r['variable_earnings'], employee.employeeId);
              const varDeductions = parseVar(r['variabledeductions'] || r['variable_deductions'], employee.employeeId);

              if (varEarnings === null || varDeductions === null) {
                failed++;
                continue;
              }

              const attendanceData: Partial<IAttendance> = {
                employee: employee._id as any,
                month: monthVal,
                year: yearVal,
                totalWorkingDays: totalWorkingDays,
                daysPresent: daysPresent,
                leaveWithoutPay: lop || 0,
                overtimeHours: overtimeHours || 0,
                variableEarnings: varEarnings as IVariableEarning[],
                variableDeductions: varDeductions as IVariableDeduction[],
              };

              // Preview mode: don't write
              if (action === 'preview') {
                success++;
                continue;
              }

              // Overwrite: remove existing record first
              if (action === 'overwrite') {
                await Attendance.findOneAndDelete({ employee: employee._id, month: attendanceData.month, year: attendanceData.year });
              }

              // Append with dedupe strategies
              const existing = await Attendance.findOne({ employee: employee._id, month: attendanceData.month, year: attendanceData.year });
              if (existing) {
                if (dedupe === 'skip') {
                  skipped++;
                  continue;
                } else if (dedupe === 'error') {
                  errors.push(`Row ${rowNum}: Attendance exists for employee ${employee.employeeId} month ${attendanceData.month}/${attendanceData.year}`);
                  failed++;
                  continue;
                } else if (dedupe === 'update') {
                  await Attendance.findByIdAndUpdate(existing._id, attendanceData, { new: true, runValidators: true });
                  success++;
                  continue;
                }
              }

              // Default: upsert
              await Attendance.findOneAndUpdate({ employee: employee._id, month: attendanceData.month, year: attendanceData.year }, attendanceData, { upsert: true, new: true, runValidators: true });
              success++;
            } else {
              // daily mode - write to DailyAttendance collection
              const dateStr = r['date'];
              let statusVal = (r['status'] || 'P').toString().toUpperCase();
              
              if (!dateStr) {
                errors.push(`Row ${rowNum}: Missing date for daily record`);
                failed++;
                continue;
              }

              // Validate date format
              if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                errors.push(`Row ${rowNum}: Invalid date format '${dateStr}'. Must be YYYY-MM-DD`);
                failed++;
                continue;
              }

              // Validate status
              const validStatuses = ['P', 'A', 'LOP', 'PL', 'H', 'WO'];
              if (!validStatuses.includes(statusVal)) {
                errors.push(`Row ${rowNum}: Invalid status '${statusVal}'. Must be one of: ${validStatuses.join(', ')}`);
                failed++;
                continue;
              }

              if (action === 'preview') {
                success++;
                continue;
              }

              // Parse optional fields
              const checkIn = r['checkin'] || r['check_in'] || undefined;
              const checkOut = r['checkout'] || r['check_out'] || undefined;
              const hoursWorked = parseFloat(r['hoursworked'] || r['hours_worked'] || '0') || undefined;
              const overtimeHours = parseFloat(r['overtimehours'] || r['overtime_hours'] || r['overtime'] || '0') || undefined;
              const notes = r['notes'] || undefined;

              const dailyData: Partial<IDailyAttendance> = {
                employee: employee._id as any,
                date: dateStr,
                status: statusVal as any,
                checkIn,
                checkOut,
                hoursWorked,
                overtimeHours,
                notes,
              };

              // Handle overwrite/dedupe
              if (action === 'overwrite') {
                await DailyAttendance.findOneAndDelete({ employee: employee._id, date: dateStr });
              } else {
                const existing = await DailyAttendance.findOne({ employee: employee._id, date: dateStr });
                if (existing) {
                  if (dedupe === 'skip') {
                    skipped++;
                    continue;
                  } else if (dedupe === 'error') {
                    errors.push(`Row ${rowNum}: Daily attendance already exists for employee ${employee.employeeId} on ${dateStr}`);
                    failed++;
                    continue;
                  }
                  // dedupe === 'update' falls through to upsert
                }
              }

              // Upsert to DailyAttendance collection
              await DailyAttendance.findOneAndUpdate(
                { employee: employee._id, date: dateStr },
                dailyData,
                { upsert: true, new: true, runValidators: true }
              );
              success++;
            }
          } catch (err) {
            const message = (err as Error).message;
            errors.push(`Row ${rowNum}: Error processing: ${message}`);
            failed++;
          }
        }

        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // ignore
        }

        resolve({
          message: 'Processing complete',
          mode: options?.mode,
          action: options?.action || 'preview',
          processed,
          success,
          skipped,
          failed,
          errors,
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// ==========================================================
// --- HELPER: Aggregate Daily Attendance to Monthly Summary ---
// ==========================================================
/**
 * Aggregates daily attendance records for an employee for a given month/year
 * Returns monthly summary compatible with payroll calculations
 */
const aggregateDailyAttendance = async (
  employeeId: Types.ObjectId,
  month: number,
  year: number
): Promise<{
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours: number;
  variableEarnings: IVariableEarning[];
  variableDeductions: IVariableDeduction[];
} | null> => {
  // Calculate first and last day of the month
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0); // Day 0 = last day of previous month
  
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  // Fetch all daily records for the employee in the given month
  const dailyRecords = await DailyAttendance.find({
    employee: employeeId,
    date: {
      $gte: startDateStr,
      $lte: endDateStr,
    },
  });

  if (!dailyRecords || dailyRecords.length === 0) {
    return null; // No daily attendance data for this month
  }

  // Calculate aggregates
  let totalWorkingDays = 0;
  let daysPresent = 0;
  let leaveWithoutPay = 0;
  let totalOvertimeHours = 0;

  for (const record of dailyRecords) {
    totalWorkingDays++;

    switch (record.status) {
      case 'P': // Present
        daysPresent++;
        break;
      case 'LOP': // Leave Without Pay
        leaveWithoutPay++;
        break;
      case 'PL': // Paid Leave (counts as present for salary calculation)
      case 'H': // Holiday (counts as present)
      case 'WO': // Week Off (counts as present)
        daysPresent++;
        break;
      case 'A': // Absent (doesn't count as present)
        break;
    }

    if (record.overtimeHours) {
      totalOvertimeHours += record.overtimeHours;
    }
  }

  // For now, variable earnings/deductions come from monthly attendance_details if exists
  // If you want to add them to daily records in future, include them here
  const monthlyRecord = await Attendance.findOne({
    employee: employeeId,
    month,
    year,
  });

  return {
    totalWorkingDays,
    daysPresent,
    leaveWithoutPay,
    overtimeHours: totalOvertimeHours,
    variableEarnings: monthlyRecord?.variableEarnings || [],
    variableDeductions: monthlyRecord?.variableDeductions || [],
  };
};

// ==========================================================
// --- REVAMPED: Payroll Generation Service ---
// ==========================================================
export const generatePayslips = async (
  month: number,
  year: number,
  options?: { force?: boolean }
): Promise<IPayrollResult> => {
  // ========== VALIDATION PHASE ==========
  
  // 1. Validate month and year inputs
  if (!month || !year || month < 1 || month > 12 || year < 2000 || year > 2100) {
    throw new Error('Invalid month or year. Month must be 1-12, year must be between 2000-2100.');
  }

  // 2. Check if month has ended (unless force flag is set)
  const now = new Date();
  const firstDayOfNextMonth = new Date(year, month, 1); // JS Date month is 0-indexed
  const lastDayOfMonth = new Date(year, month, 0); // Last day of the target month

  if (now < firstDayOfNextMonth && !options?.force) {
    throw new Error(
      `Payroll for ${month}/${year} cannot be run before month ends (${lastDayOfMonth.toLocaleDateString()}). ` +
      `Current date: ${now.toLocaleDateString()}. Use force=true to override (not recommended).`
    );
  }

  // 3. Fetch all active employees (exclude HR users - they don't get payslips)
  const allEmployees = await Employee.find({ isActive: true });
  
  // Filter out HR-type employees (employeeId starts with 'HR')
  const employees = allEmployees.filter(emp => !emp.employeeId.startsWith('HR'));
  
  if (employees.length === 0) {
    throw new Error('No active employees found for payroll processing. (HR users are excluded from payroll)');
  }

  const results: IPayrollResult = {
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    warnings: [],
  };

  // Add warning if running before month end
  if (now < firstDayOfNextMonth && options?.force) {
    results.warnings?.push(
      `WARNING: Payroll generated before month end. Attendance data may be incomplete.`
    );
  }

  // ========== PROCESSING PHASE ==========
  // Process each employee independently (no transactions for better reliability)
  
  for (const employee of employees) {
    results.processed++;
    
    try {
      // Check for existing payslip (idempotency)
      const existingPayslip = await Payslip.findOne({
        employee: employee._id,
        month,
        year,
      });
      
      if (existingPayslip) {
        results.skipped++;
        continue;
      }

      // Fetch salary data
      const salary = await Salary.findOne({ employee: employee._id });

      // Aggregate daily attendance into monthly summary
      const attendance = await aggregateDailyAttendance(employee._id as Types.ObjectId, month, year);

      // Validate required data exists
      if (!salary) {
        throw new Error('Missing salary structure. Please configure salary first.');
      }
      
      if (!attendance) {
        throw new Error('Missing attendance data. Please upload attendance before generating payslips.');
      }
      
      if (!attendance.totalWorkingDays || attendance.totalWorkingDays <= 0) {
        throw new Error('Total working days must be greater than 0.');
      }
      
      if (attendance.daysPresent < 0 || attendance.daysPresent > attendance.totalWorkingDays) {
        throw new Error(`Invalid days present (${attendance.daysPresent}). Must be between 0 and ${attendance.totalWorkingDays}.`);
      }

      const {
        daysPresent,
        totalWorkingDays,
        variableEarnings,
        variableDeductions,
      } = attendance;
      
      const finalEarnings: IPayslipEarning[] = [];
      const finalDeductions: IPayslipDeduction[] = [];

      // --- CHECK: Pro-rata for mid-month joiners ---
      let proRataFactor = 1.0; // Default: full month
      const joiningDate = new Date(employee.joiningDate);
      const payrollMonthStart = new Date(year, month - 1, 1);
      const payrollMonthEnd = new Date(year, month, 0);

      // If employee joined during this payroll month, calculate pro-rata
      if (joiningDate >= payrollMonthStart && joiningDate <= payrollMonthEnd) {
        const daysInMonth = payrollMonthEnd.getDate();
        const daysEmployed = daysInMonth - joiningDate.getDate() + 1;
        proRataFactor = daysEmployed / daysInMonth;
        
        results.warnings?.push(
          `Employee ${employee.employeeId} joined mid-month (${joiningDate.toLocaleDateString()}). ` +
          `Salary pro-rated to ${(proRataFactor * 100).toFixed(1)}% (${daysEmployed}/${daysInMonth} days).`
        );
      }

      // --- A. Calculate FIXED Earnings (Prorated for LOP and mid-month joiners) ---
      for (const earning of salary.earnings) {
        // Apply both LOP proration and mid-month joiner proration
        const lopProratedAmount = (earning.amount / totalWorkingDays) * daysPresent;
        const finalAmount = lopProratedAmount * proRataFactor;
        
        finalEarnings.push({
          name: earning.name,
          amount: Math.round(finalAmount),
          type: 'fixed',
        });
      }

      // --- B. Add VARIABLE Earnings (from attendance file) ---
      for (const varEarning of variableEarnings) {
        const type = varEarning.name.toLowerCase().includes('reimbursement')
          ? 'reimbursement'
          : 'variable';
        finalEarnings.push({
          name: varEarning.name,
          amount: Math.round(varEarning.amount),
          type: type,
        });
      }

      // --- C. Calculate FIXED Deductions ---
      for (const deduction of salary.deductions) {
        let deductionAmount = 0;
        if (deduction.isPercent) {
          // Percentage-based deductions (e.g., PF = 12% of Basic)
          const basicEarning = finalEarnings.find(
            (e) => e.name === 'Basic' && e.type === 'fixed'
          );
          const basicAmount = basicEarning ? basicEarning.amount : 0;
          deductionAmount = basicAmount * ((deduction.amount || 0) / 100);
        } else {
          // Fixed deductions: prorate for both LOP and mid-month joiners
          const lopProratedAmount = ((deduction.amount || 0) / totalWorkingDays) * daysPresent;
          deductionAmount = lopProratedAmount * proRataFactor;
        }

        finalDeductions.push({
          name: deduction.name,
          amount: Math.round(deductionAmount),
          type: 'statutory',
        });
      }

      // --- D. Add VARIABLE Deductions (from attendance file) ---
      for (const varDeduction of variableDeductions) {
        finalDeductions.push({
          name: varDeduction.name,
          amount: Math.round(varDeduction.amount),
          type: 'other',
        });
      }

      // --- E. Final Totals ---
      const grossEarnings = finalEarnings.reduce((acc, e) => acc + e.amount, 0);
      const totalDeductions = finalDeductions.reduce((acc, d) => acc + d.amount, 0);
      const netPay = grossEarnings - totalDeductions;

      // Validate final amounts
      if (netPay < 0) {
        results.warnings?.push(
          `Employee ${employee.employeeId}: Negative net pay (${netPay}). Deductions exceed earnings.`
        );
      }

      const newPayslip = new Payslip({
        employee: employee._id,
        month,
        year,
        payrollInfo: {
          totalWorkingDays: totalWorkingDays,
          daysPaid: daysPresent,
          lopDays: attendance.leaveWithoutPay || 0,
        },
        earnings: finalEarnings,
        deductions: finalDeductions,
        grossEarnings: Math.round(grossEarnings),
        totalDeductions: Math.round(totalDeductions),
        netPay: Math.round(netPay),
        status: 'generated',
      });

      await newPayslip.save();
      results.success++;
      
    } catch (error) {
      // Catch individual employee processing errors
      results.failed++;
      const message = (error as Error).message;
      results.errors.push(`Employee ${employee.employeeId}: ${message}`);
      // Continue processing other employees
    }
  }

  // Log summary
  console.log(`Payroll generation complete. Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

  return results;
};

// --- HR Payslip Download Service ---
export const downloadEmployeePayslip = async (
  payslipId: string
): Promise<any> => {
  const payslip = await Payslip.findById(payslipId).populate<{
    employee: IEmployee;
  }>('employee');

  if (!payslip) {
    throw new Error('Payslip not found');
  }

  const doc = new PDFDocument();
  doc.fontSize(20).text('Payslip', { align: 'center' });
  doc.fontSize(12);
  doc.moveDown();
  doc.text(
    `Employee: ${payslip.employee.firstName} ${payslip.employee.lastName} (ID: ${payslip.employee.employeeId})`
  );
  doc.text(`Month: ${payslip.month}/${payslip.year}`);
  doc.moveDown();
  doc.text('--- Earnings ---');
  payslip.earnings.forEach((e) =>
    doc.text(`${e.name}: ${e.amount.toFixed(2)}`)
  );
  doc.moveDown();
  doc.text('--- Deductions ---');
  payslip.deductions.forEach((d) =>
    doc.text(`${d.name}: ${d.amount.toFixed(2)}`)
  );
  doc.moveDown();
  doc.fontSize(16).text(`Gross Earnings: ${payslip.grossEarnings.toFixed(2)}`);
  doc.fontSize(16).text(`Total Deductions: ${payslip.totalDeductions.toFixed(2)}`);
  doc.fontSize(16).text(`Net Pay: ${payslip.netPay.toFixed(2)}`);

  return doc;
};

// --- HR Password Reset Service ---
export const resetUserPassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  user.password = newPassword;
  await user.save();
};