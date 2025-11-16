// services/hr.service.js
const Employee = require('../models/employee.model');
const User = require('../models/user.model');
const Salary = require('../models/salary.model');
const Attendance = require('../models/attendance.model');
const Payslip = require('../models/payslip.model');
const fs = require('fs');
const csv = require('csv-parser');
const pdfkit = require('pdfkit');

// --- Employee Management ---

exports.onboardEmployee = async (data) => {
  const {
    email,
    password,
    firstName,
    lastName,
    employeeId,
    designation,
    joiningDate,
    personalEmail,
    annualCTC,
    ...otherDetails
  } = data;

  // 1. Check for duplicates
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error('User with this email already exists');
  
  const existingEmp = await Employee.findOne({ employeeId });
  if (existingEmp) throw new Error('Employee ID already exists');

  // 2. Create Employee
  const newEmployee = new Employee({
    employeeId,
    firstName,
    lastName,
    designation,
    joiningDate,
    personalEmail: personalEmail || email, // Fallback to login email
    ...otherDetails,
  });
  await newEmployee.save();

  // 3. Create User (Login)
  const newUser = new User({
    email,
    password, // Will be hashed by the model hook
    role: 'employee', // Default role is employee
    employee: newEmployee._id,
  });
  await newUser.save();

  // 4. Create Salary Structure (if CTC is provided)
  if (annualCTC) {
    // Auto-calculate basic breakdown (e.g., Basic is 50% of CTC)
    // In a real app, you might want more complex logic here
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
        { name: 'Provident Fund', amount: 1800, isPercent: false }, // Example fixed
        { name: 'Professional Tax', amount: 200, isPercent: false },
      ],
    });
    await newSalary.save();
  }

  return { employee: newEmployee, user: newUser };
};

exports.getAllEmployees = async () => {
  return await Employee.find({ isActive: true }).select('-__v');
};

exports.getEmployeeById = async (id) => {
  const employee = await Employee.findById(id);
  if (!employee) throw new Error('Employee not found');
  return employee;
};

exports.updateEmployeeProfile = async (id, data) => {
  const updated = await Employee.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new Error('Employee not found');
  return updated;
};

// --- Salary Management ---

exports.getSalaryDetails = async (employeeId) => {
  const salary = await Salary.findOne({ employee: employeeId });
  if (!salary) throw new Error('Salary details not found for this employee');
  return salary;
};

exports.updateSalaryDetails = async (employeeId, data) => {
  // Upsert: Update if exists, create if not
  const salary = await Salary.findOneAndUpdate(
    { employee: employeeId },
    { ...data, employee: employeeId }, // Ensure employee ID is set
    { new: true, upsert: true, runValidators: true }
  );
  return salary;
};

// --- Attendance Management ---

exports.getEmployeeAttendance = async (employeeId) => {
  return await Attendance.find({ employee: employeeId }).sort({ year: -1, month: -1 });
};

exports.createAttendanceRecord = async (data) => {
  // Check if record already exists for this month
  const exists = await Attendance.findOne({
    employee: data.employee,
    month: data.month,
    year: data.year,
  });
  if (exists) throw new Error('Attendance record already exists for this month');

  const attendance = new Attendance(data);
  return await attendance.save();
};

exports.updateAttendanceRecord = async (id, data) => {
  const updated = await Attendance.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error('Attendance record not found');
  return updated;
};

// ==========================================================
// --- REVAMPED: Bulk Upload Logic ---
// ==========================================================
exports.processPayrollUpload = async (filePath) => {
  const results = [];
  const errors = [];

  // Helper function to safely parse JSON from CSV
  const parseJsonColumn = (jsonString, rowIdentifier) => {
    if (!jsonString || jsonString.trim() === '[]' || jsonString.trim() === '') {
      return []; // Return empty array if column is empty
    }
    try {
      // The CSV standard for quotes is ""
      // We replace "" with " to make it valid JSON
      const validJsonString = jsonString.replace(/""/g, '"');
      return JSON.parse(validJsonString);
    } catch (e) {
      errors.push(`Invalid JSON format in row for ${rowIdentifier}: ${e.message}`);
      return null; // Return null to signify parsing error
    }
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        for (const row of results) {
          try {
            // Expected CSV Header: employeeId, month, year, totalDays, daysPresent, lop, overtimeHours, variableEarnings, variableDeductions
            const employee = await Employee.findOne({ employeeId: row.employeeId });
            if (!employee) {
              errors.push(`Employee ID ${row.employeeId} not found`);
              continue;
            }

            // Parse variable columns
            const varEarnings = parseJsonColumn(row.variableEarnings, row.employeeId);
            const varDeductions = parseJsonColumn(row.variableDeductions, row.employeeId);

            // If parsing failed, skip this row
            if (varEarnings === null || varDeductions === null) {
              continue; 
            }

            const attendanceData = {
              employee: employee._id,
              month: parseInt(row.month),
              year: parseInt(row.year),
              totalWorkingDays: parseInt(row.totalDays),
              daysPresent: parseInt(row.daysPresent),
              leaveWithoutPay: parseInt(row.lop || 0),
              overtimeHours: parseFloat(row.overtimeHours || 0),
              variableEarnings: varEarnings,       // ADDED
              variableDeductions: varDeductions, // ADDED
            };

            // Update or Insert (Upsert)
            await Attendance.findOneAndUpdate(
              { employee: employee._id, month: attendanceData.month, year: attendanceData.year },
              attendanceData,
              { upsert: true, new: true, runValidators: true } // Added runValidators
            );
          } catch (err) {
            errors.push(`Error processing row for ${row.employeeId}: ${err.message}`);
          }
        }
        
        fs.unlinkSync(filePath); // Cleanup file
        resolve({ message: 'Processing complete', errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

// ==========================================================
// --- REVAMPED: Payroll Generation Service ---
// ==========================================================
exports.generatePayslips = async (month, year) => {
  
  // --- Business Rule: Check if the month is over ---
  const now = new Date();
  // Get the first day of the *next* month (month is 0-indexed for Date object)
  const firstDayOfNextMonth = new Date(year, month, 1); 

  if (now < firstDayOfNextMonth) {
    throw new Error(`Payroll for ${month}/${year} can only be run on or after ${firstDayOfNextMonth.toLocaleDateString()}`);
  }

  // --- Start Payroll Run ---
  const employees = await Employee.find({ isActive: true });
  
  const results = {
    processed: 0,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const employee of employees) {
    results.processed++;
    try {
      // 1. Check if payslip already exists
      const existingPayslip = await Payslip.findOne({ employee: employee._id, month, year });
      if (existingPayslip) {
        results.skipped++;
        continue;
      }

      // 2. Get prerequisites for calculation
      const salary = await Salary.findOne({ employee: employee._id });
      const attendance = await Attendance.findOne({ employee: employee._id, month, year });

      // 3. Validate prerequisites
      if (!salary) throw new Error('Missing salary structure.');
      if (!attendance) throw new Error('Missing attendance data (run upload first).');
      if (attendance.totalWorkingDays <= 0) throw new Error('Total working days must be > 0.');

      // 4. --- Perform Calculation (Revamped) ---
      const finalEarnings = [];
      const finalDeductions = [];

      const { daysPresent, totalWorkingDays, variableEarnings, variableDeductions } = attendance;

      // --- A. Calculate FIXED Earnings (Prorated for LOP) ---
      for (const earning of salary.earnings) {
        const proratedAmount = (earning.amount / totalWorkingDays) * daysPresent;
        finalEarnings.push({
          name: earning.name,
          amount: Math.round(proratedAmount),
          type: 'fixed',
        });
      }
      
      // --- B. Add VARIABLE Earnings (from attendance file) ---
      for (const varEarning of variableEarnings) {
        const type = varEarning.name.toLowerCase().includes('reimbursement') ? 'reimbursement' : 'variable';
        finalEarnings.push({
          name: varEarning.name,
          amount: Math.round(varEarning.amount),
          type: type,
        });
      }

      // --- C. Calculate FIXED Deductions (Prorated if based on Basic) ---
      for (const deduction of salary.deductions) {
        let deductionAmount = 0;
        if (deduction.isPercent) {
          // Find the "Basic" earning from the *final* calculated earnings
          const basicEarning = finalEarnings.find(e => e.name === 'Basic' && e.type === 'fixed');
          const basicAmount = basicEarning ? basicEarning.amount : 0;
          deductionAmount = (basicAmount * (deduction.amount / 100));
        } else {
          // Prorate fixed deductions based on days paid as well
          deductionAmount = (deduction.amount / totalWorkingDays) * daysPresent;
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
          type: 'other', // e.g., 'Loan Repayment'
        });
      }
      
      // --- E. Final Totals ---
      const grossEarnings = finalEarnings.reduce((acc, e) => acc + e.amount, 0);
      const totalDeductions = finalDeductions.reduce((acc, d) => acc + d.amount, 0);
      const netPay = grossEarnings - totalDeductions;

      // 5. Create the Payslip Snapshot
      const newPayslip = new Payslip({
        employee: employee._id,
        month,
        year,
        payrollInfo: {
          totalWorkingDays: totalWorkingDays,
          daysPaid: daysPresent,
          lopDays: attendance.leaveWithoutPay,
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
      results.failed++;
      results.errors.push(`Employee ${employee.employeeId}: ${error.message}`);
    }
  }

  return results;
};

// --- HR Payslip Download Service ---

/**
 * Fetches and generates a PDF for a single payslip by its ID.
 * This version is for HR and does not check for ownership.
 */
exports.downloadEmployeePayslip = async (payslipId) => {
  const payslip = await Payslip.findById(payslipId).populate('employee');

  // 1. Check if payslip exists
  if (!payslip) {
    throw new Error('Payslip not found');
  }

  // 2. Generate PDF (same logic as employee service)
  const doc = new pdfkit();
  doc.fontSize(20).text('Payslip', { align: 'center' });
  doc.fontSize(12);
  doc.moveDown();
  doc.text(`Employee: ${payslip.employee.firstName} ${payslip.employee.lastName} (ID: ${payslip.employee.employeeId})`);
  doc.text(`Month: ${payslip.month}/${payslip.year}`);
  doc.moveDown();
  doc.text('--- Earnings ---');
  payslip.earnings.forEach((e) => doc.text(`${e.name}: ${e.amount.toFixed(2)}`));
  doc.moveDown();
  doc.text('--- Deductions ---');
  payslip.deductions.forEach((d) => doc.text(`${d.name}: ${d.amount.toFixed(2)}`));
  doc.moveDown();
  doc.fontSize(16).text(`Gross Earnings: ${payslip.grossEarnings.toFixed(2)}`);
  doc.fontSize(16).text(`Total Deductions: ${payslip.totalDeductions.toFixed(2)}`);
  doc.fontSize(16).text(`Net Pay: ${payslip.netPay.toFixed(2)}`);

  return doc; // Return the PDF document stream
};

// --- HR Password Reset Service ---

/**
 * Allows HR to reset a password for any user.
 * This does not require the old password.
 */
exports.resetUserPassword = async (userId, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Set the new password
  user.password = newPassword;
  
  // Save the user. The pre-save hook will hash it.
  await user.save();
};