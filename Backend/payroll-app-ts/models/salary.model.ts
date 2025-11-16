// models/salary.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

// --- Sub-document Interfaces ---
interface IEarning {
  name: string;
  amount: number;
}

interface IDeduction {
  name: string;
  amount?: number;
  isPercent: boolean;
  percentOf: string;
}

interface IEmployerContribution {
  name: string;
  amount?: number;
  isPercent: boolean;
  percentOf: string;
}

// --- Main Salary Interface ---
export interface ISalary extends Document {
  employee: Schema.Types.ObjectId;
  annualCTC: number;
  effectiveDate: Date;
  earnings: IEarning[];
  deductions: IDeduction[];
  employerContributions: IEmployerContribution[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Sub-document Schemas ---
const earningSchema = new Schema<IEarning>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const deductionSchema = new Schema<IDeduction>({
  name: { type: String, required: true },
  amount: { type: Number },
  isPercent: { type: Boolean, default: false },
  percentOf: { type: String, default: 'Basic' },
}, { _id: false });

const employerContributionSchema = new Schema<IEmployerContribution>({
  name: { type: String, required: true },
  amount: { type: Number },
  isPercent: { type: Boolean, default: false },
  percentOf: { type: String, default: 'Basic' },
}, { _id: false });

// --- Main Salary Schema ---
const salarySchema = new Schema<ISalary>(
  {
    employee: {
      type: Schema.Types.ObjectId,
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
    earnings: [earningSchema],
    deductions: [deductionSchema],
    employerContributions: [employerContributionSchema],
  },
  {
    timestamps: true,
  }
);

// --- Model Export ---
const Salary: Model<ISalary> = mongoose.model<ISalary>(
  'Salary',
  salarySchema,
  'salary_details'
);
export default Salary;