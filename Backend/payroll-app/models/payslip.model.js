// models/payslip.model.js
const mongoose = require('mongoose');

// Sub-document for earnings on the final payslip
const payslipEarningSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['fixed', 'variable', 'reimbursement'],
    // 'fixed': From salary structure (e.g., Basic, HRA)
    // 'variable': Month-specific (e.g., "Annual Bonus", "Overtime Pay")
    // 'reimbursement': (e.g., "Internet Bill")
    default: 'fixed',
  },
});

// Sub-document for deductions on the final payslip
const payslipDeductionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['statutory', 'tax', 'lop', 'other'],
    // 'statutory': (e.g., "Provident Fund")
    // 'tax': (e.g., "Income Tax (TDS)")
    // 'lop': (e.g., "Loss of Pay")
    // 'other': (e.g., "Loan Repayment")
    default: 'statutory',
  },
});

const payslipSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    generatedOn: { type: Date, default: Date.now },

    // --- Input Summary ---
    // Stores the variables used for this month's calculation
    payrollInfo: {
      totalWorkingDays: { type: Number, required: true },
      daysPaid: { type: Number, required: true },
      lopDays: { type: Number, default: 0 }, // Loss of Pay days
    },
    
    // --- Calculation Snapshot ---
    
    // All positive amounts
    earnings: [payslipEarningSchema], 
    
    // All negative amounts
    deductions: [payslipDeductionSchema], 

    // --- Final Totals ---
    
    grossEarnings: { 
      type: Number, 
      required: true,
      // Total of all earnings (fixed + variable + reimbursements)
      // This is the value *after* LOP is applied to fixed components
    },
    totalDeductions: {
      type: Number,
      required: true,
    },
    netPay: {
      type: Number,
      required: true,
      // This is (grossEarnings - totalDeductions)
    },
    
    status: {
      type: String,
      enum: ['pending', 'paid', 'generated'],
      default: 'generated',
    },
    paymentDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Payslip = mongoose.model('Payslip', payslipSchema, 'payslips');
module.exports = Payslip;