// models/salary.model.js
const mongoose = require('mongoose');

// Sub-document for individual earning components
const earningSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    // e.g., "Basic", "HRA", "Special Allowance"
  },
  amount: { 
    type: Number, 
    required: true,
    // This is the full monthly amount (before any LOP deductions)
  }, 
});

// Sub-document for fixed monthly deductions
const deductionSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    // e.g., "Provident Fund (Employee)", "Professional Tax"
  },
  amount: { 
    type: Number,
    // Can be a fixed amount
  },
  isPercent: { 
    type: Boolean, 
    default: false 
  },
  percentOf: { 
    type: String, // e.g., "Basic"
    default: 'Basic',
  },
});

// Sub-document for employer contributions (part of CTC, but not deducted from gross)
const employerContributionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    // e.g., "Provident Fund (Employer)", "Gratuity"
  },
  amount: { type: Number },
  isPercent: { type: Boolean, default: false },
  percentOf: { type: String, default: 'Basic' },
});


const salarySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
    },
    annualCTC: {
      type: Number,
      required: true,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    
    // --- Detailed Breakup ---
    
    // What the employee is set to earn
    earnings: [earningSchema],
    
    // What is set to be deducted from their gross pay
    deductions: [deductionSchema],

    // What the employer pays (part of CTC)
    employerContributions: [employerContributionSchema],
  },
  {
    timestamps: true,
  }
);

const Salary = mongoose.model('Salary', salarySchema, 'salary_details');
module.exports = Salary;