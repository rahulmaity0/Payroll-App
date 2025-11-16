// models/attendance.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

// --- Sub-document Interfaces ---
export interface IVariableEarning {
  name: string;
  amount: number;
}

export interface IVariableDeduction {
  name: string;
  amount: number;
}

// --- Main Attendance Interface ---
export interface IAttendance extends Document {
  employee: Schema.Types.ObjectId;
  month: number;
  year: number;
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours: number;
  variableEarnings: IVariableEarning[];
  variableDeductions: IVariableDeduction[];
  createdAt: Date;
  updatedAt: Date;
}

// --- Sub-document Schemas ---
const variableEarningSchema = new Schema<IVariableEarning>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const variableDeductionSchema = new Schema<IVariableDeduction>({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

// --- Main Attendance Schema ---
const attendanceSchema = new Schema<IAttendance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    totalWorkingDays: {
      type: Number,
      required: true,
    },
    daysPresent: {
      type: Number,
      required: true,
    },
    leaveWithoutPay: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    variableEarnings: [variableEarningSchema],
    variableDeductions: [variableDeductionSchema],
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

// --- Model Export ---
const Attendance: Model<IAttendance> = mongoose.model<IAttendance>(
  'Attendance',
  attendanceSchema,
  'attendance_details'
);
export default Attendance;