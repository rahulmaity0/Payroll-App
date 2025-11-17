// services/employee.service.ts
import Payslip, { IPayslip } from '../models/payslip.model';
import Attendance, { IAttendance } from '../models/attendance.model';
import DailyAttendance, { IDailyAttendance } from '../models/dailyAttendance.model';
import Employee, { IEmployee } from '../models/employee.model';
import Salary, { ISalary } from '../models/salary.model';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { Types } from 'mongoose';
import { ParsedQs } from 'qs'; // For typing req.query

// --- Profile Services ---

// Get my complete profile with salary breakdown
export const getMyProfileWithSalary = async (
  employeeId: string | Types.ObjectId
): Promise<any> => {
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    throw new Error('Employee profile not found');
  }

  // Fetch salary details
  const salary = await Salary.findOne({ employee: employeeId }).lean();

  return {
    ...employee,
    salary: salary || null,
  };
};

// Update my profile (employee-editable fields only)
export const updateMyProfile = async (
  employeeId: string | Types.ObjectId,
  updateData: any
): Promise<IEmployee> => {
  // Define which fields an employee can update
  const allowedUpdates: string[] = [
    'personalEmail',
    'phone',
    'address',
    'bankDetails',
    'dob',
  ];

  // Filter updateData to only include allowed fields
  const updates: Record<string, any> = {};
  for (const key in updateData) {
    if (allowedUpdates.includes(key)) {
      updates[key] = updateData[key];
    }
  }

  // Update the employee record
  const updatedEmployee = await Employee.findByIdAndUpdate(
    employeeId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedEmployee) {
    throw new Error('Employee not found during update');
  }
  return updatedEmployee;
};

// --- Payslip Services ---

export const getMyPayslips = async (
  employeeId: string | Types.ObjectId,
  query: any
): Promise<any[]> => {
  const year = query.year ? parseInt(query.year as string) : null;

  // Define filter type
  const filter: { employee: string | Types.ObjectId; year?: number } = {
    employee: employeeId,
  };
  if (year) {
    filter.year = year;
  }

  const payslips = await Payslip.find(filter)
    .populate('employee', 'employeeId firstName lastName designation')
    .sort({ year: -1, month: -1 })
    .lean();
  return payslips;
};

// --- Get Payslip Details Service (for frontend PDF generation) ---
export const getPayslipDetails = async (
  employeeId: string | Types.ObjectId,
  payslipId: string
): Promise<any> => {
  const payslip = await Payslip.findById(payslipId)
    .populate<{ employee: IEmployee }>('employee')
    .lean();

  if (!payslip) {
    throw new Error('Payslip not found');
  }

  // Authorization: ensure the payslip belongs to the requesting employee
  if ((payslip.employee as any)._id.toString() !== employeeId.toString()) {
    throw new Error('Unauthorized access to payslip');
  }

  // Return complete payslip data for frontend PDF generation
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

// --- Attendance Services ---

export const getMyAttendance = async (
  employeeId: string | Types.ObjectId,
  query: any
): Promise<IAttendance[]> => {
  const { year, month } = query;
  
  const filter: {
    employee: string | Types.ObjectId;
    year?: number;
    month?: number;
  } = { employee: employeeId };

  if (year) filter.year = parseInt(year as string);
  if (month) filter.month = parseInt(month as string);

  const attendance = await Attendance.find(filter).sort({ year: -1, month: -1 });
  return attendance;
};

export const downloadMyAttendance = async (
  employeeId: string | Types.ObjectId,
  query: any
): Promise<string> => {
  const attendanceData = await getMyAttendance(employeeId, query);

  if (attendanceData.length === 0) {
    throw new Error('No attendance data found for this period.');
  }

  // Define CSV fields
  const fields = [
    'month',
    'year',
    'totalWorkingDays',
    'daysPresent',
    'leaveWithoutPay',
    'overtimeHours',
    // We could even stringify the variable fields if needed
  ];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(attendanceData);

  return csv;
};

// --- Daily Attendance Services (Employee Self-Service) ---

// Get my daily attendance records
export const getMyDailyAttendance = async (
  employeeId: string | Types.ObjectId,
  query: any
): Promise<IDailyAttendance[]> => {
  const { year, month } = query;
  
  let dateFilter: any = {};
  
  // Build date range filter
  if (year && month) {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;
    dateFilter = { $gte: startDate, $lte: endDate };
  } else if (year) {
    dateFilter = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
  }

  const filter: any = { employee: employeeId };
  if (Object.keys(dateFilter).length > 0) {
    filter.date = dateFilter;
  }

  return await DailyAttendance.find(filter).sort({ date: 1 });
};

// Create or update my daily attendance (self-mark)
export const markMyAttendance = async (
  employeeId: string | Types.ObjectId,
  data: Partial<IDailyAttendance>
): Promise<IDailyAttendance> => {
  const { date, status, checkIn, checkOut, hoursWorked, notes } = data;

  // Validate required fields
  if (!date || !status) {
    throw new Error('Date and status are required');
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Date must be in YYYY-MM-DD format');
  }

  // Validate status is allowed (employee cannot mark holidays/week-offs)
  const allowedStatuses = ['P', 'A', 'LOP', 'PL'];
  if (!allowedStatuses.includes(status)) {
    throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  // Upsert: Update if exists for this date, create if not
  const record = await DailyAttendance.findOneAndUpdate(
    { employee: employeeId, date },
    {
      employee: employeeId,
      date,
      status,
      checkIn,
      checkOut,
      hoursWorked,
      notes,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  );

  return record;
};

// Update my existing daily attendance record
export const updateMyDailyAttendance = async (
  employeeId: string | Types.ObjectId,
  recordId: string,
  data: Partial<IDailyAttendance>
): Promise<IDailyAttendance> => {
  // First verify the record belongs to this employee
  const existingRecord = await DailyAttendance.findById(recordId);
  
  if (!existingRecord) {
    throw new Error('Attendance record not found');
  }

  if (existingRecord.employee.toString() !== employeeId.toString()) {
    throw new Error('Unauthorized: This attendance record does not belong to you');
  }

  // Validate status if provided
  if (data.status) {
    const allowedStatuses = ['P', 'A', 'LOP', 'PL'];
    if (!allowedStatuses.includes(data.status)) {
      throw new Error(`Status must be one of: ${allowedStatuses.join(', ')}`);
    }
  }

  // Only allow updating specific fields
  const allowedFields = ['status', 'checkIn', 'checkOut', 'hoursWorked', 'notes'];
  const updates: Partial<IDailyAttendance> = {};
  
  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key)) {
      (updates as any)[key] = (data as any)[key];
    }
  }

  const updated = await DailyAttendance.findByIdAndUpdate(
    recordId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new Error('Failed to update attendance record');
  }

  return updated;
};

// Delete my daily attendance record
export const deleteMyDailyAttendance = async (
  employeeId: string | Types.ObjectId,
  recordId: string
): Promise<{ message: string }> => {
  // First verify the record belongs to this employee
  const record = await DailyAttendance.findById(recordId);
  
  if (!record) {
    throw new Error('Attendance record not found');
  }

  if (record.employee.toString() !== employeeId.toString()) {
    throw new Error('Unauthorized: This attendance record does not belong to you');
  }

  await DailyAttendance.findByIdAndDelete(recordId);
  
  return { message: 'Attendance record deleted successfully' };
};

// Download my daily attendance as CSV
export const downloadMyDailyAttendance = async (
  employeeId: string | Types.ObjectId,
  query: any
): Promise<string> => {
  const records = await getMyDailyAttendance(employeeId, query);

  if (records.length === 0) {
    throw new Error('No daily attendance records found for this period');
  }

  // Convert to plain objects for CSV
  const data = records.map((r: any) => ({
    date: r.date,
    status: r.status,
    checkIn: r.checkIn || '',
    checkOut: r.checkOut || '',
    hoursWorked: r.hoursWorked || 0,
    overtimeHours: r.overtimeHours || 0,
    notes: r.notes || '',
  }));

  const fields = ['date', 'status', 'checkIn', 'checkOut', 'hoursWorked', 'overtimeHours', 'notes'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);

  return csv;
};