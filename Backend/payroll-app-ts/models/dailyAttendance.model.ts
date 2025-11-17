// models/dailyAttendance.model.ts
import mongoose, { Document, Model, Schema } from 'mongoose';

// Status code meanings
export type AttendanceStatus = 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO';

export interface IDailyAttendance extends Document {
  employee: Schema.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  status: AttendanceStatus;
  checkIn?: string; // HH:mm format
  checkOut?: string; // HH:mm format
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const dailyAttendanceSchema = new Schema<IDailyAttendance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    date: {
      type: String,
      required: true,
      validate: {
        validator: function (v: string) {
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: 'Date must be in YYYY-MM-DD format',
      },
    },
    status: {
      type: String,
      enum: ['P', 'A', 'LOP', 'PL', 'H', 'WO'],
      required: true,
      default: 'P',
    },
    checkIn: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^\d{2}:\d{2}$/.test(v);
        },
        message: 'Check-in time must be in HH:mm format',
      },
    },
    checkOut: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^\d{2}:\d{2}$/.test(v);
        },
        message: 'Check-out time must be in HH:mm format',
      },
    },
    hoursWorked: {
      type: Number,
      min: 0,
      max: 24,
    },
    overtimeHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Unique index to prevent duplicate records for same employee+date
dailyAttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// Index for fast date-based queries
dailyAttendanceSchema.index({ date: 1 });

const DailyAttendance: Model<IDailyAttendance> = mongoose.model<IDailyAttendance>(
  'DailyAttendance',
  dailyAttendanceSchema,
  'daily_attendance'
);

export default DailyAttendance;
