/**
 * Attendance Type Definitions
 * Supports both daily (day-level) and monthly (aggregate) records
 */

// Day-level attendance record (for individual dates)
export interface DailyAttendanceRecord {
  _id: string;
  employee: string;
  date: string; // YYYY-MM-DD format
  status: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO'; // Present, Absent, Leave Without Pay, Paid Leave, Holiday, Week Off
  checkIn?: string; // HH:mm format
  checkOut?: string; // HH:mm format
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Monthly aggregate record (for summary/calculations)
export interface MonthlyAttendanceRecord {
  _id: string;
  employee: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours: number;
  variableEarnings?: VariableEarning[];
  variableDeductions?: VariableDeduction[];
  createdAt: string;
  updatedAt: string;
}

export interface VariableEarning {
  name: string;
  amount: number;
}

export interface VariableDeduction {
  name: string;
  amount: number;
}

// For creating daily attendance
export interface CreateDailyAttendanceRequest {
  employee: string;
  date: string; // YYYY-MM-DD
  status: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO';
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
}

// For updating daily attendance
export interface UpdateDailyAttendanceRequest {
  status?: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO';
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
}

export interface AttendanceSummaryItem {
  _id: string;
  employee: {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: string;
  };
  month: number;
  year: number;
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours: number;
  variableEarnings?: VariableEarning[];
  variableDeductions?: VariableDeduction[];
}

// Status labels for UI
export const AttendanceStatusLabels: Record<string, string> = {
  'P': 'Present',
  'A': 'Absent',
  'LOP': 'Leave Without Pay',
  'PL': 'Paid Leave',
  'H': 'Holiday',
  'WO': 'Week Off'
};

// Status colors for calendar
export const AttendanceStatusColors: Record<string, string> = {
  'P': '#10b981',    // green
  'A': '#ef4444',    // red
  'LOP': '#f59e0b',  // amber
  'PL': '#3b82f6',   // blue
  'H': '#8b5cf6',    // purple
  'WO': '#6b7280'    // gray
};
