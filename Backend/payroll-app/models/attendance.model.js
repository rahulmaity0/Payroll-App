// models/attendance.model.js
const mongoose = require('mongoose');

// --- NEW: Sub-schemas for variable inputs ---
const variableEarningSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Performance Bonus", "Internet Reimbursement"
  amount: { type: Number, required: true }
});

const variableDeductionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Salary Advance", "Loan Repayment"
  amount: { type: Number, required: true }
});

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: {
      type: Number, // 1 for Jan, 12 for Dec
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number, // e.g., 2025
      required: true,
    },

    // --- Core Attendance Data ---
    totalWorkingDays: {
      type: Number, // Total business days in the month
      required: true,
    },
    daysPresent: {
      type: Number, // Days employee was present (or paid leave)
      required: true,
    },
    leaveWithoutPay: {
      type: Number, // LWP / LOP days
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },

    // --- UPDATED: Flexible Monthly Payroll Inputs ---
    variableEarnings: [variableEarningSchema],
    variableDeductions: [variableDeductionSchema],
  },
  {
    timestamps: true,
  }
);

// Create a compound unique index to prevent duplicate entries
attendanceSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// Model 'Attendance', collection 'attendance_details'
const Attendance = mongoose.model(
  'Attendance',
  attendanceSchema,
  'attendance_details'
);
module.exports = Attendance;