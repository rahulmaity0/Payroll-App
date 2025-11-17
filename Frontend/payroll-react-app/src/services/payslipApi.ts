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

  const response = await fetch(`${API_BASE_URL}/api/hr/payslips/${payslipId}/download`, {
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

export default {
  generatePayslips,
  getMyPayslips,
  downloadMyPayslip,
  downloadEmployeePayslip,
};
