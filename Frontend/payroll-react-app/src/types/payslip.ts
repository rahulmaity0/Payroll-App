/**
 * Payslip Type Definitions
 * Based on PAYSLIP_GENERATION_API_REFERENCE.md v2.0
 */

export interface GeneratePayslipRequest {
  month: number;      // 1-12
  year: number;       // 2000-2100
  force?: boolean;    // Allow generation before month ends (default: false)
}

export interface GeneratePayslipResponse {
  message: string;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings?: string[];  // Optional per spec
}

export interface Payslip {
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
    type: 'statutory' | 'tax' | 'lop' | 'other';
  }>;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: 'pending' | 'paid' | 'generated';
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}
