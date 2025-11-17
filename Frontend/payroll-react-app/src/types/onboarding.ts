/**
 * Type definitions for Employee Onboarding API
 */

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface TaxInfo {
  pan: string;
  uan?: string;
}

export interface SalaryComponent {
  name: string;
  amount: number;
  isPercent?: boolean;
  percentOf?: string;
}

export interface OnboardEmployeeRequest {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: string;
  annualCTC: number;
  personalEmail: string;
  department: string;
  phone: string;
  bankDetails: BankDetails;
  taxInfo: TaxInfo;
  // Full salary structure (no password/employeeId in this request)
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  employerContributions: SalaryComponent[];
}

export interface EmployeeData {
  employeeId: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  designation: string;
  department: string;
  joiningDate: string;
  dob?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  bankDetails: BankDetails;
  taxInfo: TaxInfo;
  isActive: boolean;
  _id: string;
  createdAt: string;
  updatedAt: string;
  // Add salary structure to the main employee data type
  earnings?: SalaryComponent[];
  deductions?: SalaryComponent[];
  employerContributions?: SalaryComponent[];
}

export interface UserData {
  email: string;
  role: string;
  employee: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardEmployeeResponse {
  message: string;
  data: {
    employee: EmployeeData;
    user: UserData;
  };
  employee?: EmployeeData;
}

export interface OnboardingFormData {
  email: string;
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: string;
  annualCTC: string;
  personalEmail: string;
  department: string;
  phone: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  pan: string;
  uan?: string;
}

export {};