import { EmployeeData } from '../types/onboarding';
import { API_BASE_URL } from '../apiConfig';

export const getAllEmployees = async (token: string): Promise<EmployeeData[]> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch employees: ${res.status}`);
  return data as EmployeeData[];
};

export const getEmployeeById = async (id: string, token: string): Promise<EmployeeData> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch employee: ${res.status}`);
  return data as EmployeeData;
};

export const updateEmployee = async (id: string, payload: Partial<EmployeeData>, token: string): Promise<EmployeeData> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to update employee: ${res.status}`);
  return data as EmployeeData;
};

export interface SalaryStructure {
  annualCTC: number;
  earnings: Array<{ name: string; amount: number }>;
  deductions: Array<{ name: string; amount: number; isPercent?: boolean; percentOf?: string }>;
  employerContributions: Array<{ name: string; amount: number; isPercent?: boolean; percentOf?: string }>;
}

export const getSalary = async (id: string, token: string): Promise<SalaryStructure> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees/${id}/salary`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch salary: ${res.status}`);
  return data as SalaryStructure;
};

export const updateSalary = async (id: string, payload: Partial<SalaryStructure>, token: string): Promise<SalaryStructure> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees/${id}/salary`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to update salary: ${res.status}`);
  return data as SalaryStructure;
};

export default { getAllEmployees, getEmployeeById, updateEmployee, getSalary, updateSalary };
