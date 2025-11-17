import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllEmployeesPayslips } from '../services/payslipApi';
import './EmployeePayslipPage.css';

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  isActive: boolean;
}

const EmployeePayslipPage: React.FC = () => {
  const navigate = useNavigate();
  const { token, clearToken } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee; direction: 'asc' | 'desc' }>({
    key: 'employeeId',
    direction: 'asc'
  });

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, employees]);

  const fetchEmployees = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getAllEmployeesPayslips(token);
      // Filter out HR users
      const activeEmployees = data.filter(
        (emp: Employee) => !emp.employeeId.startsWith('HR')
      );
      setEmployees(activeEmployees);
      setFilteredEmployees(activeEmployees);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const filterEmployees = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = employees.filter(
      (emp) =>
        emp.employeeId.toLowerCase().includes(term) ||
        emp.firstName.toLowerCase().includes(term) ||
        emp.lastName.toLowerCase().includes(term) ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
        emp.designation.toLowerCase().includes(term) ||
        (emp.department && emp.department.toLowerCase().includes(term))
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const handleSort = (key: keyof Employee) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedAndFilteredEmployees = useMemo(() => {
    const sorted = [...filteredEmployees].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortConfig.direction === 'asc'
          ? (aValue === bValue ? 0 : aValue ? -1 : 1)
          : (aValue === bValue ? 0 : aValue ? 1 : -1);
      }
      
      return 0;
    });
    return sorted;
  }, [filteredEmployees, sortConfig]);

  const handleViewPayslip = (employeeId: string) => {
    navigate(`/hr/payslips/${employeeId}?month=${selectedMonth}&year=${selectedYear}`);
  };

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="employee-payslip-page">
      <div className="payslip-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>Employee Payslips</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="payslip-controls">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search by name, ID, designation, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-item">
          <label>Month</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label>Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading employees...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>❌ {error}</p>
          <button onClick={fetchEmployees}>Retry</button>
        </div>
      )}

      {!loading && !error && filteredEmployees.length === 0 && (
        <div className="empty-state">
          <p>No employees found matching your search.</p>
        </div>
      )}

      {!loading && !error && sortedAndFilteredEmployees.length > 0 && (
        <div className="payslips-table-container">
          <table className="payslips-table">
            <thead>
              <tr>
                <th className={`sortable ${sortConfig.key === 'employeeId' ? `sorted-${sortConfig.direction}` : ''}`} onClick={() => handleSort('employeeId')}>Employee ID</th>
                <th className={`sortable ${sortConfig.key === 'firstName' ? `sorted-${sortConfig.direction}` : ''}`} onClick={() => handleSort('firstName')}>Name</th>
                <th className={`sortable ${sortConfig.key === 'designation' ? `sorted-${sortConfig.direction}` : ''}`} onClick={() => handleSort('designation')}>Designation</th>
                <th className={`sortable ${sortConfig.key === 'department' ? `sorted-${sortConfig.direction}` : ''}`} onClick={() => handleSort('department')}>Department</th>
                <th className={`sortable ${sortConfig.key === 'isActive' ? `sorted-${sortConfig.direction}` : ''}`} onClick={() => handleSort('isActive')}>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedAndFilteredEmployees.map((emp) => (
                <tr key={emp._id}>
                  <td className="payslip-id">{emp.employeeId}</td>
                  <td>
                    {emp.firstName} {emp.lastName}
                  </td>
                  <td>{emp.designation}</td>
                  <td>{emp.department || '-'}</td>
                  <td>
                    <span className={`status-badge ${emp.isActive ? 'active' : 'inactive'}`}>
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => handleViewPayslip(emp._id)}
                      disabled={!emp.isActive}
                    >
                      View Payslip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filteredEmployees.length > 0 && (
        <div className="table-footer">
          <p>
            Showing {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployeePayslipPage;
