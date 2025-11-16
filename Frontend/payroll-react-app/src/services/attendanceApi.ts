import { API_BASE_URL } from '../apiConfig';
import { EmployeeData } from '../types/onboarding';

export const getEmployeeAttendance = async (employeeId: string, token: string) => {
  const res = await fetch(`${API_BASE_URL}/api/hr/employees/${employeeId}/attendance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Failed to fetch attendance: ${res.status}`);
  return data; // array of attendance records
};

export const getAllEmployeesSimple = async (token: string): Promise<EmployeeData[]> => {
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

export default { getEmployeeAttendance, getAllEmployeesSimple };
