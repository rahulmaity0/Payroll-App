import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateEmployee, updateSalary, getSalary, SalaryStructure } from '../services/employeesApi';
import { EmployeeData, SalaryComponent } from '../types/onboarding';
import './EmployeesPage.css';

interface EmployeesPageProps {
  employee: EmployeeData | null;
  onClose: () => void;
  onUpdate: (updatedEmployee: EmployeeData) => void;
}

export default function EmployeesPage({ employee, onClose, onUpdate }: EmployeesPageProps) {
  const { token } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [formState, setFormState] = useState<Partial<EmployeeData>>({});
  const [savingLoading, setSavingLoading] = useState(false);
  const [loadingSalary, setLoadingSalary] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Salary component state
  const [salaryState, setSalaryState] = useState<{
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
    employerContributions: SalaryComponent[];
  }>({ earnings: [], deductions: [], employerContributions: [] });

  // Keep a backup of the original salary state for cancel functionality
  const [originalSalaryState, setOriginalSalaryState] = useState<{
    earnings: SalaryComponent[];
    deductions: SalaryComponent[];
    employerContributions: SalaryComponent[];
  }>({ earnings: [], deductions: [], employerContributions: [] });

  // Initialize form state when employee changes and fetch salary data
  useEffect(() => {
    if (employee && token) {
      setFormState({ ...employee });
      setEditMode(false);
      setError('');
      setSuccess('');
      
      // Fetch salary structure separately
      const fetchSalary = async () => {
        setLoadingSalary(true);
        try {
          const salaryData = await getSalary(employee._id, token);
          const fetchedSalaryState = {
            earnings: salaryData.earnings || [],
            deductions: salaryData.deductions || [],
            employerContributions: salaryData.employerContributions || [],
          };
          setSalaryState(fetchedSalaryState);
          setOriginalSalaryState(fetchedSalaryState); // Save original for cancel
        } catch (err) {
          console.error('Failed to fetch salary data:', err);
          // If salary doesn't exist, just use empty arrays
          const emptySalaryState = {
            earnings: [],
            deductions: [],
            employerContributions: [],
          };
          setSalaryState(emptySalaryState);
          setOriginalSalaryState(emptySalaryState);
        } finally {
          setLoadingSalary(false);
        }
      };
      
      fetchSalary();
    }
  }, [employee, token]);

  if (!employee) return null;

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

  // Handle salary component changes
  const handleSalaryComponentChange = (
    type: 'earnings' | 'deductions' | 'employerContributions',
    index: number,
    field: 'name' | 'amount' | 'isPercent' | 'percentOf',
    value: any
  ) => {
    setSalaryState((prev) => {
      const updated = [...prev[type]];
      if (field === 'amount') {
        updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { ...prev, [type]: updated };
    });
  };

  // Add salary component
  const addSalaryComponent = (type: 'earnings' | 'deductions' | 'employerContributions') => {
    const newComponent: SalaryComponent = 
      type === 'earnings' 
        ? { name: '', amount: 0 }
        : { name: '', amount: 0, isPercent: false, percentOf: 'Basic' };
    
    setSalaryState((prev) => ({
      ...prev,
      [type]: [...prev[type], newComponent],
    }));
  };

  // Remove salary component
  const removeSalaryComponent = (type: 'earnings' | 'deductions' | 'employerContributions', index: number) => {
    setSalaryState((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  // Calculate annual CTC from salary components
  const calculateAnnualCTC = () => {
    const monthlyEarnings = salaryState.earnings.reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthlyEmployer = salaryState.employerContributions.reduce((sum, e) => sum + (e.amount || 0), 0);
    return (monthlyEarnings + monthlyEmployer) * 12;
  };

  // Save changes
  const handleSave = async () => {
    if (!employee || !token) return;

    setSavingLoading(true);
    setError('');
    setSuccess('');

    try {
      // Prepare employee data update (exclude salary components)
      const { earnings, deductions, employerContributions, ...employeeUpdateData } = formState;

      // Update employee basic information
      const updatedEmployee = await updateEmployee(employee._id, employeeUpdateData, token);

      // Update salary structure separately
      const annualCTC = calculateAnnualCTC();
      const salaryPayload: Partial<SalaryStructure> = {
        annualCTC,
        earnings: salaryState.earnings.filter(e => e.name.trim() && e.amount > 0),
        deductions: salaryState.deductions.filter(d => d.name.trim() && d.amount >= 0),
        employerContributions: salaryState.employerContributions.filter(ec => ec.name.trim() && ec.amount > 0),
      };

      await updateSalary(employee._id, salaryPayload, token);

      // Update local state with combined data
      const combinedData = {
        ...updatedEmployee,
        earnings: salaryPayload.earnings,
        deductions: salaryPayload.deductions,
        employerContributions: salaryPayload.employerContributions,
      };

      setFormState(combinedData);
      const updatedSalaryState = {
        earnings: salaryPayload.earnings || [],
        deductions: salaryPayload.deductions || [],
        employerContributions: salaryPayload.employerContributions || [],
      };
      setSalaryState(updatedSalaryState);
      setOriginalSalaryState(updatedSalaryState); // Update backup after successful save
      setEditMode(false);
      setSuccess('Employee details and salary structure updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Notify parent component
      onUpdate(combinedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee');
    }

    setSavingLoading(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setFormState({ ...employee });
    setSalaryState({ ...originalSalaryState }); // Restore from backup
    setEditMode(false);
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {employee.firstName} {employee.lastName}
          </h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}
        {success && <div className="success-alert">{success}</div>}

        <div className="modal-body">
          <div style={{
            padding: '12px',
            background: '#e0f2fe',
            borderRadius: '6px',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#0c4a6e'
          }}>
            📋 {editMode ? 'Editing' : 'Viewing'} employee details for <strong>{employee.firstName} {employee.lastName}</strong> (ID: {employee.employeeId})
          </div>

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
                      title="Employee ID (Auto-generated)"
                      placeholder="EMP001"
                    />
                  </div>

                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={formState.firstName || ''}
                      disabled
                      className="input-disabled"
                      title="First Name (Read-only)"
                      placeholder="John"
                    />
                  </div>

                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={formState.lastName || ''}
                      disabled
                      className="input-disabled"
                      title="Last Name (Read-only)"
                      placeholder="Doe"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Personal Email</label>
                    <input
                      type="email"
                      value={formState.personalEmail || ''}
                      onChange={(e) =>
                        handleFieldChange('personalEmail', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      title="Personal Email Address"
                      placeholder="john.doe@personal.com"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Company Email</label>
                    <input
                      type="email"
                      value={formState.employeeId ? `${formState.firstName}${formState.lastName}@employee.com`.toLowerCase() : ''}
                      disabled
                      className="input-disabled"
                      title="Auto-generated company email"
                      placeholder="johndoe@employee.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={formState.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="9876543210"
                      maxLength={10}
                      title="10-digit phone number"
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
                      title="Date of Birth"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              </div>

              {/* Job & Salary Information Section */}
              <div className="form-section">
                <h3>Job & Salary Information</h3>
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
                      title="Job designation or title"
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
                      title="Department name"
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
                      title="Select joining date"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div className="form-group">
                    <label>Employment Status</label>
                    <select
                      value={formState.isActive ? 'active' : 'inactive'}
                      onChange={(e) =>
                        handleFieldChange('isActive', e.target.value === 'active')
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      title="Current employment status"
                    >
                      <option value="active">✓ Active</option>
                      <option value="inactive">✕ Inactive</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Annual CTC (Total)</label>
                    <input
                      type="text"
                      value={
                        formState.earnings && formState.employerContributions
                          ? `₹ ${(
                              (formState.earnings.reduce((sum, e) => sum + e.amount, 0) +
                                formState.employerContributions.reduce((sum, e) => sum + e.amount, 0)) *
                              12
                            ).toLocaleString()}`
                          : 'Not available'
                      }
                      disabled
                      className="input-disabled"
                      title="Annual CTC calculated from salary components"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="form-section">
                <h3>ADDRESS</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label>STREET</label>
                    <input
                      type="text"
                      value={formState.address?.street || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'street', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="123 Main Street, Apt 4B"
                      title="Complete street address"
                    />
                  </div>

                  <div className="form-group">
                    <label>CITY</label>
                    <input
                      type="text"
                      value={formState.address?.city || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'city', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="New York"
                      title="City name"
                    />
                  </div>

                  <div className="form-group">
                    <label>STATE</label>
                    <input
                      type="text"
                      value={formState.address?.state || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'state', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="New York"
                      title="State or province"
                    />
                  </div>

                  <div className="form-group">
                    <label>ZIP</label>
                    <input
                      type="text"
                      value={formState.address?.zip || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('address', 'zip', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="10001"
                      title="ZIP or postal code"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="form-section">
                <h3>BANK DETAILS</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>BANK NAME</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.bankName || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'bankName', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="Example Bank"
                      title="Name of the bank"
                    />
                  </div>

                  <div className="form-group">
                    <label>ACCOUNT NUMBER</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.accountNumber || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'accountNumber', e.target.value)
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="1234567890"
                      title="Bank account number"
                    />
                  </div>

                  <div className="form-group">
                    <label>IFSC CODE</label>
                    <input
                      type="text"
                      value={formState.bankDetails?.ifscCode || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('bankDetails', 'ifscCode', e.target.value.toUpperCase())
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="EXAM0001234"
                      title="11-character IFSC code"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              {/* Tax Information Section */}
              <div className="form-section">
                <h3>TAX INFORMATION</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>PAN</label>
                    <input
                      type="text"
                      value={formState.taxInfo?.pan || ''}
                      onChange={(e) =>
                        handleNestedFieldChange('taxInfo', 'pan', e.target.value.toUpperCase())
                      }
                      disabled={!editMode}
                      className={editMode ? '' : 'input-disabled'}
                      placeholder="ABCDE1234F"
                      title="10-character PAN number"
                      maxLength={10}
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
                      placeholder="123456789012"
                      title="12-digit Universal Account Number (optional)"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>

              {/* Salary Structure Section */}
              <div className="form-section" style={{ background: '#fafafa', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ color: '#667eea', marginTop: 0 }}>SALARY STRUCTURE (MONTHLY)</h3>
                
                {salaryState.earnings && salaryState.earnings.length > 0 ? (
                  <>
                    {/* Earnings */}
                    <h4>💰 Earnings</h4>
                    <div className="salary-components">
                      {salaryState.earnings.map((item, index) => (
                        <div key={`earning-${index}`} className="salary-component">
                          <div className="component-row">
                            <input
                              type="text"
                              className="component-input"
                              placeholder="Component Name"
                              value={item.name}
                              onChange={(e) => handleSalaryComponentChange('earnings', index, 'name', e.target.value)}
                              disabled={!editMode}
                              title="Name of earning component"
                            />
                            <input
                              type="number"
                              className="component-input"
                              placeholder="Amount"
                              value={item.amount || ''}
                              onChange={(e) => handleSalaryComponentChange('earnings', index, 'amount', e.target.value)}
                              disabled={!editMode}
                              min="0"
                              title="Monthly amount in ₹"
                            />
                            {editMode && (
                              <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeSalaryComponent('earnings', index)}
                                title="Remove this component"
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {editMode && (
                        <button
                          type="button"
                          className="add-component-btn"
                          onClick={() => addSalaryComponent('earnings')}
                        >
                          + Add Earning Component
                        </button>
                      )}
                      <div className="form-group" style={{ background: '#f0f9ff', fontWeight: 600, marginTop: '12px', padding: '12px', borderRadius: '6px' }}>
                        <label>Total Earnings (Monthly)</label>
                        <input
                          type="text"
                          value={`₹ ${salaryState.earnings.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}`}
                          disabled
                          className="input-disabled"
                          style={{ fontWeight: 600, color: '#0369a1' }}
                        />
                      </div>
                    </div>

                    {/* Deductions */}
                    <h4 style={{ marginTop: '24px' }}>➖ Deductions</h4>
                    <div className="salary-components">
                      {salaryState.deductions && salaryState.deductions.length > 0 ? (
                        <>
                          {salaryState.deductions.map((item, index) => (
                            <div key={`deduction-${index}`} className="salary-component">
                              <div className="component-row">
                                <input
                                  type="text"
                                  className="component-input"
                                  placeholder="Component Name"
                                  value={item.name}
                                  onChange={(e) => handleSalaryComponentChange('deductions', index, 'name', e.target.value)}
                                  disabled={!editMode}
                                  title="Name of deduction component"
                                />
                                <input
                                  type="number"
                                  className="component-input"
                                  placeholder="Amount"
                                  value={item.amount || ''}
                                  onChange={(e) => handleSalaryComponentChange('deductions', index, 'amount', e.target.value)}
                                  disabled={!editMode}
                                  min="0"
                                  title="Monthly amount in ₹"
                                />
                                {editMode && (
                                  <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeSalaryComponent('deductions', index)}
                                    title="Remove this component"
                                  >
                                    ✕ Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {editMode && (
                            <button
                              type="button"
                              className="add-component-btn"
                              onClick={() => addSalaryComponent('deductions')}
                            >
                              + Add Deduction Component
                            </button>
                          )}
                          <div className="form-group" style={{ background: '#fef2f2', fontWeight: 600, marginTop: '12px', padding: '12px', borderRadius: '6px' }}>
                            <label>Total Deductions (Monthly)</label>
                            <input
                              type="text"
                              value={`₹ ${salaryState.deductions.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}`}
                              disabled
                              className="input-disabled"
                              style={{ fontWeight: 600, color: '#dc2626' }}
                            />
                          </div>
                        </>
                      ) : (
                        editMode ? (
                          <button
                            type="button"
                            className="add-component-btn"
                            onClick={() => addSalaryComponent('deductions')}
                          >
                            + Add Deduction Component
                          </button>
                        ) : (
                          <p style={{ color: '#666', fontStyle: 'italic' }}>No deductions configured</p>
                        )
                      )}
                    </div>

                    {/* Employer Contributions */}
                    <h4 style={{ marginTop: '24px' }}>🏢 Employer Contributions</h4>
                    <div className="salary-components">
                      {salaryState.employerContributions && salaryState.employerContributions.length > 0 ? (
                        <>
                          {salaryState.employerContributions.map((item, index) => (
                            <div key={`contribution-${index}`} className="salary-component">
                              <div className="component-row">
                                <input
                                  type="text"
                                  className="component-input"
                                  placeholder="Component Name"
                                  value={item.name}
                                  onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'name', e.target.value)}
                                  disabled={!editMode}
                                  title="Name of employer contribution"
                                />
                                <input
                                  type="number"
                                  className="component-input"
                                  placeholder="Amount"
                                  value={item.amount || ''}
                                  onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'amount', e.target.value)}
                                  disabled={!editMode}
                                  min="0"
                                  title="Monthly amount in ₹"
                                />
                                {editMode && (
                                  <button
                                    type="button"
                                    className="remove-btn"
                                    onClick={() => removeSalaryComponent('employerContributions', index)}
                                    title="Remove this component"
                                  >
                                    ✕ Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {editMode && (
                            <button
                              type="button"
                              className="add-component-btn"
                              onClick={() => addSalaryComponent('employerContributions')}
                            >
                              + Add Employer Contribution
                            </button>
                          )}
                          <div className="form-group" style={{ background: '#f0fdf4', fontWeight: 600, marginTop: '12px', padding: '12px', borderRadius: '6px' }}>
                            <label>Total Employer Contributions (Monthly)</label>
                            <input
                              type="text"
                              value={`₹ ${salaryState.employerContributions.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}`}
                              disabled
                              className="input-disabled"
                              style={{ fontWeight: 600, color: '#16a34a' }}
                            />
                          </div>
                        </>
                      ) : (
                        editMode ? (
                          <button
                            type="button"
                            className="add-component-btn"
                            onClick={() => addSalaryComponent('employerContributions')}
                          >
                            + Add Employer Contribution
                          </button>
                        ) : (
                          <p style={{ color: '#666', fontStyle: 'italic' }}>No employer contributions configured</p>
                        )
                      )}
                    </div>

                    {/* Net Salary Summary */}
                    <div className="salary-summary" style={{ 
                      marginTop: '20px', 
                      padding: '16px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '8px',
                      color: 'white'
                    }}>
                      <h4 style={{ margin: '0 0 12px 0', color: 'white' }}>📊 Salary Summary</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>Annual CTC</div>
                          <div style={{ fontSize: '20px', fontWeight: 700 }}>
                            ₹ {calculateAnnualCTC().toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>Monthly Gross (Earnings + Employer)</div>
                          <div style={{ fontSize: '20px', fontWeight: 700 }}>
                            ₹ {(
                              salaryState.earnings.reduce((sum, e) => sum + (e.amount || 0), 0) +
                              (salaryState.employerContributions?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)
                            ).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', opacity: 0.9 }}>Monthly Take-Home (After Deductions)</div>
                          <div style={{ fontSize: '20px', fontWeight: 700 }}>
                            ₹ {(
                              salaryState.earnings.reduce((sum, e) => sum + (e.amount || 0), 0) -
                              (salaryState.deductions?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0)
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ 
                    padding: '24px', 
                    background: '#fef3c7', 
                    borderRadius: '8px', 
                    textAlign: 'center',
                    color: '#92400e'
                  }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                      ⚠️ No salary structure configured for this employee
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      Salary details will appear here once configured.
                    </p>
                    {editMode && (
                      <button
                        type="button"
                        className="add-component-btn"
                        onClick={() => addSalaryComponent('earnings')}
                        style={{ marginTop: '12px' }}
                      >
                        + Add First Earning Component
                      </button>
                    )}
                  </div>
                )}
              </div>

        </div>

        <div className="modal-footer">
          {!editMode ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => setEditMode(true)}>
                ✏️ Edit Details
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={savingLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={savingLoading}
              >
                {savingLoading ? '⏳ Saving...' : '✓ Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
