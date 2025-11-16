import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllEmployees, updateEmployee } from '../services/employeesApi';
import { EmployeeData } from '../types/onboarding';
import './EmployeesListPage.css';

interface SalaryDetails {
  _id: string;
  employee: string;
  annualCTC: number;
  earnings: Array<{ name: string; amount: number; isPercent?: boolean; percentOf?: string }>;
  deductions: Array<{ name: string; amount: number; isPercent?: boolean; percentOf?: string }>;
  employerContributions: Array<{ name: string; amount: number; isPercent?: boolean; percentOf?: string }>;
}

export default function EmployeesListPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<EmployeeData | null>(null);
  const [selectedSalary, setSelectedSalary] = useState<SalaryDetails | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState<Partial<EmployeeData>>({});
  const [salaryState, setSalaryState] = useState<Partial<SalaryDetails>>({});
  const [saving, setSaving] = useState(false);

  // Load employees
  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      if (!token) throw new Error('Not authenticated');
      const data = await getAllEmployees(token);
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    }
    setLoading(false);
  };

  // Load salary details for selected employee
  const loadSalaryDetails = async (employeeId: string) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE_URL || 'http://0.0.0.0:5000'}/api/hr/employees/${employeeId}/salary`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to load salary details');
      const data = await response.json();
      setSelectedSalary(data);
      setSalaryState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load salary details');
    }
  };

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = employees.filter(
      (emp) =>
        emp.firstName.toLowerCase().includes(term.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(term.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(term.toLowerCase()) ||
        emp.personalEmail.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  // Open employee detail
  const handleOpenEmployee = (emp: EmployeeData) => {
    setSelected(emp);
    setFormState({ ...emp });
    setEditMode(false);
    setError('');
    loadSalaryDetails(emp._id);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelected(null);
    setSelectedSalary(null);
    setEditMode(false);
    setFormState({});
    setSalaryState({});
  };

  // Update field
  const handleFieldChange = (key: keyof EmployeeData, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // Update nested field
  const handleNestedFieldChange = (
    parent: 'address' | 'bankDetails' | 'taxInfo',
    key: string,
    value: any
  ) => {
    setFormState((prev) => ({
      ...prev,
      [parent]: { ...(prev[parent] as any), [key]: value },
    }));
  };

  // Update salary component
  const handleSalaryComponentChange = (
    type: 'earnings' | 'deductions' | 'employerContributions',
    index: number,
    field: string,
    value: any
  ) => {
    setSalaryState((prev) => {
      const updated = { ...prev };
      const arr = (updated[type] || []) as any[];
      if (arr[index]) {
        arr[index] = { ...arr[index], [field]: field === 'amount' ? Number(value) : value };
      }
      return updated;
    });
  };

  // Save changes
  const handleSave = async () => {
    if (!selected || !token) return;

    setSaving(true);
    setError('');

    try {
      // Update employee profile
      await updateEmployee(selected._id, formState, token);

      // Update salary if modified
      if (selectedSalary) {
        const salaryPayload = {
          annualCTC: salaryState.annualCTC || selectedSalary.annualCTC,
          earnings: (salaryState.earnings || selectedSalary.earnings).filter((e: any) => e.name.trim()),
          deductions: (salaryState.deductions || selectedSalary.deductions).filter((d: any) => d.name.trim()),
          employerContributions: (salaryState.employerContributions || selectedSalary.employerContributions).filter((ec: any) => ec.name.trim()),
        };

        const response = await fetch(
          `${process.env.REACT_APP_API_BASE_URL || 'http://0.0.0.0:5000'}/api/hr/employees/${selected._id}/salary`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(salaryPayload),
          }
        );

        if (!response.ok) throw new Error('Failed to update salary details');
      }

      // Reload employees and close
      await loadEmployees();
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    }

    setSaving(false);
  };

  return (
    <div className="emp-list-container">
      <div className="emp-list-header">
        <h1>Employee Directory</h1>
      </div>

      {/* Search Bar */}
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Search by name, email, or employee ID..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-alert">{error}</div>}
      {loading && <div className="loading-state">Loading employees...</div>}

      {/* Employees Table */}
      {!loading && (
        <div className="table-wrapper">
          <table className="employees-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} onClick={() => handleOpenEmployee(emp)} className="emp-row">
                    <td>{emp.employeeId}</td>
                    <td className="emp-name">{emp.firstName} {emp.lastName}</td>
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
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selected.firstName} {selected.lastName}</h2>
              <button className="close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            {error && <div className="error-alert-modal">{error}</div>}

            <div className="modal-body">
              {/* Personal Information */}
              <div className="detail-section">
                <h3>Personal Information</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Employee ID</label>
                    <div className="read-only-value">{selected.employeeId}</div>
                  </div>
                  <div className="detail-field">
                    <label>First Name</label>
                    <div className="read-only-value">{selected.firstName}</div>
                  </div>
                  <div className="detail-field">
                    <label>Last Name</label>
                    <div className="read-only-value">{selected.lastName}</div>
                  </div>
                  <div className="detail-field">
                    <label>Personal Email</label>
                    {editMode ? (
                      <input
                        type="email"
                        value={formState.personalEmail || ''}
                        onChange={(e) => handleFieldChange('personalEmail', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.personalEmail}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>Phone</label>
                    {editMode ? (
                      <input
                        type="tel"
                        value={formState.phone || ''}
                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.phone || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>Date of Birth</label>
                    {editMode ? (
                      <input
                        type="date"
                        value={formState.dob ? new Date(formState.dob).toISOString().slice(0, 10) : ''}
                        onChange={(e) => handleFieldChange('dob', new Date(e.target.value).toISOString())}
                      />
                    ) : (
                      <div className="read-only-value">
                        {formState.dob ? new Date(formState.dob).toLocaleDateString() : '-'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Information */}
              <div className="detail-section">
                <h3>Job Information</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Designation</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.designation || ''}
                        onChange={(e) => handleFieldChange('designation', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.designation}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>Department</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.department || ''}
                        onChange={(e) => handleFieldChange('department', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.department || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>Joining Date</label>
                    <div className="read-only-value">
                      {new Date(formState.joiningDate || '').toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="detail-section">
                <h3>Address</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Street</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.address?.street || ''}
                        onChange={(e) => handleNestedFieldChange('address', 'street', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.address?.street || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>City</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.address?.city || ''}
                        onChange={(e) => handleNestedFieldChange('address', 'city', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.address?.city || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>State</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.address?.state || ''}
                        onChange={(e) => handleNestedFieldChange('address', 'state', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.address?.state || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>ZIP</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.address?.zip || ''}
                        onChange={(e) => handleNestedFieldChange('address', 'zip', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.address?.zip || '-'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="detail-section">
                <h3>Bank Details</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>Bank Name</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.bankDetails?.bankName || ''}
                        onChange={(e) => handleNestedFieldChange('bankDetails', 'bankName', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.bankDetails?.bankName || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>Account Number</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.bankDetails?.accountNumber || ''}
                        onChange={(e) => handleNestedFieldChange('bankDetails', 'accountNumber', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.bankDetails?.accountNumber || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>IFSC Code</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.bankDetails?.ifscCode || ''}
                        onChange={(e) => handleNestedFieldChange('bankDetails', 'ifscCode', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.bankDetails?.ifscCode || '-'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Information */}
              <div className="detail-section">
                <h3>Tax Information</h3>
                <div className="detail-grid">
                  <div className="detail-field">
                    <label>PAN</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.taxInfo?.pan || ''}
                        onChange={(e) => handleNestedFieldChange('taxInfo', 'pan', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.taxInfo?.pan || '-'}</div>
                    )}
                  </div>
                  <div className="detail-field">
                    <label>UAN</label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formState.taxInfo?.uan || ''}
                        onChange={(e) => handleNestedFieldChange('taxInfo', 'uan', e.target.value)}
                      />
                    ) : (
                      <div className="read-only-value">{formState.taxInfo?.uan || '-'}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Salary Details */}
              {selectedSalary && (
                <div className="detail-section">
                  <h3>Salary Structure</h3>
                  
                  <div className="salary-info">
                    <label>Annual CTC</label>
                    {editMode ? (
                      <input
                        type="number"
                        value={salaryState.annualCTC || ''}
                        onChange={(e) => setSalaryState((prev) => ({ ...prev, annualCTC: Number(e.target.value) }))}
                      />
                    ) : (
                      <div className="read-only-value">₹ {salaryState.annualCTC?.toLocaleString()}</div>
                    )}
                  </div>

                  {/* Earnings */}
                  <div className="salary-subsection">
                    <h4>Earnings</h4>
                    <div className="salary-components">
                      {(salaryState.earnings || []).map((earning: any, index: number) => (
                        <div key={index} className="salary-component-row">
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={earning.name}
                                onChange={(e) => handleSalaryComponentChange('earnings', index, 'name', e.target.value)}
                                placeholder="Component name"
                              />
                              <input
                                type="number"
                                value={earning.amount}
                                onChange={(e) => handleSalaryComponentChange('earnings', index, 'amount', e.target.value)}
                                placeholder="Amount"
                              />
                            </>
                          ) : (
                            <>
                              <span className="comp-name">{earning.name}</span>
                              <span className="comp-amount">₹ {earning.amount.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="salary-subsection">
                    <h4>Deductions</h4>
                    <div className="salary-components">
                      {(salaryState.deductions || []).map((deduction: any, index: number) => (
                        <div key={index} className="salary-component-row">
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={deduction.name}
                                onChange={(e) => handleSalaryComponentChange('deductions', index, 'name', e.target.value)}
                                placeholder="Component name"
                              />
                              <input
                                type="number"
                                value={deduction.amount}
                                onChange={(e) => handleSalaryComponentChange('deductions', index, 'amount', e.target.value)}
                                placeholder="Amount"
                              />
                              <label className="percent-check">
                                <input
                                  type="checkbox"
                                  checked={deduction.isPercent || false}
                                  onChange={(e) => handleSalaryComponentChange('deductions', index, 'isPercent', e.target.checked)}
                                />
                                %
                              </label>
                              {deduction.isPercent && (
                                <input
                                  type="text"
                                  value={deduction.percentOf || ''}
                                  onChange={(e) => handleSalaryComponentChange('deductions', index, 'percentOf', e.target.value)}
                                  placeholder="% of (e.g., Basic)"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <span className="comp-name">{deduction.name}</span>
                              <span className="comp-amount">
                                {deduction.isPercent ? `${deduction.amount}% of ${deduction.percentOf}` : `₹ ${deduction.amount.toLocaleString()}`}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Employer Contributions */}
                  <div className="salary-subsection">
                    <h4>Employer Contributions</h4>
                    <div className="salary-components">
                      {(salaryState.employerContributions || []).map((contribution: any, index: number) => (
                        <div key={index} className="salary-component-row">
                          {editMode ? (
                            <>
                              <input
                                type="text"
                                value={contribution.name}
                                onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'name', e.target.value)}
                                placeholder="Component name"
                              />
                              <input
                                type="number"
                                value={contribution.amount}
                                onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'amount', e.target.value)}
                                placeholder="Amount"
                              />
                              <label className="percent-check">
                                <input
                                  type="checkbox"
                                  checked={contribution.isPercent || false}
                                  onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'isPercent', e.target.checked)}
                                />
                                %
                              </label>
                              {contribution.isPercent && (
                                <input
                                  type="text"
                                  value={contribution.percentOf || ''}
                                  onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'percentOf', e.target.value)}
                                  placeholder="% of (e.g., Basic)"
                                />
                              )}
                            </>
                          ) : (
                            <>
                              <span className="comp-name">{contribution.name}</span>
                              <span className="comp-amount">
                                {contribution.isPercent ? `${contribution.amount}% of ${contribution.percentOf}` : `₹ ${contribution.amount.toLocaleString()}`}
                              </span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!editMode ? (
                <button className="btn-primary" onClick={() => setEditMode(true)}>
                  Edit
                </button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => { setEditMode(false); setFormState({ ...selected }); setSalaryState(selectedSalary || {}); }}>
                    Cancel
                  </button>
                  <button className="btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
