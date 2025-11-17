// services/hr.service.ts
import Employee, { IEmployee } from '../models/employee.model';
import User, { IUser } from '../models/user.model';
import Salary, { ISalary } from '../models/salary.model';
import Attendance, { IAttendance } from '../models/attendance.model';
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
// --- MONTHLY ATTENDANCE SERVICES (LEGACY) ---
// ==========================================================

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
  if (exists) {
    throw new Error('Attendance record already exists for this month');
  }
  const attendance = new Attendance(data);
  return await attendance.save();
};

export const updateAttendanceRecord = async (
  id: string,
  data: Partial<IAttendance>
): Promise<IAttendance> => {
  const updated = await Attendance.findByIdAndUpdate(id, data, { new: true });
  if (!updated) {
    throw new Error('Attendance record not found');
  }
  return updated;
};

export const deleteAttendanceRecord = async (
  id: string
): Promise<{ message: string }> => {
  const deleted = await Attendance.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Attendance record not found');
  }
  return { message: 'Attendance record deleted successfully' };
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
// PERFORMANCE OPTIMIZATIONS:
// 1. Single bulk employee lookup instead of N queries
// 2. In-memory employee cache (Map lookups are O(1))
// 3. Bulk fetch of existing attendance records
// 4. MongoDB bulkWrite for batch inserts/updates
// 5. Reduced DB round-trips from ~3N to 3 queries total
// 
// For 1000 records: ~3000+ queries → 3 queries
// Expected performance: 10-15s → <1-2s on free tier
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

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        try {
          const mode = options?.mode || (results[0] && Object.keys(results[0]).some((k) => k.toLowerCase() === 'date') ? 'daily' : 'monthly');
          const action = options?.action || 'preview';
          const dedupe = options?.dedupeStrategy || 'skip';

          let processed = 0;
          let success = 0;
          let skipped = 0;
          let failed = 0;

          // OPTIMIZATION 1: Fetch all employees once and create lookup maps
          const allEmployees = await Employee.find({}).select('_id employeeId personalEmail').lean();
          const empByEmployeeId = new Map(allEmployees.map(e => [e.employeeId, e]));
          const empByPersonalEmail = new Map(allEmployees.filter(e => e.personalEmail).map(e => [e.personalEmail!.toLowerCase(), e]));

          // OPTIMIZATION 2: Normalize and validate all rows first
          const normalizedRows: any[] = [];
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            processed++;
            const rowNum = i + 2; // header is row 1

            // Normalize keys
            const r: { [k: string]: any } = {};
            for (const key of Object.keys(row)) {
              r[key.trim().toLowerCase()] = row[key];
            }

            // Determine employee by employeeId or email
            const empKey = r['employeeid'] || r['employee_id'] || r['emp_id'] || r['email'];
            if (!empKey) {
              errors.push(`Row ${rowNum}: Missing employeeId or email`);
              failed++;
              continue;
            }

            // Lookup employee from cache
            let employee = null as any;
            const empKeyStr = empKey.toString();
            if (empKeyStr.includes('@')) {
              employee = empByPersonalEmail.get(empKeyStr.toLowerCase());
            } else {
              employee = empByEmployeeId.get(empKeyStr);
            }

            if (!employee) {
              errors.push(`Row ${rowNum}: Employee ${empKey} not found`);
              failed++;
              continue;
            }

            normalizedRows.push({ r, employee, rowNum });
          }

          // OPTIMIZATION 4: For daily mode, fetch existing records in bulk
          const employeeIds = normalizedRows.map(nr => nr.employee._id);
          const dates = normalizedRows.map(nr => nr.r['date']).filter(Boolean);

          let existingDailyAttendance: any[] = [];
          if (action !== 'preview') {
            existingDailyAttendance = await DailyAttendance.find({
              employee: { $in: employeeIds },
              date: { $in: dates }
            }).lean();
          }

          const existingDailyMap = new Map(
            existingDailyAttendance.map(a => [`${a.employee}_${a.date}`, a])
          );

          // Process daily attendance
          const bulkOps: any[] = [];
          const toDelete: any[] = [];
          const validStatuses = ['P', 'A', 'LOP', 'PL', 'H', 'WO'];

          for (const { r, employee, rowNum } of normalizedRows) {
            try {
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

              const dailyData: any = {
                employee: employee._id,
                date: dateStr,
                status: statusVal,
                checkIn,
                checkOut,
                hoursWorked,
                overtimeHours,
                notes,
              };

              const key = `${employee._id}_${dateStr}`;
              const existing = existingDailyMap.get(key);

              if (action === 'overwrite') {
                if (existing) {
                  toDelete.push({ employee: employee._id, date: dateStr });
                }
                bulkOps.push({
                  updateOne: {
                    filter: { employee: employee._id, date: dateStr },
                    update: { $set: dailyData },
                    upsert: true
                  }
                });
                success++;
              } else if (existing) {
                if (dedupe === 'skip') {
                  skipped++;
                  continue;
                } else if (dedupe === 'error') {
                  errors.push(`Row ${rowNum}: Daily attendance already exists for employee ${employee.employeeId} on ${dateStr}`);
                  failed++;
                  continue;
                } else if (dedupe === 'update') {
                  bulkOps.push({
                    updateOne: {
                      filter: { employee: employee._id, date: dateStr },
                      update: { $set: dailyData }
                    }
                  });
                  success++;
                }
              } else {
                bulkOps.push({
                  updateOne: {
                    filter: { employee: employee._id, date: dateStr },
                    update: { $set: dailyData },
                    upsert: true
                  }
                });
                success++;
              }
            } catch (err) {
              const message = (err as Error).message;
              errors.push(`Row ${rowNum}: Error processing: ${message}`);
              failed++;
            }
          }

          // Execute bulk operations
          if (toDelete.length > 0) {
            await DailyAttendance.deleteMany({
              $or: toDelete
            });
          }

          if (bulkOps.length > 0) {
            await DailyAttendance.bulkWrite(bulkOps, { ordered: false });
          }
          
          // ========== AUTO-FILL MISSING DATES ==========
          // For daily mode with actual data upload (not preview), auto-fill missing weekdays as absent
          if (mode === 'daily' && action !== 'preview') {
            const monthVal = options?.month;
            const yearVal = options?.year;
            
            // If month/year are provided or can be detected from uploaded data
            if (monthVal && yearVal) {
              // Get all employees from uploaded data
              const uploadedEmployeeIds = [...new Set(normalizedRows.map(nr => nr.employee._id))];
              
              // Calculate all working days (Mon-Fri) in the month
              const firstDayOfMonth = new Date(yearVal, monthVal - 1, 1);
              const lastDayOfMonth = new Date(yearVal, monthVal, 0);
              
              const workingDates: string[] = [];
              for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
                  const dateStr = `${yearVal}-${String(monthVal).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  workingDates.push(dateStr);
                }
              }
              
              // For each employee in the upload, check for missing dates
              for (const empId of uploadedEmployeeIds) {
                // Get all dates that employee has records for in this month
                const employeeRecords = await DailyAttendance.find({
                  employee: empId,
                  date: { 
                    $gte: `${yearVal}-${String(monthVal).padStart(2, '0')}-01`,
                    $lte: `${yearVal}-${String(monthVal).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`
                  }
                }).select('date').lean();
                
                const existingDates = new Set(employeeRecords.map(r => r.date));
                const missingDates = workingDates.filter(date => !existingDates.has(date));
                
                // Auto-fill missing dates with Absent status
                if (missingDates.length > 0) {
                  const missingRecords = missingDates.map(date => ({
                    employee: empId,
                    date: date,
                    status: 'A',
                    notes: 'Auto-marked absent (missing from upload)'
                  }));
                  
                  await DailyAttendance.insertMany(missingRecords, { ordered: false });
                  
                  // Find employee details for warning message
                  const emp = normalizedRows.find(nr => nr.employee._id.equals(empId))?.employee;
                  if (emp) {
                    errors.push(`Auto-filled: Employee ${emp.employeeId} - marked ${missingDates.length} missing day(s) as absent`);
                  }
                }
              }
            }
          }

          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // ignore
          }

          resolve({
            message: 'Processing complete',
            mode: mode,
            action: options?.action || 'preview',
            processed,
            success,
            skipped,
            failed,
            errors,
          });
        } catch (error) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // ignore
          }
          reject(error);
        }
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

  return {
    totalWorkingDays,
    daysPresent,
    leaveWithoutPay,
    overtimeHours: totalOvertimeHours,
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
  const allEmployees = await Employee.find({ isActive: true }).lean();
  
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

  // ========== OPTIMIZATION: BULK DATA FETCH ==========
  
  const employeeIds = employees.map(e => (e._id as any));
  
  // Check for existing payslips in one query
  const existingPayslips = await Payslip.find({
    employee: { $in: employeeIds },
    month,
    year,
  }).lean();
  
  const existingPayslipMap = new Map(
    existingPayslips.map(p => [p.employee.toString(), p])
  );
  
  // Fetch all salary structures in one query
  const allSalaries = await Salary.find({
    employee: { $in: employeeIds }
  }).lean();
  
  const salaryMap = new Map(
    allSalaries.map(s => [s.employee.toString(), s])
  );
  
  // Fetch all daily attendance records for the month in one query
  const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0);
  const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  
  const allDailyRecords = await DailyAttendance.find({
    employee: { $in: employeeIds },
    date: { $gte: startDateStr, $lte: endDateStr }
  }).lean();
  
  // Group daily records by employee
  const dailyRecordsByEmployee = new Map<string, any[]>();
  for (const record of allDailyRecords) {
    const empId = record.employee.toString();
    if (!dailyRecordsByEmployee.has(empId)) {
      dailyRecordsByEmployee.set(empId, []);
    }
    dailyRecordsByEmployee.get(empId)!.push(record);
  }

  // ========== PROCESSING PHASE ==========
  // Process each employee with pre-fetched data
  
  const payslipsToCreate: any[] = [];
  
  for (const employee of employees) {
    results.processed++;
    const empId = (employee._id as any).toString();
    
    try {
      // Check for existing payslip from cache
      if (existingPayslipMap.has(empId)) {
        results.skipped++;
        continue;
      }

      // Fetch salary from cache
      const salary = salaryMap.get(empId);
      
      // Aggregate daily attendance from cached records
      const dailyRecords = dailyRecordsByEmployee.get(empId) || [];
      
      let attendance = null;
      // Always calculate attendance, even if no records exist
      // Calculate total working days (weekdays Mon-Fri only, excluding Sat/Sun)
      const firstDayOfMonth = new Date(year, month - 1, 1);
      const lastDayOfMonth = new Date(year, month, 0);
      
      let totalWorkingDays = 0;
      for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
          totalWorkingDays++;
        }
      }
      
      let daysPresent = 0;
      let leaveWithoutPay = 0;
      let totalOvertimeHours = 0;
      
      // Count existing records
      for (const record of dailyRecords) {
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
      
      attendance = {
        totalWorkingDays,
        daysPresent,
        leaveWithoutPay,
        overtimeHours: totalOvertimeHours,
      };

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

      // Use attendance values directly (already calculated above)
      const finalEarnings: IPayslipEarning[] = [];
      const finalDeductions: IPayslipDeduction[] = [];

      // --- CHECK: Pro-rata for mid-month joiners ---
      let proRataFactor = 1; // Default: full month
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
        const lopProratedAmount = (earning.amount / attendance.totalWorkingDays) * attendance.daysPresent;
        const finalAmount = lopProratedAmount * proRataFactor;
        
        finalEarnings.push({
          name: earning.name,
          amount: Math.round(finalAmount),
          type: 'fixed',
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
          const lopProratedAmount = ((deduction.amount || 0) / attendance.totalWorkingDays) * attendance.daysPresent;
          deductionAmount = lopProratedAmount * proRataFactor;
        }

        finalDeductions.push({
          name: deduction.name,
          amount: Math.round(deductionAmount),
          type: 'statutory',
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

      payslipsToCreate.push({
        employee: employee._id,
        month,
        year,
        payrollInfo: {
          totalWorkingDays: attendance.totalWorkingDays,
          daysPaid: attendance.daysPresent,
          lopDays: attendance.leaveWithoutPay || 0,
        },
        earnings: finalEarnings,
        deductions: finalDeductions,
        grossEarnings: Math.round(grossEarnings),
        totalDeductions: Math.round(totalDeductions),
        netPay: Math.round(netPay),
        status: 'generated',
      });

      results.success++;
      
    } catch (error) {
      // Catch individual employee processing errors
      results.failed++;
      const message = (error as Error).message;
      results.errors.push(`Employee ${employee.employeeId}: ${message}`);
      // Continue processing other employees
    }
  }
  
  // Bulk insert all payslips at once
  if (payslipsToCreate.length > 0) {
    await Payslip.insertMany(payslipsToCreate, { ordered: false });
  }

  // Log summary
  console.log(`Payroll generation complete. Success: ${results.success}, Failed: ${results.failed}, Skipped: ${results.skipped}`);

  return results;
};

// --- HR Payslip Viewing Services ---

// Get all payslips with optional filters
export const getAllPayslips = async (
  filters?: { year?: number; month?: number; employeeId?: string }
): Promise<any[]> => {
  const query: any = {};
  
  if (filters?.year) query.year = filters.year;
  if (filters?.month) query.month = filters.month;
  if (filters?.employeeId) query.employee = filters.employeeId;
  
  return await Payslip.find(query)
    .populate('employee', 'employeeId firstName lastName designation')
    .sort({ year: -1, month: -1 })
    .lean();
};

// Get all payslips for a specific employee
export const getEmployeePayslips = async (
  employeeId: string,
  filters?: { year?: number; month?: number }
): Promise<any[]> => {
  const query: any = { employee: employeeId };
  
  if (filters?.year) query.year = filters.year;
  if (filters?.month) query.month = filters.month;
  
  return await Payslip.find(query)
    .populate('employee', 'employeeId firstName lastName designation')
    .sort({ year: -1, month: -1 })
    .lean();
};

// --- Get Employee Payslip Details Service (for frontend PDF generation) ---
export const getEmployeePayslipDetails = async (
  payslipId: string
): Promise<any> => {
  const payslip = await Payslip.findById(payslipId)
    .populate<{ employee: IEmployee }>('employee')
    .lean();

  if (!payslip) {
    throw new Error('Payslip not found');
  }

  // Return complete payslip data with full breakdown for frontend PDF generation
  return {
    _id: payslip._id,
    employee: {
      employeeId: payslip.employee.employeeId,
      firstName: payslip.employee.firstName,
      lastName: payslip.employee.lastName,
      designation: payslip.employee.designation,
      department: payslip.employee.department,
      bankDetails: payslip.employee.bankDetails,
      taxInfo: payslip.employee.taxInfo,
    },
    month: payslip.month,
    year: payslip.year,
    generatedOn: payslip.generatedOn,
    payrollInfo: {
      totalWorkingDays: payslip.payrollInfo.totalWorkingDays,
      daysPaid: payslip.payrollInfo.daysPaid,
      lopDays: payslip.payrollInfo.lopDays,
    },
    earnings: payslip.earnings.map(e => ({
      name: e.name,
      amount: e.amount,
      type: e.type,
    })),
    deductions: payslip.deductions.map(d => ({
      name: d.name,
      amount: d.amount,
      type: d.type,
    })),
    grossEarnings: payslip.grossEarnings,
    totalDeductions: payslip.totalDeductions,
    netPay: payslip.netPay,
    status: payslip.status,
    paymentDate: payslip.paymentDate,
  };
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