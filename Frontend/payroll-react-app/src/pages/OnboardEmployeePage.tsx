// OnboardEmployeePage.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardEmployeeApi } from '../services/onboardingApi';

// Import the new types and validator
import {
  validateOnboardingForm,
  ValidationError,
} from '../utils/validationUtils';
import type { OnboardingFormData } from '../types/onboarding';
import './OnboardEmployeePage.css';

// Define the shape of the salary components in state
type SalaryComponent = {
  name: string;
  amount: number;
  isPercent?: boolean;
  percentOf?: string;
};

// Define the full request payload for the *new* backend endpoint
// This matches the new IOnboardData interface in your service
export interface OnboardEmployeeRequest {
  email: string;
  // No password
  // No employeeId
  firstName: string;
  lastName: string;
  designation: string;
  joiningDate: string;
  annualCTC: number;
  personalEmail: string;
  department: string;
  phone: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
  };
  taxInfo: {
    pan: string;
  };
  // Full salary structure
  earnings: SalaryComponent[];
  deductions: SalaryComponent[];
  employerContributions: SalaryComponent[];
}

export default function OnboardEmployeePage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Changed to string for message
  const [validationErrors, setValidationErrors] = useState<ValidationError>({});

  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [error]);

  const [formData, setFormData] = useState<OnboardingFormData>({
    email: '',
    // password: '', // <-- REMOVED
    // employeeId: '', // <-- REMOVED
    firstName: '',
    lastName: '',
    designation: '',
    joiningDate: '',
    annualCTC: '',
    personalEmail: '',
    department: '',
    phone: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    pan: '',
  });

  const [salaryData, setSalaryData] = useState<{earnings: SalaryComponent[]; deductions: SalaryComponent[]; employerContributions: SalaryComponent[]}>({
    earnings: [
      { name: 'Basic Salary', amount: 0 },
      { name: 'HRA', amount: 0 },
      { name: 'Allowance', amount: 0 },
    ],
    deductions: [
      { name: 'Provident Fund', amount: 0, isPercent: false, percentOf: 'Basic' },
      { name: 'Insurance', amount: 0, isPercent: false, percentOf: 'Basic' },
      { name: 'Professional Tax', amount: 0, isPercent: false, percentOf: 'Basic' },
    ],
    employerContributions: [
      { name: 'Employer PF', amount: 0, isPercent: false, percentOf: 'Basic' },
    ],
  });

  // Toast system
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error' | 'info'; message: string }[]>([]);
  const pushToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // Derived salary totals
  const monthlyEarningsTotal = useMemo(() => salaryData.earnings.reduce((sum, c) => sum + (c.amount || 0), 0), [salaryData.earnings]);
  const monthlyDeductionsTotal = useMemo(() => salaryData.deductions.reduce((sum, c) => sum + (c.amount || 0), 0), [salaryData.deductions]);
  const monthlyEmployerTotal = useMemo(() => salaryData.employerContributions.reduce((sum, c) => sum + (c.amount || 0), 0), [salaryData.employerContributions]);
  const monthlyGrossApprox = monthlyEarningsTotal + monthlyEmployerTotal; // employer contributions part of CTC
  const annualFromComponents = monthlyGrossApprox * 12;
  const ctcNumber = parseInt(formData.annualCTC || '0');
  const ctcMismatch = ctcNumber > 0 ? Math.abs(ctcNumber - annualFromComponents) : 0;
  const ctcMismatchPercent = ctcNumber > 0 ? ((ctcMismatch / ctcNumber) * 100).toFixed(2) : '0';

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: OnboardingFormData) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Auto-distribute CTC when annualCTC changes
    if (name === 'annualCTC' && value) {
      const ctc = parseInt(value);
      if (ctc > 0) {
        distributeCTC(ctc);
      }
    }
  };

  // Auto-distribute CTC across salary components
  const distributeCTC = (annualCTC: number) => {
    const monthlyGross = annualCTC / 12;
    // Distribution logic: Basic (40%), HRA (20%), Allowance (15%), Employer PF (12%), PF (12%), Insurance (0.5%), Prof Tax (0.5%)
    const basic = Math.round(monthlyGross * 0.40);
    const hra = Math.round(monthlyGross * 0.20);
    const allowance = Math.round(monthlyGross * 0.15);
    const employerPF = Math.round(monthlyGross * 0.12);
    const pf = Math.round(monthlyGross * 0.12);
    const insurance = Math.round(monthlyGross * 0.005);
    const profTax = Math.round(monthlyGross * 0.005);

    setSalaryData({
      earnings: [
        { name: 'Basic Salary', amount: basic },
        { name: 'HRA', amount: hra },
        { name: 'Allowance', amount: allowance },
      ],
      deductions: [
        { name: 'Provident Fund', amount: pf, isPercent: false, percentOf: 'Basic' },
        { name: 'Insurance', amount: insurance, isPercent: false, percentOf: 'Basic' },
        { name: 'Professional Tax', amount: profTax, isPercent: false, percentOf: 'Basic' },
      ],
      employerContributions: [
        { name: 'Employer PF', amount: employerPF, isPercent: false, percentOf: 'Basic' },
      ],
    });
  };

  const handleSalaryComponentChange = (
    type: 'earnings' | 'deductions' | 'employerContributions',
    index: number,
    field: string,
    value: any
  ) => {
    setSalaryData((prev) => {
      const updatedComponents = [...prev[type]];
      const component: any = { ...updatedComponents[index] };

      if (component) {
        if (field === 'amount') {
          component[field] = parseFloat(value) || 0;
        } else if (field === 'isPercent') {
          component[field] = value;
        } else {
          component[field] = value;
        }
        updatedComponents[index] = component;
      }
      
      const newSalaryData = { ...prev, [type]: updatedComponents };
      
      // Reverse sync: update CTC when components change
      if (field === 'amount') {
        syncCTCFromComponents(newSalaryData);
      }
      
      return newSalaryData;
    });
  };

  // Sync CTC field from salary components
  const syncCTCFromComponents = (data: typeof salaryData) => {
    const monthlyEarnings = data.earnings.reduce((sum, c) => sum + (c.amount || 0), 0);
    const monthlyEmployer = data.employerContributions.reduce((sum, c) => sum + (c.amount || 0), 0);
    const calculatedAnnualCTC = (monthlyEarnings + monthlyEmployer) * 12;
    setFormData((prev) => ({
      ...prev,
      annualCTC: calculatedAnnualCTC.toString(),
    }));
  };

  const addSalaryComponent = (type: 'earnings' | 'deductions' | 'employerContributions') => {
    let newItem: Partial<SalaryComponent> = { name: '', amount: 0 };
    if (type !== 'earnings') {
      newItem.isPercent = false;
      newItem.percentOf = 'Basic';
    }
    
    setSalaryData((prev) => ({
      ...prev,
      [type]: [...prev[type], newItem as SalaryComponent],
    }));
  };

  const removeSalaryComponent = (type: 'earnings' | 'deductions' | 'employerContributions', index: number) => {
    setSalaryData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  };

  // --- REVAMPED SUBMIT HANDLER ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({});

    // Step 1: Validate form
    const errors = validateOnboardingForm(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the validation errors below');
      return;
    }

    // Step 2: Validate salary data
    const validEarnings = salaryData.earnings.filter(c => c.name.trim() && c.amount > 0);
    const validDeductions = salaryData.deductions.filter(c => c.name.trim() && c.amount > 0);
    const validEmployer = salaryData.employerContributions.filter(c => c.name.trim() && c.amount > 0);

    if (validEarnings.length === 0) {
      setError('Add at least one earning component (>0).');
      pushToast('error', 'Add at least one earning component (>0).');
      return;
    }
    if (validDeductions.length === 0) {
      setError('Add at least one deduction component (>0).');
      pushToast('error', 'Add at least one deduction component (>0).');
      return;
    }
    if (ctcNumber && annualFromComponents && Math.abs(ctcNumber - annualFromComponents) > ctcNumber * 0.1) {
      pushToast('info', 'CTC differs >10% from component total – proceeding but check amounts.');
    }

    setLoading(true);

    try {
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Step 3: Create ONE payload for the backend
      const payload: OnboardEmployeeRequest = {
        email: formData.email,
        // No password or employeeId
        firstName: formData.firstName,
        lastName: formData.lastName,
        designation: formData.designation,
        joiningDate: new Date(formData.joiningDate).toISOString(),
        annualCTC: parseInt(formData.annualCTC),
        personalEmail: formData.personalEmail,
        department: formData.department,
        phone: formData.phone,
        bankDetails: {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
        },
        taxInfo: {
          pan: formData.pan,
        },
        // Add the full salary structure
        earnings: validEarnings,
        deductions: validDeductions,
        employerContributions: validEmployer,
      };

      console.log('[OnboardEmployee] Payload about to send:', payload);

      // Step 4: Make ONE API call
      // The type for this response is in onboardingApi.ts
      const response = await onboardEmployeeApi(payload, token);
      console.log('[OnboardEmployee] Response received:', response);
      
      // Get the new employeeId from the response
      const newEmployeeId = response.data.employee.employeeId;
      setSuccess(`Employee ${newEmployeeId} onboarded successfully! Redirecting...`);
      pushToast('success', `Employee ${newEmployeeId} created.`);

      // Reset form
      setFormData({
        email: '', firstName: '', lastName: '', designation: '', joiningDate: '',
        annualCTC: '', personalEmail: '', department: '', phone: '',
        bankName: '', accountNumber: '', ifscCode: '', pan: '',
      });
      setSalaryData({
        earnings: [
          { name: 'Basic Salary', amount: 0 },
          { name: 'HRA', amount: 0 },
          { name: 'Allowance', amount: 0 },
        ],
        deductions: [
          { name: 'Provident Fund', amount: 0, isPercent: false, percentOf: 'Basic' },
          { name: 'Insurance', amount: 0, isPercent: false, percentOf: 'Basic' },
          { name: 'Professional Tax', amount: 0, isPercent: false, percentOf: 'Basic' },
        ],
        employerContributions: [
          { name: 'Employer PF', amount: 0, isPercent: false, percentOf: 'Basic' },
        ],
      });

      // Show success message then redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);

    } catch (err) {
      console.error('Onboarding error:', err);
      const message = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'Failed to onboard employee. Please try again.';
      setError(message);
      pushToast('error', message);
    }

    setLoading(false);
  };

  return (
    <div className="onboard-container">
      <div className="onboard-header">
        <button className="back-btn" onClick={handleBack}>
          ← Back to Dashboard
        </button>
      </div>

      <div className="onboard-content">
        <div className="onboard-card">
          <h1>Onboard Employee</h1>
          <p className="subtitle">Create a new employee record and salary structure.</p>

          {success && <div className="success-message">✓ {success}</div>}
          {error && <div className="error-message" ref={errorRef}>{error}</div>}

          {/* Error Summary Panel */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="error-summary">
              <strong>Fix the following:</strong>
              <ul>
                {Object.entries(validationErrors).map(([field, msg]) => (
                  <li key={field}>{field}: {msg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Salary / CTC Summary */}
          <div className="salary-summary-panel">
            <div><strong>Monthly Earnings:</strong> ₹{monthlyEarningsTotal.toLocaleString()}</div>
            <div><strong>Monthly Employer Contrib:</strong> ₹{monthlyEmployerTotal.toLocaleString()}</div>
            <div><strong>Monthly Deductions:</strong> ₹{monthlyDeductionsTotal.toLocaleString()}</div>
            <div><strong>Approx Annual From Components:</strong> ₹{annualFromComponents.toLocaleString()}</div>
            {ctcNumber > 0 && (
              <div className={ctcMismatch > ctcNumber * 0.1 ? 'ctc-warning' : 'ctc-ok'}>
                <strong>Declared CTC:</strong> ₹{ctcNumber.toLocaleString()} ({ctcMismatchPercent}% diff)
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="onboarding-form">
            
            <div className="form-section">
              <h3>Account Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Email (Login)*</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="employee@company.com"
                    className={validationErrors.email ? 'input-error' : ''}
                  />
                  {validationErrors.email && (
                    <span className="field-error">{validationErrors.email}</span>
                  )}
                </div>
                 {/* Password Field REMOVED */}
              </div>
            </div>

            <div className="form-section">
              <h3>Personal Information</h3>
              <div className="form-row">
                 {/* EmployeeID Field REMOVED */}
                <div className="form-group">
                  <label>First Name*</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    className={validationErrors.firstName ? 'input-error' : ''}
                  />
                  {validationErrors.firstName && (
                    <span className="field-error">{validationErrors.firstName}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Last Name*</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    className={validationErrors.lastName ? 'input-error' : ''}
                  />
                  {validationErrors.lastName && (
                    <span className="field-error">{validationErrors.lastName}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Personal Email*</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={formData.personalEmail}
                    onChange={handleInputChange}
                    placeholder="john@personal.com"
                    className={validationErrors.personalEmail ? 'input-error' : ''}
                  />
                  {validationErrors.personalEmail && (
                    <span className="field-error">{validationErrors.personalEmail}</span>
                  )}
                </div>
                 <div className="form-group">
                  <label>Phone*</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="9876543210"
                    className={validationErrors.phone ? 'input-error' : ''}
                  />
                  {validationErrors.phone && (
                    <span className="field-error">{validationErrors.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Job & Salary Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Designation*</label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="Software Engineer"
                    className={validationErrors.designation ? 'input-error' : ''}
                  />
                  {validationErrors.designation && (
                    <span className="field-error">{validationErrors.designation}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Department*</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Engineering"
                    className={validationErrors.department ? 'input-error' : ''}
                  />
                  {validationErrors.department && (
                    <span className="field-error">{validationErrors.department}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Joining Date*</label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleInputChange}
                    placeholder="YYYY-MM-DD"
                    title="Select joining date"
                    className={validationErrors.joiningDate ? 'input-error' : ''}
                  />
                  {validationErrors.joiningDate && (
                    <span className="field-error">{validationErrors.joiningDate}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Annual CTC (Total)*</label>
                  <input
                    type="number"
                    name="annualCTC"
                    value={formData.annualCTC}
                    onChange={handleInputChange}
                    placeholder="800000"
                    className={validationErrors.annualCTC ? 'input-error' : ''}
                  />
                  {validationErrors.annualCTC && (
                    <span className="field-error">{validationErrors.annualCTC}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Bank & Tax Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Bank Name*</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Example Bank"
                    className={validationErrors.bankName ? 'input-error' : ''}
                  />
                  {validationErrors.bankName && (
                    <span className="field-error">{validationErrors.bankName}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Account Number*</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="1234567890"
                    className={validationErrors.accountNumber ? 'input-error' : ''}
                  />
                  {validationErrors.accountNumber && (
                    <span className="field-error">{validationErrors.accountNumber}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>IFSC Code*</label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="EXAM0001234"
                    className={validationErrors.ifscCode ? 'input-error' : ''}
                  />
                  {validationErrors.ifscCode && (
                    <span className="field-error">{validationErrors.ifscCode}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>PAN*</label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleInputChange}
                    placeholder="ABCDE1234F"
                    className={validationErrors.pan ? 'input-error' : ''}
                  />
                  {validationErrors.pan && (
                    <span className="field-error">{validationErrors.pan}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* --- SALARY STRUCTURE FORMS --- */}
            
            <div className="form-section">
              <h3>Salary Structure - Monthly Earnings*</h3>
              <p className="subtitle" style={{marginBottom: '16px', fontSize: '14px'}}>Define the monthly gross salary components. Must be greater than 0.</p>
              <div className="salary-components">
                {salaryData.earnings.map((earning, index) => (
                  <div key={index} className="salary-component">
                    <div className="component-row" style={{gridTemplateColumns: '1fr 1fr auto'}}>
                      <input
                        type="text"
                        placeholder="Component Name (e.g., Basic)"
                        value={earning.name}
                        onChange={(e) => handleSalaryComponentChange('earnings', index, 'name', e.target.value)}
                        className="component-input"
                      />
                      <input
                        type="number"
                        placeholder="Amount (Monthly)"
                        value={earning.amount}
                        min="0"
                        onChange={(e) => handleSalaryComponentChange('earnings', index, 'amount', e.target.value)}
                        className="component-input"
                      />
                      {salaryData.earnings.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSalaryComponent('earnings', index)}
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSalaryComponent('earnings')}
                className="add-component-btn"
              >
                + Add Earning Component
              </button>
            </div>

            <div className="form-section">
              <h3>Salary Structure - Monthly Deductions*</h3>
               <p className="subtitle" style={{marginBottom: '16px', fontSize: '14px'}}>Define fixed monthly deductions. Must be greater than 0.</p>
              <div className="salary-components">
                {salaryData.deductions.map((deduction, index) => (
                  <div key={index} className="salary-component">
                    <div className="component-row">
                      <input
                        type="text"
                        placeholder="Component Name (e.g., Prof. Tax)"
                        value={deduction.name}
                        onChange={(e) => handleSalaryComponentChange('deductions', index, 'name', e.target.value)}
                        className="component-input"
                      />
                      <input
                        type="number"
                        placeholder="Amount (Monthly)"
                        value={deduction.amount}
                        min="0"
                        onChange={(e) => handleSalaryComponentChange('deductions', index, 'amount', e.target.value)}
                        className="component-input"
                        disabled={deduction.isPercent}
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={deduction.isPercent || false}
                          onChange={(e) => handleSalaryComponentChange('deductions', index, 'isPercent', e.target.checked)}
                        />
                        Is %
                      </label>
                      <input
                        type="text"
                        placeholder="Of (e.g., Basic)"
                        value={deduction.percentOf || ''}
                        onChange={(e) => handleSalaryComponentChange('deductions', index, 'percentOf', e.target.value)}
                        className="component-input"
                        disabled={!deduction.isPercent}
                      />
                      {salaryData.deductions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSalaryComponent('deductions', index)}
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSalaryComponent('deductions')}
                className="add-component-btn"
              >
                + Add Deduction Component
              </button>
            </div>

            <div className="form-section">
              <h3>Salary Structure - Employer Contributions (Optional)</h3>
              <div className="salary-components">
                {salaryData.employerContributions.map((contribution, index) => (
                  <div key={index} className="salary-component">
                    <div className="component-row">
                      <input
                        type="text"
                        placeholder="Component Name (e.g., Employer PF)"
                        value={contribution.name}
                        onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'name', e.target.value)}
                        className="component-input"
                      />
                      <input
                        type="number"
                        placeholder="Amount (Monthly)"
                        value={contribution.amount}
                        min="0"
                        onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'amount', e.target.value)}
                        className="component-input"
                         disabled={contribution.isPercent}
                      />
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={contribution.isPercent || false}
                          onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'isPercent', e.target.checked)}
                        />
                        Is %
                      </label>
                      <input
                        type="text"
                        placeholder="Of (e.g., Basic)"
                        value={contribution.percentOf || ''}
                        onChange={(e) => handleSalaryComponentChange('employerContributions', index, 'percentOf', e.target.value)}
                        className="component-input"
                        disabled={!contribution.isPercent}
                      />
                      {salaryData.employerContributions.length > 0 && ( // Only show remove if items exist
                        <button
                          type="button"
                          onClick={() => removeSalaryComponent('employerContributions', index)}
                          className="remove-btn"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => addSalaryComponent('employerContributions')}
                className="add-component-btn"
              >
                + Add Employer Contribution
              </button>
            </div>


            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleBack}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || Object.keys(validationErrors).length > 0}
              >
                {loading ? 'Onboarding...' : 'Onboard Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
      ))}
    </div>
    {loading && (
      <div className="loading-overlay">
        <div className="loader" />
        <span>Submitting...</span>
      </div>
    )}
    </div>
  );
}