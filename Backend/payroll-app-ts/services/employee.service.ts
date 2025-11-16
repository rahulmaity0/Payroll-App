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

export const downloadPayslip = async (
  employeeId: string | Types.ObjectId,
  payslipId: string
): Promise<PDFDocument> => {
  // Use a generic to type the populated 'employee' field
  const payslip = await Payslip.findById(payslipId).populate<{
    employee: IEmployee;
  }>('employee');

  // Business Logic Validation:
  if (!payslip) {
    throw new Error('Payslip not found');
  }
  // Use .toString() for safe comparison of ObjectIds
  if (payslip.employee._id.toString() !== employeeId.toString()) {
    throw new Error('You are not authorized to view this payslip');
  }

  // Generate PDF
  const doc = new PDFDocument();
  doc.fontSize(20).text('Payslip', { align: 'center' });
  doc.fontSize(12);
  doc.moveDown();
  doc.text(
    `Employee: ${payslip.employee.firstName} ${payslip.employee.lastName}`
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
  doc.fontSize(16).text(`Net Pay: ${payslip.netPay.toFixed(2)}`);

  return doc; // Return the PDF document stream
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