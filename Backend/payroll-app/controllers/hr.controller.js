// controllers/hr.controller.js
const HRService = require('../services/hr.service');

// --- Employee Controllers ---

exports.onboardEmployee = async (req, res) => {
  try {
    const result = await HRService.onboardEmployee(req.body);
    res.status(201).json({
      message: 'Employee onboarded successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await HRService.getAllEmployees();
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await HRService.getEmployeeById(req.params.id);
    res.status(200).json(employee);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.updateEmployeeProfile = async (req, res) => {
  try {
    const updatedEmployee = await HRService.updateEmployeeProfile(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- Salary Controllers ---

exports.getSalaryDetails = async (req, res) => {
  try {
    const salary = await HRService.getSalaryDetails(req.params.id);
    res.status(200).json(salary);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.updateSalaryDetails = async (req, res) => {
  try {
    const updatedSalary = await HRService.updateSalaryDetails(
      req.params.id,
      req.body
    );
    res.status(200).json(updatedSalary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- Attendance Controllers ---

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const attendance = await HRService.getEmployeeAttendance(req.params.id);
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAttendanceRecord = async (req, res) => {
  try {
    const record = await HRService.createAttendanceRecord(req.body);
    res.status(201).json(record);
  } catch (error) {
    // Handle duplicate key error (MongoDB code 11000)
    if (error.message.includes('already exists') || error.code === 11000) {
      return res.status(400).json({ message: 'Attendance record already exists for this month.' });
    }
    res.status(400).json({ message: error.message });
  }
};

exports.updateAttendanceRecord = async (req, res) => {
  try {
    const updatedRecord = await HRService.updateAttendanceRecord(
      req.params.attId,
      req.body
    );
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.uploadPayroll = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    const result = await HRService.processPayrollUpload(req.file.path);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generatePayslips = async (req, res) => {
  try {
    const { month, year } = req.body;
    const result = await HRService.generatePayslips(month, year);
    res.status(200).json({
      message: `Payroll run for ${month}/${year} completed.`,
      ...result,
    });
  } catch (error) {
    // This catches errors like "Payroll run is not allowed yet"
    res.status(400).json({ message: error.message });
  }
};

exports.downloadPayslipForEmployee = async (req, res) => {
  try {
    const payslipId = req.params.id;
    // This calls a new service function
    const doc = await HRService.downloadEmployeePayslip(payslipId);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payslip-${payslipId}.pdf"`
    );

    // Pipe the PDF to the response
    doc.pipe(res);
    doc.end();
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};