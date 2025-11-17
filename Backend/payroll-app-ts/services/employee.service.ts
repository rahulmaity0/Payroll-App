// services/employee.service.ts
import Payslip, { IPayslip } from '../models/payslip.model';
import Attendance, { IAttendance } from '../models/attendance.model';
import { IEmployee } from '../models/employee.model';
import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';
import { Types } from 'mongoose';
import { ParsedQs } from 'qs'; // For typing req.query

// --- Payslip Services ---

export const getMyPayslips = async (
  employeeId: string | Types.ObjectId,
  query: ParsedQs
): Promise<IPayslip[]> => {
  const year = query.year ? parseInt(query.year as string) : null;

  // Define filter type
  const filter: { employee: string | Types.ObjectId; year?: number } = {
    employee: employeeId,
  };
  if (year) {
    filter.year = year;
  }

  const payslips = await Payslip.find(filter).sort({ year: -1, month: -1 });
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
  if (payslip.employee._id.toString() !== employeeId.toString()) {
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
  query: ParsedQs
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
  query: ParsedQs
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