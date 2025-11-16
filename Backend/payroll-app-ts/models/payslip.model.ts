// models/payslip.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

// --- Sub-document Interfaces ---
interface IPayrollInfo {
  totalWorkingDays: number;
  daysPaid: number;
  lopDays: number;
}

export interface IPayslipEarning {
  name: string;
  amount: number;
  type: 'fixed' | 'variable' | 'reimbursement';
}

export interface IPayslipDeduction {
  name: string;
  amount: number;
  type: 'statutory' | 'tax' | 'lop' | 'other';
}

// --- Main Payslip Interface ---
export interface IPayslip extends Document {
  employee: Schema.Types.ObjectId;
  month: number;
  year: number;
  generatedOn: Date;
  payrollInfo: IPayrollInfo;
  earnings: IPayslipEarning[];
  deductions: IPayslipDeduction[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: 'pending' | 'paid' | 'generated';
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Sub-document Schemas ---
const payslipEarningSchema = new Schema<IPayslipEarning>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['fixed', 'variable', 'reimbursement'],
    default: 'fixed',
  },
}, { _id: false });

const payslipDeductionSchema = new Schema<IPayslipDeduction>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  type: {
    type: String,
    enum: ['statutory', 'tax', 'lop', 'other'],
    default: 'statutory',
  },
}, { _id: false });

// --- Main Payslip Schema ---
const payslipSchema = new Schema<IPayslip>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    generatedOn: { type: Date, default: Date.now },
    payrollInfo: {
      totalWorkingDays: { type: Number, required: true },
      daysPaid: { type: Number, required: true },
      lopDays: { type: Number, default: 0 },
    },
    earnings: [payslipEarningSchema],
    deductions: [payslipDeductionSchema],
    grossEarnings: {
      type: Number,
      required: true,
    },
    totalDeductions: {
      type: Number,
      required: true,
    },
    netPay: {
      type: Number,
      required: true,
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

// --- Model Export ---
const Payslip: Model<IPayslip> = mongoose.model<IPayslip>(
  'Payslip',
  payslipSchema,
  'payslips'
);
export default Payslip;