/**
 * Payslip API Service
 */

import { GeneratePayslipRequest, GeneratePayslipResponse } from '../types/payslip';
import { API_BASE_URL } from '../apiConfig';

export const generatePayslips = async (
  data: GeneratePayslipRequest,
  token: string
): Promise<GeneratePayslipResponse> => {
  try {
    console.log('[PayslipAPI] Generating payslips:', data);
    
    const response = await fetch(`${API_BASE_URL}/api/hr/payroll/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData: GeneratePayslipResponse = await response.json();
    console.log('[PayslipAPI] Response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error('[PayslipAPI] Generation failed:', error);
    throw error;
  }
};

export default { generatePayslips };
