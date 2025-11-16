import { API_BASE_URL } from '../apiConfig';
import type {
  DailyAttendanceRecord,
  MonthlyAttendanceRecord,
  CreateDailyAttendanceRequest,
  UpdateDailyAttendanceRequest,
  AttendanceSummaryItem,
} from '../types/attendance';

/**
 * Get daily attendance records for an employee
 * @param employeeId - Employee MongoDB ID
 * @param token - JWT token
 * @param filters - Optional year/month filters
 */
export const getDailyAttendance = async (
  employeeId: string,
  token: string,
  filters?: { year?: number; month?: number }
): Promise<DailyAttendanceRecord[]> => {
  let url = `${API_BASE_URL}/api/hr/employees/${employeeId}/attendance/daily`;
  
  if (filters) {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year.toString());
    if (filters.month) params.append('month', filters.month.toString());
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to fetch attendance' }));
    throw new Error(err.message || 'Failed to fetch attendance');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.data || data;
};

/**
 * Get monthly attendance records (aggregates) for an employee
 */
export const getMonthlyAttendance = async (
  employeeId: string,
  token: string,
  filters?: { year?: number; month?: number }
): Promise<MonthlyAttendanceRecord[]> => {
  let url = `${API_BASE_URL}/api/hr/employees/${employeeId}/attendance`;
  
  if (filters) {
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year.toString());
    if (filters.month) params.append('month', filters.month.toString());
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to fetch attendance' }));
    throw new Error(err.message || 'Failed to fetch attendance');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.data || data;
};

/**
 * Create or update a single day's attendance record
 * If record exists for that date, update it; otherwise create new
 */
export const setDayAttendance = async (
  data: CreateDailyAttendanceRequest,
  token: string
): Promise<DailyAttendanceRecord> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/attendance/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to save attendance' }));
    throw new Error(err.message || 'Failed to save attendance');
  }

  const response = await res.json();
  return response.data || response;
};

/**
 * Update an existing daily attendance record
 */
export const updateDayAttendance = async (
  recordId: string,
  updates: UpdateDailyAttendanceRequest,
  token: string
): Promise<DailyAttendanceRecord> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/attendance/daily/${recordId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update attendance' }));
    throw new Error(err.message || 'Failed to update attendance');
  }

  const response = await res.json();
  return response.data || response;
};

/**
 * Delete a daily attendance record
 */
export const deleteDayAttendance = async (
  recordId: string,
  token: string
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/hr/attendance/daily/${recordId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to delete attendance' }));
    throw new Error(err.message || 'Failed to delete attendance');
  }
};

/**
 * Get attendance summary for all employees for a specific month/year
 */
export const getAttendanceSummary = async (
  month: number,
  year: number,
  token: string
): Promise<AttendanceSummaryItem[]> => {
  const url = `${API_BASE_URL}/api/hr/attendance/summary?month=${month}&year=${year}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to fetch summary' }));
    throw new Error(err.message || 'Failed to fetch summary');
  }

  const data = await res.json();
  return Array.isArray(data) ? data : data.data || data;
};

export default {
  getDailyAttendance,
  getMonthlyAttendance,
  setDayAttendance,
  updateDayAttendance,
  deleteDayAttendance,
  getAttendanceSummary,
};
