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
    type: 'fixed' | 'variable';
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    type: 'tax' | 'statutory' | 'other';
  }>;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paymentDate: string;
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
 * Download a specific payslip as PDF
 */
export const downloadPayslipPDF = async (payslipId: string, token: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/employee/payslips/${payslipId}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to download payslip' }));
    throw new Error(error.message || `Failed to download payslip: ${res.status}`);
  }

  // Get the blob data
  const blob = await res.blob();
  
  // Create a temporary URL for the blob
  const url = window.URL.createObjectURL(blob);
  
  // Get filename from Content-Disposition header or use default
  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = 'payslip.pdf';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }

  // Create a temporary link and trigger download
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the temporary URL
  window.URL.revokeObjectURL(url);
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
  createdAt: string;
  updatedAt: string;
}

/**
 * Get authenticated employee's profile
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
 * Update authenticated employee's profile
 */
export const updateMyProfile = async (
  token: string,
  profileData: Partial<EmployeeProfile>
): Promise<EmployeeProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
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
};

export default {
  getMyPayslips,
  downloadPayslipPDF,
  getMyAttendance,
  getMyProfile,
  updateMyProfile,
};

export type { Payslip, AttendanceRecord, EmployeeProfile };

