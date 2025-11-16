/**
 * PayslipGenerationModal Component
 * Modal for generating payslips with validations
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { generatePayslips } from '../../services/payslipApi';
import { GeneratePayslipResponse } from '../../types/payslip';
import './PayslipGenerationModal.css';

interface PayslipGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PayslipGenerationModal: React.FC<PayslipGenerationModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const currentDate = new Date();
  
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratePayslipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const validateInputs = (): string | null => {
    if (month < 1 || month > 12) {
      return 'Invalid month. Must be between 1 and 12.';
    }
    if (year < 2000 || year > 2100) {
      return 'Invalid year. Must be between 2000 and 2100.';
    }
    return null;
  };

  const handleGenerate = async () => {
    setError(null);
    setResult(null);

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      setError('Not authenticated. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const response = await generatePayslips({ month, year, force }, token);
      setResult(response);
      
      // Auto-close on complete success
      if (response.success > 0 && response.failed === 0) {
        setTimeout(() => {
          onClose();
          resetModal();
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate payslips');
      console.error('[PayslipModal] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setMonth(currentDate.getMonth() + 1);
    setYear(currentDate.getFullYear());
    setForce(false);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Generate Payslips</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="month">Month</label>
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

          <div className="form-group">
            <label htmlFor="year">Year</label>
            <input
              id="year"
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentDate.getFullYear())}
              min={2000}
              max={2100}
              disabled={loading}
            />
          </div>

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
              <p className="warning-text">
                ⚠️ Warning: Generating payslips before month end may result in incomplete attendance data.
              </p>
            )}
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className={`result-message ${result.failed > 0 ? 'result-warning' : 'result-success'}`}>
              <h3>{result.message}</h3>
              <div className="result-stats">
                <div className="stat">
                  <span className="stat-label">Processed:</span>
                  <span className="stat-value">{result.processed}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Success:</span>
                  <span className="stat-value success">{result.success}</span>
                </div>
                {result.skipped > 0 && (
                  <div className="stat">
                    <span className="stat-label">Skipped:</span>
                    <span className="stat-value skipped">{result.skipped}</span>
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="stat">
                    <span className="stat-label">Failed:</span>
                    <span className="stat-value failed">{result.failed}</span>
                  </div>
                )}
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="error-list">
                  <h4>Errors:</h4>
                  <ul>
                    {result.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings && result.warnings.length > 0 && (
                <div className="warning-list">
                  <h4>Warnings:</h4>
                  <ul>
                    {result.warnings.map((warn, index) => (
                      <li key={index}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Payslips'}
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipGenerationModal;
