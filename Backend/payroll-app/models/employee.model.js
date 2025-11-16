// models/employee.model.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String, // e.g., "EMP001"
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    personalEmail: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      required: true,
    },
    department: {
      type: String,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    dob: {
      type: Date, // Date of Birth
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
    },
    taxInfo: {
      pan: String, // PAN Number
      uan: String, // UAN for Provident Fund
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// The model name is 'Employee', and the collection name is 'employee_details'
const Employee = mongoose.model(
  'Employee',
  employeeSchema,
  'employee_details'
);
module.exports = Employee;