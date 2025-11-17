/**
 * PayslipGenerationModal Component
 * Implements payslip generation UI per PAYSLIP_GENERATION_API_REFERENCE.md v2.0
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generatePayslips } from '../../services/payslipApi';
import { GeneratePayslipResponse } from '../../types/payslip';
import './PayslipGenerationModal.css';

interface PayslipGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PayslipGenerationModal: React.FC<PayslipGenerationModalProps> = ({ 
  isOpen, 
  onClose,
  onSuccess 
}) => {
  const { token } = useAuth();
  const currentDate = new Date();
  
  // Default to previous month (most common use case)
  const defaultMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
  const defaultYear = currentDate.getMonth() === 0 
    ? currentDate.getFullYear() - 1 
    : currentDate.getFullYear();
  
  const [month, setMonth] = useState<number>(defaultMonth);
  const [year, setYear] = useState<number>(defaultYear);
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratePayslipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerate = async () => {
    setError(null);
    setResult(null);

    if (!token) {
      setError('Not authenticated. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await generatePayslips({ month, year, force }, token);
      setResult(response);
      
      // Call success callback if provided
      if (onSuccess && response.success > 0) {
        onSuccess();
      }
      
      // Auto-close after 3 seconds on complete success
      if (response.success > 0 && response.failed === 0 && !response.warnings?.length) {
        setTimeout(() => {
          handleClose();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate payslips');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setMonth(defaultMonth);
    setYear(defaultYear);
    setForce(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      resetModal();
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasErrors = result && result.failed > 0;
  const hasWarnings = result && result.warnings && result.warnings.length > 0;
  const isCompleteSuccess = result && result.success > 0 && !hasErrors && !hasWarnings;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Monthly Payslips</h2>
          <button 
            className="modal-close" 
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Month Selection */}
          <div className="form-group">
            <label htmlFor="month">
              Month <span className="required">*</span>
            </label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              disabled={loading}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selection */}
          <div className="form-group">
            <label htmlFor="year">
              Year <span className="required">*</span>
            </label>
            <input
              id="year"
              type="number"
              value={year}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setYear(val);
              }}
              min={2000}
              max={2100}
              disabled={loading}
            />
            <p className="help-text">
              Must be between 2000 and 2100
            </p>
          </div>

          {/* Force Flag */}
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                disabled={loading}
              />
              <span>Force generate (allow before month end)</span>
            </label>
            {force && (
              <div className="warning-box">
                <strong>⚠️ Warning:</strong> Generating payslips before the month ends may result 
                in incomplete or inaccurate attendance data. Only use this for testing or preview purposes.
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-box">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className={`result-box ${isCompleteSuccess ? 'success' : hasErrors ? 'warning' : 'info'}`}>
              <h3>{result.message}</h3>
              
              {/* Stats Summary */}
              <div className="result-stats">
                <div className="stat">
                  <span className="stat-label">Processed</span>
                  <span className="stat-value">{result.processed}</span>
                </div>
                <div className="stat success">
                  <span className="stat-label">Success</span>
                  <span className="stat-value">{result.success}</span>
                </div>
                {result.skipped > 0 && (
                  <div className="stat info">
                    <span className="stat-label">Skipped</span>
                    <span className="stat-value">{result.skipped}</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="stat error">
                    <span className="stat-label">Failed</span>
                    <span className="stat-value">{result.failed}</span>
                  </div>
                )}
              </div>

              {/* Errors List */}
              {result.errors && result.errors.length > 0 && (
                <div className="error-list">
                  <h4>❌ Errors ({result.errors.length})</h4>
                  <ul>
                    {result.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                  <p className="help-text">
                    Fix the issues above and re-run generation. Successfully generated payslips 
                    will be skipped automatically.
                  </p>
                </div>
              )}

              {/* Warnings List */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="warning-list">
                  <h4>⚠️ Warnings ({result.warnings.length})</h4>
                  <ul>
                    {result.warnings.map((warn, index) => (
                      <li key={index}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Success Message */}
              {isCompleteSuccess && (
                <p className="success-message">
                  ✅ All payslips generated successfully! This window will close automatically.
                </p>
              )}
            </div>
          )}

          {/* Help Text */}
          {!result && !error && (
            <div className="info-box">
              <h4>ℹ️ Before you generate:</h4>
              <ul>
                <li>Ensure attendance data has been uploaded for {monthNames[month - 1]} {year}</li>
                <li>All employees must have salary structures configured</li>
                <li>Payroll can only be run after the month has ended (unless using force flag)</li>
                <li>Re-running is safe - existing payslips will be skipped</li>
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            {result && result.success > 0 ? 'Close' : 'Cancel'}
          </button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Processing payroll...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipGenerationModal;
