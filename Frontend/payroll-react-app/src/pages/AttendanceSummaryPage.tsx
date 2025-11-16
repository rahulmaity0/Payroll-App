import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendanceSummary } from '../services/attendanceApi';
import { getAllEmployees } from '../services/employeesApi';
import './AttendanceSummaryPage.css';
import { useNavigate } from 'react-router-dom';
import type { AttendanceSummaryItem } from '../types/attendance';

interface SummaryRow {
  _id: string;
  employeeId?: string;
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  totalWorkingDays: number;
  daysPresent: number;
  leaveWithoutPay: number;
  overtimeHours: number;
  hasAttendance: boolean;
}

const AttendanceSummaryPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<SummaryRow[]>([]);
  const [filtered, setFiltered] = useState<SummaryRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!token) {
          setEmployees([]);
          setFiltered([]);
          return;
        }
        setLoading(true);
        setError('');

        // Fetch all employees
        const employeeList = await getAllEmployees(token);

        // Fetch attendance summary for the selected month/year
        let attendanceMap: Map<string, AttendanceSummaryItem> = new Map();
        try {
          const attendanceSummary = await getAttendanceSummary(month, year, token);
          attendanceSummary.forEach((item) => {
            attendanceMap.set(item.employee._id, item);
          });
        } catch (err) {
          console.warn('Failed to fetch attendance summary:', err);
          // Continue with empty attendance data
        }

        // Merge employee data with attendance data
        const mapped: SummaryRow[] = employeeList.map((e: any) => {
          const attendance = attendanceMap.get(e._id);
          return {
            _id: e._id,
            employeeId: e.employeeId,
            name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
            designation: e.designation,
            department: e.department,
            phone: e.phone,
            totalWorkingDays: attendance?.totalWorkingDays || 0,
            daysPresent: attendance?.daysPresent || 0,
            leaveWithoutPay: attendance?.leaveWithoutPay || 0,
            overtimeHours: attendance?.overtimeHours || 0,
            hasAttendance: !!attendance,
          };
        });

        setEmployees(mapped);
        setFiltered(mapped);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, month, year]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  useEffect(() => {
    let res = employees;
    if (departmentFilter) res = res.filter((r) => (r.department || '').toLowerCase() === departmentFilter.toLowerCase());
    if (search) {
      const s = search.toLowerCase();
      res = res.filter((r) => (r.name || '').toLowerCase().includes(s) || (r.employeeId || '').toLowerCase().includes(s) || (r.phone || '').includes(s));
    }
    setFiltered(res);
  }, [departmentFilter, search, employees]);

  const handleView = (id: string) => {
    navigate(`/attendance/${id}`);
  };

  return (
    <div className="attendance-summary-container">
      <div className="attendance-header">
        <h1>Attendance Summary</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            min={2000}
            max={2100}
            style={{ width: '80px' }}
          />
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}

      <div className="attendance-controls">
        <div className="control-item">
          <label>Department</label>
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="control-item search-item">
          <label>Search</label>
          <div className="search-wrap">
            <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, id or phone" />
            <button className="clear-btn" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          </div>
        </div>
      </div>

      <div className="attendance-table-wrap">
        {loading ? (
          <div>Loading employees...</div>
        ) : (
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Working Days</th>
                <th>Days Present</th>
                <th>LOP Days</th>
                <th>Overtime Hrs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id} className={!r.hasAttendance ? 'missing-attendance' : ''}>
                    <td>{r.employeeId}</td>
                    <td>{r.name}</td>
                    <td>{r.designation}</td>
                    <td>{r.department}</td>
                    <td>{r.totalWorkingDays || '-'}</td>
                    <td>{r.daysPresent || '-'}</td>
                    <td>{r.leaveWithoutPay || '-'}</td>
                    <td>{r.overtimeHours || '-'}</td>
                    <td>
                      {r.hasAttendance ? (
                        <span className="status-badge complete">✓ Complete</span>
                      ) : (
                        <span className="status-badge missing">⚠ Missing</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => handleView(r._id)}>View/Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceSummaryPage;
