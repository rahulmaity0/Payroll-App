// services/employee.service.js
const Payslip = require('../models/payslip.model');
const Attendance = require('../models/attendance.model');
const pdfkit = require('pdfkit');
const { Parser } = require('json2csv');

// --- Payslip Services ---

exports.getMyPayslips = async (employeeId, query) => {
  const year = query.year ? parseInt(query.year) : null;

  const filter = { employee: employeeId };
  if (year) {
    filter.year = year;
  }

  const payslips = await Payslip.find(filter).sort({ year: -1, month: -1 });
  return payslips;
};

exports.downloadPayslip = async (employeeId, payslipId) => {
  const payslip = await Payslip.findById(payslipId).populate('employee');

  // Business Logic Validation:
  // 1. Check if payslip exists
  if (!payslip) {
    throw new Error('Payslip not found');
  }
  // 2. Check if the payslip belongs to the user requesting it
  if (payslip.employee._id.toString() !== employeeId) {
    throw new Error('You are not authorized to view this payslip');
  }

  // Generate PDF
  const doc = new pdfkit();
  doc.fontSize(20).text('Payslip', { align: 'center' });
  doc.fontSize(12);
  doc.moveDown();
  doc.text(`Employee: ${payslip.employee.firstName} ${payslip.employee.lastName}`);
  doc.text(`Month: ${payslip.month}/${payslip.year}`);
  doc.moveDown();
  doc.text('--- Earnings ---');
  payslip.earnings.forEach((e) => doc.text(`${e.name}: $${e.amount}`));
  doc.moveDown();
  doc.text('--- Deductions ---');
  payslip.deductions.forEach((d) => doc.text(`${d.name}: $${d.amount}`));
  doc.moveDown();
  doc.fontSize(16).text(`Net Pay: $${payslip.netPay}`);

  return doc; // Return the PDF document stream
};

// --- Attendance Services ---

exports.getMyAttendance = async (employeeId, query) => {
  const { year, month } = query;
  const filter = { employee: employeeId };

  if (year) filter.year = parseInt(year);
  if (month) filter.month = parseInt(month);

  const attendance = await Attendance.find(filter).sort({ year: -1, month: -1 });
  return attendance;
};

exports.downloadMyAttendance = async (employeeId, query) => {
  const attendanceData = await this.getMyAttendance(employeeId, query);
  
  if (attendanceData.length === 0) {
    throw new Error('No attendance data found for this period.');
  }

  // Define CSV fields
  const fields = ['month', 'year', 'totalWorkingDays', 'daysPresent', 'leaveWithoutPay'];
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(attendanceData);

  return csv;
};