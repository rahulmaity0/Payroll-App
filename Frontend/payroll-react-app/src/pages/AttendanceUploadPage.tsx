import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { uploadAttendanceFile, UploadResponse } from '../services/attendanceUploadApi';
import './AttendanceUploadPage.css';
import { useNavigate } from 'react-router-dom';

const AttendanceUploadPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<'daily' | 'monthly' | 'auto'>('daily');
  const [action, setAction] = useState<'preview' | 'append' | 'overwrite'>('preview');
  const [dedupeStrategy, setDedupeStrategy] = useState<'skip' | 'update' | 'error'>('skip');
  const [delimiter, setDelimiter] = useState(',');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [previewResult, setPreviewResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setFileError(null);
    
    if (f) {
      // Validate file format - only CSV supported per spec
      const isValidFormat = f.type === 'text/csv' || f.name.endsWith('.csv');
      
      if (!isValidFormat) {
        setFileError('Please upload a CSV file only');
        setFile(null);
        return;
      }

      // Validate file size
      if (f.size > MAX_FILE_SIZE) {
        setFileError(`File size exceeds 5MB limit (current: ${(f.size / 1024 / 1024).toFixed(2)}MB)`);
        setFile(null);
        return;
      }

      setFile(f);
    } else {
      setFile(null);
    }
    
    setPreviewResult(null);
    setError(null);
    setSuccessMessage(null);
  };

  const handlePreview = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!file) return setError('Please select a file');
    if (!token) return setError('Not authenticated');
    
    try {
      setLoading(true);
      const params: any = { 
        action: 'preview', 
        dedupeStrategy, 
        delimiter 
      };
      
      // Only set mode if not auto-detect
      if (mode !== 'auto') {
        params.mode = mode;
      }
      
      if (mode === 'monthly') {
        params.year = year;
        params.month = month;
      }
      
      const res = await uploadAttendanceFile(file, token, params);
      setPreviewResult(res);
      
      if (res.failed === 0 && res.success > 0) {
        setSuccessMessage(`✓ Preview successful: ${res.success} records validated`);
      } else if (res.failed > 0) {
        setError(`Found ${res.failed} error(s) in ${res.processed} records`);
      }
    } catch (err: any) {
      setError(err.message || 'Preview failed');
      console.error('[AttendanceUpload] Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!file) return setError('Please select a file');
    if (!token) return setError('Not authenticated');
    
    try {
      setLoading(true);
      const params: any = { 
        action, 
        dedupeStrategy, 
        delimiter 
      };
      
      // Only set mode if not auto-detect
      if (mode !== 'auto') {
        params.mode = mode;
      }
      
      if (mode === 'monthly') {
        params.year = year;
        params.month = month;
      }
      
      const res = await uploadAttendanceFile(file, token, params);
      setPreviewResult(res);
      
      // If successful writes, show success notification and navigate back
      if (res && res.success > 0) {
        setSuccessMessage(`✓ ${res.message || 'Upload successful'}: ${res.success} records saved`);
        setTimeout(() => navigate('/attendance'), 2500);
      } else if (res.failed === res.processed) {
        setError('All records failed validation. Please fix errors and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      console.error('[AttendanceUpload] Commit error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadDailyTemplate = () => {
    const csv = 'employeeid,date,status,checkin,checkout,hoursworked,overtimehours,notes\nEMP001,2025-11-16,P,09:00,18:00,8,0,Regular shift\nEMP002,2025-11-16,PL,,,0,0,Sick leave\nEMP003,2025-11-16,LOP,,,0,0,Leave without pay';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_attendance_template.csv';
    a.click();
  };

  const downloadMonthlyTemplate = () => {
    const csv = 'employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours\nEMP001,11,2024,22,20,2,5\nEMP002,11,2024,22,19,0,3';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'monthly_attendance_template.csv';
    a.click();
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h1>Upload Attendance</h1>
        <p>Upload CSV files. Preview the parsed rows before committing.</p>
      </div>

      <div className="upload-form">
        <div className="form-row">
          <label>Mode</label>
          <select value={mode} onChange={(e) => { setMode(e.target.value as any); setPreviewResult(null); }}>
            <option value="auto">Auto-detect from CSV headers</option>
            <option value="daily">Daily (per-day rows)</option>
            <option value="monthly">Monthly (aggregate)</option>
          </select>
        </div>

        <div className="form-row">
          <label>Action</label>
          <select value={action} onChange={(e) => setAction(e.target.value as any)}>
            <option value="preview">Preview (validate only)</option>
            <option value="append">Append (insert/merge)</option>
            <option value="overwrite">Overwrite (replace)</option>
          </select>
        </div>

        <div className="form-row">
          <label>Deduplication</label>
          <select value={dedupeStrategy} onChange={(e) => setDedupeStrategy(e.target.value as any)}>
            <option value="skip">Skip duplicates</option>
            <option value="update">Update existing</option>
            <option value="error">Error on duplicate</option>
          </select>
        </div>

        <div className="form-row">
          <label>Delimiter</label>
          <input value={delimiter} onChange={(e) => setDelimiter(e.target.value)} style={{width:60}} />
        </div>

        {mode === 'monthly' && (
          <>
            <div className="form-row">
              <label>Year</label>
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
                min={2000}
                max={2100}
              />
            </div>

            <div className="form-row">
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="form-row file-row">
          <label>File</label>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          {file && <span style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>✓ {file.name} ({(file.size / 1024).toFixed(2)} KB)</span>}
          {fileError && <div className="error">{fileError}</div>}
        </div>

        <div className="form-actions">
          <button onClick={handlePreview} disabled={loading || !file}>Preview</button>
          <button onClick={handleCommit} disabled={loading || !file || action === 'preview'} className="primary">{action === 'append' ? 'Commit (Append)' : 'Commit (Overwrite)'}</button>
          <button onClick={mode === 'daily' ? downloadDailyTemplate : downloadMonthlyTemplate} disabled={loading} style={{marginLeft: 'auto'}}>Download Template</button>
        </div>
        {error && <div className="error">{error}</div>}
        {successMessage && <div style={{color: '#059669', marginTop: '8px'}}>✓ {successMessage}</div>}
      </div>

      <div className="preview-area">
        {loading && <div>Processing...</div>}
        {previewResult && (
          <div className="preview-result">
            <h3>Preview Result</h3>
            <div className="preview-summary">
              <div>Mode: {previewResult.mode || 'N/A'}</div>
              <div>Processed: {previewResult.processed ?? '-'}</div>
              <div>Success: {previewResult.success ?? '-'}</div>
              <div>Failures: {previewResult.failed ?? 0}</div>
              {previewResult.skipped !== undefined && <div>Skipped: {previewResult.skipped}</div>}
            </div>
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="preview-errors">
                <h4>Errors {previewResult.errors.length > 10 ? `(showing first 10 of ${previewResult.errors.length})` : ''}</h4>
                <ul style={{listStyle: 'none', padding: 0}}>
                  {previewResult.errors.slice(0, 10).map((error, i: number) => (
                    <li key={i} style={{padding: '4px 0', borderBottom: '1px solid #e5e7eb'}}>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceUploadPage;
