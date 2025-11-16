import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllEmployees, updateEmployee } from '../services/employeesApi';
import { EmployeeData } from '../types/onboarding';
import './EmployeesPage.css';

export default function EmployeesPage() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<EmployeeData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState<Partial<EmployeeData>>({});
  const [savingLoading, setSavingLoading] = useState(false);

  // Load all employees
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

  // Open employee detail modal
  const handleOpenEmployee = (emp: EmployeeData) => {
    setSelected(emp);
    setFormState({ ...emp });
    setEditMode(false);
    setError('');
    setSuccess('');
  };

  // Close modal
  const handleCloseModal = () => {
    setSelected(null);
    setEditMode(false);
    setFormState({});
  };

  // Update simple field
  const handleFieldChange = (key: keyof EmployeeData, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update nested object fields
  const handleNestedFieldChange = (
    parent: 'address' | 'bankDetails' | 'taxInfo',
    key: string,
    value: any
  ) => {
    setFormState((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [key]: value,
      },
    }));
  };

  // Save changes
  const handleSave = async () => {
    if (!selected || !token) return;

    setSavingLoading(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateEmployee(selected._id, formState, token);
      setEmployees((prev) =>
        prev.map((emp) => (emp._id === updated._id ? updated : emp))
      );
      setSelected(updated);
      setEditMode(false);
      setSuccess('Employee details updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    }

    setSavingLoading(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setFormState({ ...selected });
    setEditMode(false);
    setError('');
  };

  return (
    <div className="employees-page-container">
      <div className="employees-page-header">
        <h1>Employee Management</h1>
        <button className="reload-btn" onClick={loadEmployees} disabled={loading}>
          {loading ? 'Loading...' : 'Reload'}
        </button>
      </div>

      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      {loading && !employees.length ? (
        <div className="loading-state">Loading employees...</div>
      ) : (
        <div className="employees-grid">
          {employees.length === 0 ? (
            <div className="empty-state">No employees found</div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp._id}
                className="employee-card-grid"
                onClick={() => handleOpenEmployee(emp)}
              >
                <div className="card-header">
                  <h3>
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <span className={`status-badge ${emp.isActive ? 'active' : 'inactive'}`}>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-info">
                  <p>
                    <strong>ID:</strong> {emp.employeeId}
                  </p>
                  <p>
                    <strong>Designation:</strong> {emp.designation}
                  </p>
                  <p>
                    <strong>Department:</strong> {emp.department || 'N/A'}
                  </p>
                  <p>
                    <strong>Email:</strong> {emp.personalEmail}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Employee Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selected.firstName} {selected.lastName}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ✕
              </button>
            </div>

            {error && <div className="error-alert">{error}</div>}
            {success && <div className="success-alert">{success}</div>}

            <div className="modal-body">
              {/* Personal Information Section */}
              <div className="form-section">
                <h3>Personal Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input
                      type="text"
                      value={formState.employeeId || ''}
                      disabled
                      className="input-disabled"
                      title="Employee ID"
                      placeholder="Employee ID"
                    />
                  </div>

                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formState.firstName || ''}
                      disabled
                      className="input-disabled"
                      title="First Name"
                      placeholder="First Name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formState.lastName || ''}
                      disabled
                      className="input-disabled"
                      title="Last Name"
                      placeholder="Last Name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      value={formState.personalEmail || ''}
                      onChange={(e) =>
                        handleFieldChange('personalEmail', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      title="Personal Email"
                      placeholder="Personal Email"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={formState.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="9876543210"
                    />
                  </div>

                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      value={
                        formState.dob
                          ? new Date(formState.dob).toISOString().slice(0, 10)
                          : ''
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          'dob',
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : ''
                        )
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                    />
                  </div>
                </div>
              </div>

              {/* Job Information Section */}
              <div className="form-section">
                <h3>Job Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Designation</label>
                    <input
                      type="text"
                      value={formState.designation || ''}
                      onChange={(e) =>
                        handleFieldChange('designation', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="Software Engineer"
                    />
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      value={formState.department || ''}
                      onChange={(e) =>
                        handleFieldChange('department', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="Engineering"
                    />
                  </div>

                  <div className="form-group">
                    <label>Joining Date</label>
                    <input
                      type="date"
                      value={
                        formState.joiningDate
                          ? new Date(formState.joiningDate)
                              .toISOString()
                              .slice(0, 10)
                          : ''
                      }
                      onChange={(e) =>
                        handleFieldChange(
                          'joiningDate',
                          e.target.value
                            ? new Date(e.target.value).toISOString()
                            : ''
                        )
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formState.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        handleFieldChange('isActive', e.target.value === 'active')
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      title="Employment status"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="form-section">
                <h3>Address</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Street</label>
                    <input
                      type="text"
                      value={formState.address?.street || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'street', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="123 Main St"
                      title="Street address"
                    />
                  </div>

                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={formState.address?.city || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'city', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="New York"
                      title="City"
                    />
                  </div>

                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={formState.address?.state || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'state', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="NY"
                      title="State"
                    />
                  </div>

                  <div className="form-group">
                    <label>ZIP Code</label>
                    <input
                      type="text"
                      value={formState.address?.zip || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'zip', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="10001"
                      title="ZIP code"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="form-section">
                <h3>Bank Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Bank Name</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.bankName || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'bankName', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="Example Bank"
                    />
                  </div>

                  <div className="form-group">
                    <label>Account Number</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.accountNumber || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'accountNumber', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="1234567890"
                    />
                  </div>

                  <div className="form-group">
                    <label>IFSC Code</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.ifscCode || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'ifscCode', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="EXAM0001234"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Information Section */}
              <div className="form-section">
                <h3>Tax Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>PAN</label>
                    <input
                      type="text"
                      value={formState.taxInfo?.pan || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('taxInfo', 'pan', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="ABCDE1234F"
                    />
                  </div>

                  <div className="form-group">
                    <label>UAN</label>
                    <input
                      type="text"
                      value={formState.taxInfo?.uan || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('taxInfo', 'uan', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="UAN Number"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {!editMode ? (
                <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                  Edit
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={savingLoading}
                  >
                    {savingLoading ? 'Saving...' : 'Save Changes'}
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
