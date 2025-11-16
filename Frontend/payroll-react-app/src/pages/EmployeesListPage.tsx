import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllEmployees } from '../services/employeesApi';
import { EmployeeData } from '../types/onboarding';
import EmployeesPage from './EmployeesPage';
import './EmployeesListPage.css';

export default function EmployeesListPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for modal
  const [selected, setSelected] = useState<EmployeeData | null>(null);

  // State for sorting and filtering
  const [sortConfig, setSortConfig] = useState<{ key: 'employeeId' | 'firstName'; direction: 'asc' | 'desc' }>(
    { key: 'employeeId', direction: 'asc' }
  );
  const [filters, setFilters] = useState({ department: '', designation: '', status: 'all', searchTerm: '' });

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      if (!token) throw new Error('Not authenticated');
      const data = await getAllEmployees(token);
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Memoized, sorted, and filtered employees
  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = [...employees];

    // Apply search term filter
    if (filters.searchTerm) {
      const lowercasedFilter = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (emp) =>
          emp.firstName.toLowerCase().includes(lowercasedFilter) ||
          emp.lastName.toLowerCase().includes(lowercasedFilter) ||
          emp.employeeId.toLowerCase().includes(lowercasedFilter)
      );
    }

    // Apply dropdown filters
    if (filters.department) {
      filtered = filtered.filter((emp) => emp.department === filters.department);
    }
    if (filters.designation) {
      filtered = filtered.filter((emp) => emp.designation === filters.designation);
    }
    if (filters.status !== 'all') {
      filtered = filtered.filter((emp) => (filters.status === 'active' ? emp.isActive : !emp.isActive));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [employees, sortConfig, filters]);

  // Get unique values for filter dropdowns
  const uniqueDepartments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))), [employees]);
  const uniqueDesignations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation).filter(Boolean))), [employees]);

  // --- MODAL HANDLERS ---
  const handleOpenEmployee = (emp: EmployeeData) => {
    setSelected(emp);
  };

  const handleCloseModal = () => {
    setSelected(null);
  };

  const handleEmployeeUpdate = (updatedEmployee: EmployeeData) => {
    setEmployees((prev) => prev.map((emp) => (emp._id === updatedEmployee._id ? updatedEmployee : emp)));
  };

  // --- FILTER/SORT HANDLERS ---
  const handleSortChange = (key: 'employeeId' | 'firstName') => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  return (
    <div className="employees-list-page-container">
      <div className="employees-list-page-header">
        <h1>Employee Directory</h1>
      </div>

      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      {/* Filter and Sort Controls */}
      <div className="controls-container">
        <div className="filter-group">
          <input
            type="text"
            placeholder="🔍 Search by ID or Name..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="search-input"
          />
          <select value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)}>
            <option value="">All Departments</option>
            {uniqueDepartments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>
          <select value={filters.designation} onChange={(e) => handleFilterChange('designation', e.target.value)}>
            <option value="">All Designations</option>
            {uniqueDesignations.map(des => <option key={des} value={des}>{des}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="sort-group">
          <span>Sort by:</span>
          <button onClick={() => handleSortChange('employeeId')} className={sortConfig.key === 'employeeId' ? 'active' : ''}>
            ID {sortConfig.key === 'employeeId' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
          </button>
          <button onClick={() => handleSortChange('firstName')} className={sortConfig.key === 'firstName' ? 'active' : ''}>
            Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
          </button>
        </div>
      </div>

      {loading && !employees.length ? (
        <div className="loading-state">Loading employees...</div>
      ) : (
        /* Employees Table */
        <div className="table-wrapper">
          <table className="employees-table">
            <thead>
              <tr>
                <th onClick={() => handleSortChange('employeeId')}>
                  Employee ID
                  {sortConfig.key === 'employeeId' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th onClick={() => handleSortChange('firstName')}>
                  Name
                  {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </th>
                <th>Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredAndSortedEmployees.map((emp) => (
                  <tr key={emp._id} onClick={() => handleOpenEmployee(emp)} className="emp-row">
                    <td>{emp.employeeId}</td>
                    <td className="emp-name">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td>{emp.personalEmail}</td>
                    <td>{emp.designation}</td>
                    <td>{emp.department || '-'}</td>
                    <td>{emp.phone || '-'}</td>
                    <td>
                      <span className={`status-badge ${emp.isActive ? 'active' : 'inactive'}`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Employee Detail Modal */}
      {selected && (
        <EmployeesPage
          employee={selected}
          onClose={handleCloseModal}
          onUpdate={handleEmployeeUpdate}
        />
      )}
    </div>
  );
}
