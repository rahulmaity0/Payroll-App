// controllers/employee.controller.js
const EmployeeService = require('../services/employee.service');

// @desc    View all my payslips (can filter by year)
// @route   GET /api/employee/payslips
// @access  Private (Employee)
exports.viewMyPayslips = async (req, res) => {
  try {
    const payslips = await EmployeeService.getMyPayslips(
      req.user.employee,
      req.query
    );
    res.status(200).json(payslips);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    Download a specific payslip
// @route   GET /api/employee/payslips/:id/download
// @access  Private (Employee)
exports.downloadPayslip = async (req, res) => {
  try {
    const payslipId = req.params.id;
    const doc = await EmployeeService.downloadPayslip(req.user.employee, payslipId);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslipId}.pdf"`);

    // Pipe the PDF to the response
    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    View my attendance records (filter by year/month)
// @route   GET /api/employee/attendance
// @access  Private (Employee)
exports.viewMyAttendance = async (req, res) => {
  try {
    const attendance = await EmployeeService.getMyAttendance(
      req.user.employee,
      req.query
    );
    res.status(200).json(attendance);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    Download my attendance records as CSV
// @route   GET /api/employee/attendance/download
// @access  Private (Employee)
exports.downloadMyAttendance = async (req, res) => {
  try {
    const csv = await EmployeeService.downloadMyAttendance(
      req.user.employee,
      req.query
    );

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="attendance.csv"'
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};