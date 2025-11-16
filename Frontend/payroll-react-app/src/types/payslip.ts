/**
 * Payslip Type Definitions
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
  warnings: string[];
}
