/**
 * Payslip API Service
 * Implements PAYSLIP_GENERATION_API_REFERENCE.md v2.0
 */

import { GeneratePayslipRequest, GeneratePayslipResponse, Payslip } from '../types/payslip';
import { API_BASE_URL } from '../apiConfig';

/**
 * Generate payslips for all active employees (HR only)
 * 
 * @param data - Generation request (month, year, force flag)
 * @param token - JWT authentication token
 * @returns Generation result with success/failure counts
 * 
 * @example
 * ```typescript
 * const result = await generatePayslips({ month: 11, year: 2025 }, token);
 * // { processed: 15, success: 14, skipped: 1, failed: 0 }
 * ```
 */
export const generatePayslips = async (
  data: GeneratePayslipRequest,
  token: string
): Promise<GeneratePayslipResponse> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  if (!data.month || !data.year) {
    throw new Error('Month and year are required');
  }

  if (data.month < 1 || data.month > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  if (data.year < 2000 || data.year > 2100) {
    throw new Error('Year must be between 2000 and 2100');
  }

  const response = await fetch(`${API_BASE_URL}/api/hr/payroll/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData: GeneratePayslipResponse = await response.json();

  if (!response.ok) {
    throw new Error(responseData.message || `Payslip generation failed: ${response.status}`);
  }

  return responseData;
};

/**
 * Get all payslips for logged-in employee
 * 
 * @param token - JWT authentication token
 * @param year - Optional year filter
 * @returns Array of employee's payslips
 */
export const getMyPayslips = async (token: string, year?: number): Promise<Payslip[]> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  const url = new URL(`${API_BASE_URL}/api/employee/payslips`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch payslips' }));
    throw new Error(error.message || `Failed to fetch payslips: ${response.status}`);
  }

  return response.json();
};

/**
 * Download employee's own payslip as PDF
 * 
 * @param payslipId - Payslip ID
 * @param token - JWT authentication token
 */
export const downloadMyPayslip = async (payslipId: string, token: string): Promise<void> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  if (!payslipId) {
    throw new Error('Payslip ID is required');
  }

  const response = await fetch(`${API_BASE_URL}/api/employee/payslips/${payslipId}/download`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to download payslip' }));
    throw new Error(error.message || 'Payslip not found');
  }

  // Get blob and trigger download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Extract filename from Content-Disposition or use default
  const contentDisposition = response.headers.get('Content-Disposition');
  let filename = `payslip-${payslipId}.pdf`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match && match[1]) {
      filename = match[1].replace(/['"]/g, '');
    }
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Download any employee's payslip as PDF (HR only)
 * Fetches JSON data and generates PDF client-side
 * 
 * @param payslipId - Payslip ID
 * @param token - JWT authentication token (must be HR role)
 */
export const downloadEmployeePayslip = async (payslipId: string, token: string): Promise<void> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  if (!payslipId) {
    throw new Error('Payslip ID is required');
  }

  // Fetch payslip JSON data
  const response = await fetch(`${API_BASE_URL}/api/hr/payslips/${payslipId}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to download payslip' }));
    throw new Error(error.message || 'Payslip not found');
  }

  const data: any = await response.json();

  // Generate PDF using jsPDF
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Header
  doc.setFillColor(102, 126, 234);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', 105, 20, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  // Employee Info Section
  let y = 40;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 20, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${data.employee?.firstName || ''} ${data.employee?.lastName || ''}`, 20, y);
  y += 6;
  doc.text(`Employee ID: ${data.employee?.employeeId || 'N/A'}`, 20, y);
  y += 6;
  doc.text(`Designation: ${data.employee?.designation || 'N/A'}`, 20, y);
  y += 6;
  doc.text(`Period: ${getMonthName(data.month)} ${data.year}`, 20, y);
  y += 6;
  doc.text(`Generated On: ${new Date(data.generatedOn).toLocaleDateString('en-IN')}`, 20, y);

  // Attendance Summary
  y += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Summary', 20, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Working Days: ${data.payrollInfo?.totalWorkingDays || 0}`, 20, y);
  doc.text(`Days Paid: ${data.payrollInfo?.daysPaid || 0}`, 105, y);
  y += 6;
  doc.text(`LOP Days: ${data.payrollInfo?.lopDays || 0}`, 20, y);
  const attendancePercent = data.payrollInfo?.totalWorkingDays
    ? ((data.payrollInfo.daysPaid / data.payrollInfo.totalWorkingDays) * 100).toFixed(1)
    : '0';
  doc.text(`Attendance: ${attendancePercent}%`, 105, y);

  // Earnings Section
  y += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.earnings && data.earnings.length > 0) {
    data.earnings.forEach((e: any) => {
      doc.text(`${e.name}`, 25, y);
      doc.text(`(${e.type})`, 90, y);
      doc.text(`₹${e.amount.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
      y += 6;
    });
  } else {
    doc.text('No earnings recorded', 25, y);
    y += 6;
  }

  // Deductions Section
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Deductions', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (data.deductions && data.deductions.length > 0) {
    data.deductions.forEach((d: any) => {
      doc.text(`${d.name}`, 25, y);
      doc.text(`(${d.type})`, 90, y);
      doc.text(`₹${d.amount.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
      y += 6;
    });
  } else {
    doc.text('No deductions recorded', 25, y);
    y += 6;
  }

  // Summary Section
  y += 8;
  doc.setDrawColor(102, 126, 234);
  doc.setLineWidth(0.5);
  doc.line(20, y, 190, y);
  y += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings:', 20, y);
  doc.text(`₹${data.grossEarnings.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
  y += 7;

  doc.text('Total Deductions:', 20, y);
  doc.text(`₹${data.totalDeductions.toLocaleString('en-IN')}`, 190, y, { align: 'right' });
  y += 7;

  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text('NET PAY:', 20, y);
  doc.text(`₹${data.netPay.toLocaleString('en-IN')}`, 190, y, { align: 'right' });

  // Footer
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is a computer-generated document and does not require a signature.', 105, 280, { align: 'center' });

  // Save PDF
  const filename = `payslip-${data.employee?.employeeId || 'employee'}-${data.month}-${data.year}.pdf`;
  doc.save(filename);

  // Helper function for month names
  function getMonthName(monthNum: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1] || '';
  }
};

/**
 * Get payslip details by ID (returns full payslip data for display/PDF generation)
 * Uses HR endpoint to access any employee's payslip
 * 
 * @param payslipId - Payslip ID
 * @param token - JWT authentication token
 * @returns Complete payslip with employee details
 */
export const getPayslipById = async (payslipId: string, token: string): Promise<Payslip> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  if (!payslipId) {
    throw new Error('Payslip ID is required');
  }

  // Use HR endpoint: GET /api/hr/payslips/:id/download
  const response = await fetch(`${API_BASE_URL}/api/hr/payslips/${payslipId}/download`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch payslip' }));
    throw new Error(error.message || 'Payslip not found');
  }

  return response.json();
};

/**
 * Get all employees with their latest payslip info (HR only)
 * Used for employee payslip search interface
 * 
 * @param token - JWT authentication token (must be HR role)
 * @returns Array of employees with payslip metadata
 */
export const getAllEmployeesPayslips = async (token: string): Promise<any[]> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  const response = await fetch(`${API_BASE_URL}/api/hr/employees`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch employees' }));
    throw new Error(error.message || `Failed to fetch employees: ${response.status}`);
  }

  return response.json();
};

/**
 * Get payslips for a specific employee (HR only)
 * 
 * @param employeeId - Employee MongoDB ObjectId
 * @param token - JWT authentication token (must be HR role)
 * @param year - Optional year filter
 * @returns Array of employee's payslips
 */
export const getEmployeePayslips = async (
  employeeId: string,
  token: string,
  year?: number
): Promise<Payslip[]> => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  if (!employeeId) {
    throw new Error('Employee ID is required');
  }

  // Use HR endpoint: GET /api/hr/employees/:employeeId/payslips
  const url = new URL(`${API_BASE_URL}/api/hr/employees/${employeeId}/payslips`);
  if (year) {
    url.searchParams.append('year', year.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch employee payslips' }));
    throw new Error(error.message || `Failed to fetch payslips: ${response.status}`);
  }

  return response.json();
};

export default {
  generatePayslips,
  getMyPayslips,
  downloadMyPayslip,
  downloadEmployeePayslip,
  getPayslipById,
  getAllEmployeesPayslips,
  getEmployeePayslips,
};
