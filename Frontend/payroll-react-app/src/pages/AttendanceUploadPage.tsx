/**
 * Attendance Upload Page
 * Bulk upload CSV files for daily or monthly attendance records
 * 
 * Features:
 * - Auto-detection of CSV format (daily vs monthly)
 * - Preview mode for validation before commit
 * - Multiple dedupe strategies (skip/update/error)
 * - Template download for both formats
 * - Real-time validation feedback
 * - Error display with row numbers
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  uploadAttendanceCSV,
  AttendanceUploadResponse,
  AttendanceUploadParams
} from '../services/attendanceUploadApi';
import './AttendanceUploadPage.css';
import { useNavigate } from 'react-router-dom';

// Constants from backend spec
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['.csv'];
const DEFAULT_MODE = 'daily'; // Changed from 'auto' for explicit mode

const AttendanceUploadPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<'daily' | 'monthly' | 'auto'>(DEFAULT_MODE);
  const [action, setAction] = useState<'preview' | 'append' | 'overwrite'>('preview');
  const [dedupeStrategy, setDedupeStrategy] = useState<'skip' | 'update' | 'error'>('skip');
  const [delimiter, setDelimiter] = useState<string>(',');
  
  // Monthly mode filters
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);

  // Upload result state
  const [uploadResult, setUploadResult] = useState<AttendanceUploadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Handle file selection with validation
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    // Reset states
    setFileError(null);
    setError(null);
    setSuccessMessage(null);
    setUploadResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Validate file type (CSV only per spec)
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
      setFileError(`Only CSV files are supported. Selected: ${fileExtension}`);
      setFile(null);
      return;
    }

    // Validate file size (5MB limit per spec)
    if (selectedFile.size > MAX_FILE_SIZE) {
      const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
      const limitMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
      setFileError(`File size (${sizeMB}MB) exceeds ${limitMB}MB limit`);
      setFile(null);
      return;
    }

    // File is valid
    setFile(selectedFile);
  };

  /**
   * Build upload parameters from form state
   */
  const buildUploadParams = (uploadAction: 'preview' | 'append' | 'overwrite'): AttendanceUploadParams => {
    const params: AttendanceUploadParams = {
      action: uploadAction,
      dedupeStrategy,
      delimiter
    };

    // Only set mode if not auto-detect
    if (mode !== 'auto') {
      params.mode = mode;
    }

    // Add year/month for monthly mode
    if (mode === 'monthly') {
      params.year = year;
      params.month = month;
    }

    return params;
  };

  /**
   * Handle preview button click
   * Validates CSV without writing to database
   */
  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!token) {
      setError('Authentication required. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadResult(null);

    try {
      const params = buildUploadParams('preview');
      const result = await uploadAttendanceCSV(file, token, params);
      
      setUploadResult(result);

      // Set success/error message based on result
      if (result.failed === 0 && result.success > 0) {
        setSuccessMessage(
          `✓ Validation successful: ${result.success} record(s) validated. ` +
          `Ready to commit.`
        );
      } else if (result.failed > 0) {
        setError(
          `Validation found ${result.failed} error(s) in ${result.processed} record(s). ` +
          `Please fix errors before committing.`
        );
      } else if (result.success === 0) {
        setError('No valid records found in CSV file.');
      }

    } catch (err: any) {
      setError(err.message || 'Preview failed');
      console.error('[AttendanceUpload] Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle commit button click
   * Actually writes data to database
   */
  const handleCommit = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!token) {
      setError('Authentication required. Please log in again.');
      return;
    }

    // Confirm overwrite action
    if (action === 'overwrite') {
      const confirmed = window.confirm(
        'CAUTION: Overwrite mode will DELETE existing records before uploading. ' +
        'This action cannot be undone. Continue?'
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadResult(null);

    try {
      const params = buildUploadParams(action);
      const result = await uploadAttendanceCSV(file, token, params);
      
      setUploadResult(result);

      // Handle result
      if (result.success > 0 && result.failed === 0) {
        const skippedMsg = result.skipped ? ` (${result.skipped} duplicates skipped)` : '';
        setSuccessMessage(
          `✓ Upload successful: ${result.success} record(s) saved${skippedMsg}. ` +
          `Redirecting...`
        );
        
        // Navigate back after success
        setTimeout(() => {
          navigate('/attendance');
        }, 2500);
      } else if (result.failed > 0) {
        setError(
          `Upload completed with ${result.failed} error(s). ` +
          `${result.success} record(s) saved successfully.`
        );
      } else {
        setError('No records were saved. Please check your CSV file.');
      }

    } catch (err: any) {
      setError(err.message || 'Upload failed');
      console.error('[AttendanceUpload] Commit error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Download daily attendance CSV template
   * Format per backend spec: lowercase headers
   */
  const downloadDailyTemplate = () => {
    const headers = 'employeeid,date,status,checkin,checkout,hoursworked,overtimehours,notes';
    const rows = [
      'EMP001,2025-11-17,P,09:00,18:00,8,0,Regular shift',
      'EMP002,2025-11-17,PL,,,0,0,Sick leave',
      'EMP003,2025-11-17,LOP,,,0,0,Leave without pay',
      'EMP001,2025-11-18,P,09:15,18:15,8,0,'
    ];
    const csv = [headers, ...rows].join('\n');
    
    downloadCSV(csv, 'daily_attendance_template.csv');
  };

  /**
   * Download monthly attendance CSV template
   * Format per backend spec: lowercase headers
   */
  const downloadMonthlyTemplate = () => {
    const headers = 'employeeid,month,year,totalworkingdays,dayspresent,leavewithoutpay,overtimehours';
    const rows = [
      'EMP001,11,2025,22,20,2,8',
      'EMP002,11,2025,22,21,1,0',
      'EMP003,11,2025,22,19,3,5'
    ];
    const csv = [headers, ...rows].join('\n');
    
    downloadCSV(csv, 'monthly_attendance_template.csv');
  };

  /**
   * Helper to download CSV file
   */
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  /**
   * Reset form to initial state
   */
  const handleReset = () => {
    setFile(null);
    setFileError(null);
    setError(null);
    setSuccessMessage(null);
    setUploadResult(null);
    setMode(DEFAULT_MODE);
    setAction('preview');
    setDedupeStrategy('skip');
  };

  return (
    <div className="upload-container">
      {/* Header */}
      <div className="upload-header">
        <h1>Upload Attendance Records</h1>
        <p>
          Bulk upload daily or monthly attendance records via CSV file. 
          Use Preview mode to validate before committing.
        </p>
      </div>

      {/* Upload Form */}
      <div className="upload-form">
        {/* Mode Selection */}
        <div className="form-row">
          <label htmlFor="mode">Upload Mode</label>
          <select
            id="mode"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as any);
              setUploadResult(null);
            }}
            disabled={loading}
          >
            <option value="auto">Auto-detect from headers</option>
            <option value="daily">Daily (per-day records)</option>
            <option value="monthly">Monthly (aggregate records)</option>
          </select>
          <small className="help-text">
            {mode === 'daily' && 'Records saved to DailyAttendance collection'}
            {mode === 'monthly' && 'Records saved to Attendance collection'}
            {mode === 'auto' && 'Backend will detect format from CSV headers'}
          </small>
        </div>

        {/* Action Selection */}
        <div className="form-row">
          <label htmlFor="action">Action</label>
          <select
            id="action"
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
            disabled={loading}
          >
            <option value="preview">Preview only (no database changes)</option>
            <option value="append">Append (add new records)</option>
            <option value="overwrite">Overwrite (delete + replace)</option>
          </select>
          <small className="help-text">
            {action === 'preview' && '✓ Safe - validates without saving'}
            {action === 'append' && 'Adds new records, handles duplicates per strategy'}
            {action === 'overwrite' && '⚠️ Dangerous - deletes existing records first!'}
          </small>
        </div>

        {/* Dedupe Strategy */}
        <div className="form-row">
          <label htmlFor="dedupe">Duplicate Handling</label>
          <select
            id="dedupe"
            value={dedupeStrategy}
            onChange={(e) => setDedupeStrategy(e.target.value as any)}
            disabled={loading}
          >
            <option value="skip">Skip duplicates</option>
            <option value="update">Update existing records</option>
            <option value="error">Error on duplicates</option>
          </select>
          <small className="help-text">
            {dedupeStrategy === 'skip' && 'Skip duplicate records (safe for re-uploads)'}
            {dedupeStrategy === 'update' && 'Overwrite existing records with new data'}
            {dedupeStrategy === 'error' && 'Fail on duplicates (strict validation)'}
          </small>
        </div>

        {/* Delimiter */}
        <div className="form-row">
          <label htmlFor="delimiter">CSV Delimiter</label>
          <input
            id="delimiter"
            type="text"
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            maxLength={1}
            style={{ width: '80px' }}
            disabled={loading}
            placeholder=","
          />
          <small className="help-text">Usually comma (,) or semicolon (;)</small>
        </div>

        {/* Monthly Mode Filters */}
        {mode === 'monthly' && (
          <>
            <div className="form-row">
              <label htmlFor="year">Year</label>
              <input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <label htmlFor="month">Month</label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                disabled={loading}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* File Selection */}
        <div className="form-row file-row">
          <label htmlFor="file">CSV File</label>
          <input
            id="file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
          />
          {file && (
            <span className="file-info">
              ✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </span>
          )}
          {fileError && <div className="error-text">{fileError}</div>}
          <small className="help-text">
            Max size: 5MB. Required headers: {mode === 'daily' ? 'employeeid, date' : 'employeeid, month, year'}
          </small>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            onClick={handlePreview}
            disabled={loading || !file}
            className="btn-secondary"
          >
            {loading && action === 'preview' ? 'Validating...' : 'Preview'}
          </button>

          <button
            onClick={handleCommit}
            disabled={loading || !file || action === 'preview'}
            className="btn-primary"
          >
            {loading && action !== 'preview' ? 'Uploading...' : `Commit (${action})`}
          </button>

          <button
            onClick={mode === 'daily' ? downloadDailyTemplate : downloadMonthlyTemplate}
            disabled={loading}
            className="btn-secondary"
          >
            Download Template
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="btn-link"
          >
            Reset
          </button>
        </div>

        {/* Status Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <div className="upload-results">
          <h3>Upload Results</h3>
          
          <div className="results-summary">
            <div className="summary-item">
              <span className="label">Mode:</span>
              <span className="value">{uploadResult.mode}</span>
            </div>
            <div className="summary-item">
              <span className="label">Action:</span>
              <span className="value">{uploadResult.action}</span>
            </div>
            <div className="summary-item">
              <span className="label">Processed:</span>
              <span className="value">{uploadResult.processed}</span>
            </div>
            <div className="summary-item success">
              <span className="label">Success:</span>
              <span className="value">{uploadResult.success}</span>
            </div>
            <div className="summary-item failed">
              <span className="label">Failed:</span>
              <span className="value">{uploadResult.failed}</span>
            </div>
            {uploadResult.skipped !== undefined && uploadResult.skipped > 0 && (
              <div className="summary-item skipped">
                <span className="label">Skipped:</span>
                <span className="value">{uploadResult.skipped}</span>
              </div>
            )}
          </div>

          {/* Error Details */}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="results-errors">
              <h4>
                Errors ({uploadResult.errors.length})
                {uploadResult.errors.length > 10 && ' - showing first 10'}
              </h4>
              <ul>
                {uploadResult.errors.slice(0, 10).map((errorMsg, index) => (
                  <li key={index}>{errorMsg}</li>
                ))}
              </ul>
              {uploadResult.errors.length > 10 && (
                <p className="more-errors">
                  ...and {uploadResult.errors.length - 10} more error(s)
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="upload-help">
        <h3>CSV Format Guide</h3>
        
        <div className="help-section">
          <h4>Daily Format (lowercase headers required)</h4>
          <code>employeeid,date,status,checkin,checkout,hoursworked,overtimehours,notes</code>
          <p>Status codes: P (Present), A (Absent), LOP (Leave Without Pay), PL (Paid Leave), H (Holiday), WO (Week Off)</p>
        </div>

        <div className="help-section">
          <h4>Monthly Format (lowercase headers required)</h4>
          <code>employeeid,month,year,totalworkingdays,dayspresent,leavewithoutpay,overtimehours</code>
          <p>Month: 1-12, Year: 4-digit year (e.g., 2025)</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceUploadPage;
