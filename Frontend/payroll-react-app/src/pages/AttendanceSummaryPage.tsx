import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import attendanceApi from '../services/attendanceApi';
import { getAllEmployees } from '../services/employeesApi';
import './AttendanceSummaryPage.css';
import { useNavigate } from 'react-router-dom';

interface SummaryRow {
  _id: string;
  employeeId?: string;
  name: string;
  designation?: string;
  department?: string;
  phone?: string;
  totalWorkingDays?: number;
  daysPresent?: number;
}

const AttendanceSummaryPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<SummaryRow[]>([]);
  const [filtered, setFiltered] = useState<SummaryRow[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (!token) {
          // not authenticated yet
          setEmployees([]);
          setFiltered([]);
          return;
        }
        setLoading(true);
        const list = await getAllEmployees(token);
        // Map to summary rows; attendance will be fetched per-employee lazily if needed
        const mapped = list.map((e: any) => ({
          _id: e._id,
          employeeId: e.employeeId,
          name: `${e.firstName || ''} ${e.lastName || ''}`.trim(),
          designation: e.designation,
          department: e.department,
          phone: e.phone,
          totalWorkingDays: 0,
          daysPresent: 0,
        }));
        setEmployees(mapped);
        setFiltered(mapped);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

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
      </div>

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
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td>{r.employeeId}</td>
                  <td>{r.name}</td>
                  <td>{r.designation}</td>
                  <td>{r.department}</td>
                  <td>{r.phone}</td>
                  <td>
                    <button onClick={() => handleView(r._id)}>View Attendance</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AttendanceSummaryPage;
