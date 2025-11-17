import { API_BASE_URL } from '../apiConfig';

interface Payslip {
  _id: string;
  employee: string;
  month: number;
  year: number;
  generatedOn: string;
  payrollInfo: {
    totalWorkingDays: number;
    daysPaid: number;
    lopDays: number;
  };
  earnings: Array<{
    name: string;
    amount: number;
    type: 'fixed' | 'variable' | 'reimbursement';
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    type: 'tax' | 'statutory' | 'lop' | 'other';
  }>;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyAttendance {
  _id: string;
  employee: string;
  date: string;
  status: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO';
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceRecord {
  _id: string;
  employee: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours?: number;
  variableEarnings?: Array<{
    name: string;
    amount: number;
  }>;
  variableDeductions?: Array<{
    name: string;
    amount: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SalaryDetails {
  _id: string;
  employee: string;
  annualCTC: number;
  effectiveDate: string;
  earnings: Array<{
    name: string;
    amount: number;
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    isPercent?: boolean;
    percentOf?: string;
  }>;
  employerContributions?: Array<{
    name: string;
    amount: number;
    isPercent?: boolean;
    percentOf?: string;
  }>;
}

interface EmployeeProfile {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  designation: string;
  department?: string;
  joiningDate: string;
  dob?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  taxInfo?: {
    pan?: string;
    uan?: string;
  };
  isActive: boolean;
  salary?: SalaryDetails;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get authenticated employee's profile (basic info only)
 */
export const getMyProfile = async (token: string): Promise<EmployeeProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch profile: ${res.status}`);
  return data;
};

/**
 * Get authenticated employee's profile WITH salary details
 */
export const getMyProfileWithSalary = async (token: string): Promise<EmployeeProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch profile with salary: ${res.status}`);
  return data;
};

/**
 * Update authenticated employee's profile (employee-editable fields only)
 */
export const updateMyProfile = async (
  token: string,
  profileData: Partial<EmployeeProfile>
): Promise<EmployeeProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(profileData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to update profile: ${res.status}`);
  return data;
}

/**
 * Get all payslips for the logged-in employee
 */
export const getMyPayslips = async (token: string, year?: number): Promise<Payslip[]> => {
  const url = new URL(`${API_BASE_URL}/api/employee/payslips`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch payslips: ${res.status}`);
  return data;
};

/**
 * Get detailed payslip data for a specific payslip (for PDF generation)
 */
export const getPayslipDetails = async (payslipId: string, token: string): Promise<Payslip> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/payslips/${payslipId}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch payslip details: ${res.status}`);
  return data;
};

/**
 * Download a specific payslip as PDF using jsPDF (client-side generation)
 */
export const downloadPayslipPDF = async (payslipId: string, token: string, employee?: EmployeeProfile): Promise<void> => {
  // Fetch payslip JSON data
  const payslipData = await getPayslipDetails(payslipId, token);
  
  // If employee data not provided, fetch it
  let employeeData = employee;
  if (!employeeData) {
    const profile = await getMyProfileWithSalary(token);
    employeeData = profile;
  }

  // Dynamic import jsPDF
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Purple header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });

  // Employee information section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, 40);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${employeeData.firstName} ${employeeData.lastName}`, 14, 48);
  doc.text(`Employee ID: ${employeeData.employeeId}`, 14, 54);
  doc.text(`Designation: ${employeeData.designation}`, 14, 60);
  doc.text(`Pay Period: ${getMonthName(payslipData.month)} ${payslipData.year}`, 120, 48);
  doc.text(`Generated On: ${new Date(payslipData.generatedOn).toLocaleDateString('en-IN')}`, 120, 54);

  let yPos = 70;

  // Attendance summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', 14, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Working Days: ${payslipData.payrollInfo.totalWorkingDays}`, 14, yPos);
  doc.text(`Days Paid: ${payslipData.payrollInfo.daysPaid}`, 80, yPos);
  doc.text(`LOP Days: ${payslipData.payrollInfo.lopDays}`, 140, yPos);
  yPos += 6;
  
  const attendancePercent = ((payslipData.payrollInfo.daysPaid / payslipData.payrollInfo.totalWorkingDays) * 100).toFixed(1);
  doc.text(`Attendance: ${attendancePercent}%`, 14, yPos);
  yPos += 10;

  // Earnings section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', 14, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  payslipData.earnings.forEach((earning: { name: string; amount: number; type?: string }, index: number) => {
    const type = earning.type ? ` (${earning.type})` : '';
    doc.text(`${earning.name}${type}`, 14, yPos);
    doc.text(`₹${earning.amount.toLocaleString('en-IN')}`, 180, yPos, { align: 'right' });
    yPos += 5;
  });

  yPos += 5;

  // Deductions section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', 14, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  payslipData.deductions.forEach((deduction: { name: string; amount: number; type?: string }, index: number) => {
    const type = deduction.type ? ` (${deduction.type})` : '';
    doc.text(`${deduction.name}${type}`, 14, yPos);
    doc.text(`₹${deduction.amount.toLocaleString('en-IN')}`, 180, yPos, { align: 'right' });
    yPos += 5;
  });

  yPos += 10;

  // Summary section
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, 196, yPos);
  yPos += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings:', 14, yPos);
  doc.text(`₹${payslipData.grossEarnings.toLocaleString('en-IN')}`, 180, yPos, { align: 'right' });
  yPos += 7;

  doc.text('Total Deductions:', 14, yPos);
  doc.text(`₹${payslipData.totalDeductions.toLocaleString('en-IN')}`, 180, yPos, { align: 'right' });
  yPos += 10;

  doc.setFontSize(14);
  doc.setTextColor(76, 175, 80);
  doc.text('Net Pay:', 14, yPos);
  doc.text(`₹${payslipData.netPay.toLocaleString('en-IN')}`, 180, yPos, { align: 'right' });

  // Footer
  doc.setTextColor(128, 128, 128);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a system-generated payslip and does not require a signature.', 105, 280, { align: 'center' });

  // Generate filename
  const filename = `payslip-${employeeData.employeeId}-${payslipData.month}-${payslipData.year}.pdf`;
  doc.save(filename);
};

function getMonthName(month: number): string {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[month - 1] || '';
}

/**
 * Get daily attendance records for the logged-in employee
 */
export const getMyDailyAttendance = async (
  token: string,
  year?: number,
  month?: number
): Promise<DailyAttendance[]> => {
  const url = new URL(`${API_BASE_URL}/api/employee/attendance/daily`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }
  if (month) {
    url.searchParams.append('month', month.toString());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch daily attendance: ${res.status}`);
  return data;
};

/**
 * Mark or update attendance for a specific date (UPSERT)
 */
export const markAttendance = async (
  token: string,
  attendanceData: {
    date: string;
    status: 'P' | 'A' | 'LOP' | 'PL';
    checkIn?: string;
    checkOut?: string;
    hoursWorked?: number;
    overtimeHours?: number;
    notes?: string;
  }
): Promise<DailyAttendance> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/attendance/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(attendanceData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to mark attendance: ${res.status}`);
  return data.data;
};

/**
 * Update an existing attendance record
 */
export const updateAttendance = async (
  token: string,
  recordId: string,
  attendanceData: Partial<{
    status: 'P' | 'A' | 'LOP' | 'PL';
    checkIn: string;
    checkOut: string;
    hoursWorked: number;
    overtimeHours: number;
    notes: string;
  }>
): Promise<DailyAttendance> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/attendance/daily/${recordId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(attendanceData),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to update attendance: ${res.status}`);
  return data;
};

/**
 * Delete an attendance record
 */
export const deleteAttendance = async (token: string, recordId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/attendance/daily/${recordId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Failed to delete attendance' }));
    throw new Error(data.message || `Failed to delete attendance: ${res.status}`);
  }
};

/**
 * Download daily attendance as CSV
 */
export const downloadAttendanceCSV = async (
  token: string,
  year?: number,
  month?: number
): Promise<void> => {
  const url = new URL(`${API_BASE_URL}/api/employee/attendance/daily/download`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }
  if (month) {
    url.searchParams.append('month', month.toString());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to download attendance CSV' }));
    throw new Error(error.message || `Failed to download CSV: ${res.status}`);
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = 'daily-attendance.csv';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

/**
 * Get attendance records for the logged-in employee
 */
export const getMyAttendance = async (
  token: string,
  year?: number,
  month?: number
): Promise<AttendanceRecord[]> => {
  const url = new URL(`${API_BASE_URL}/api/employee/attendance`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }
  if (month) {
    url.searchParams.append('month', month.toString());
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch attendance: ${res.status}`);
  return data;
};

export default {
  getMyProfile,
  getMyProfileWithSalary,
  updateMyProfile,
  getMyPayslips,
  getPayslipDetails,
  downloadPayslipPDF,
  getMyDailyAttendance,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  downloadAttendanceCSV,
  getMyAttendance,
};

export type { Payslip, DailyAttendance, AttendanceRecord, EmployeeProfile, SalaryDetails };

