// models/employee.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

// --- Sub-document Interfaces ---
interface IAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface IBankDetails {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

interface ITaxInfo {
  pan?: string;
  uan?: string;
}

// --- Main Employee Interface ---
export interface IEmployee extends Document {
  employeeId: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  designation: string;
  department?: string;
  joiningDate: Date;
  dob?: Date;
  phone?: string;
  address?: IAddress;
  bankDetails?: IBankDetails;
  taxInfo?: ITaxInfo;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Mongoose Schema ---
const employeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
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
      type: Date,
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
      pan: String,
      uan: String,
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

// --- Model Export ---
const Employee: Model<IEmployee> = mongoose.model<IEmployee>(
  'Employee',
  employeeSchema,
  'employee_details'
);
export default Employee;