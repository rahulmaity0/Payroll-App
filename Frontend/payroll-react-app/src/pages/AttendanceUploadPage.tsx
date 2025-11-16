import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import attendanceUploadApi from '../services/attendanceUploadApi';
import './AttendanceUploadPage.css';
import { useNavigate } from 'react-router-dom';

const AttendanceUploadPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [action, setAction] = useState<'preview' | 'append' | 'overwrite'>('preview');
  const [dedupeStrategy, setDedupeStrategy] = useState<'skip' | 'update' | 'error'>('skip');
  const [delimiter, setDelimiter] = useState(',');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setFileError(null);
    
    if (f) {
      // Validate file format
      const validFormats = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const isValidFormat = validFormats.includes(f.type) || f.name.endsWith('.csv') || f.name.endsWith('.xlsx');
      
      if (!isValidFormat) {
        setFileError('Please upload a CSV or XLSX file');
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
  };

  const handlePreview = async () => {
    setError(null);
    if (!file) return setError('Please select a file');
    if (!token) return setError('Not authenticated');
    try {
      setLoading(true);
      const res = await attendanceUploadApi.uploadAttendanceFile(file, token, { mode, action: 'preview', dedupeStrategy, delimiter });
      setPreviewResult(res);
    } catch (err: any) {
      setError(err.message || 'Preview failed');
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
      const params: any = { mode, action, dedupeStrategy, delimiter };
      if (mode === 'monthly') {
        params.year = year;
        params.month = month;
      }
      const res = await attendanceUploadApi.uploadAttendanceFile(file, token, params);
      setPreviewResult(res);
      // If successful writes, show success notification and navigate back
      if (res && (res.successCount || res.recordsProcessed || res.processed)) {
        setSuccessMessage(res.message || 'Upload successful');
        setTimeout(() => navigate('/attendance'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadDailyTemplate = () => {
    const csv = 'employeeId,email,date,status,inTime,outTime,hoursWorked,overtimeHours,leaveType,notes\nEMP001,alice@company.com,2025-10-01,present,09:15,18:00,8,0,,On-site\nEMP002,bob@company.com,2025-10-01,leave,,,,,sick,Medical leave';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_attendance_template.csv';
    a.click();
  };

  const downloadMonthlyTemplate = () => {
    const csv = 'employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours,variableEarnings\nEMP001,10,2025,22,20,2,5,"bonus:5000|commission:0"';
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
        <p>Upload CSV/XLSX files. Preview the parsed rows before committing.</p>
      </div>

      <div className="upload-form">
        <div className="form-row">
          <label>Mode</label>
          <select value={mode} onChange={(e) => { setMode(e.target.value as any); setPreviewResult(null); }}>
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
          <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} />
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
              <div>Processed: {previewResult.processed ?? previewResult.recordsProcessed ?? '-'}</div>
              <div>Success: {previewResult.successCount ?? '-'}</div>
              <div>Failures: {previewResult.failureCount ?? 0}</div>
              {previewResult.skippedCount !== undefined && <div>Skipped: {previewResult.skippedCount}</div>}
            </div>
            {previewResult.errors && previewResult.errors.length > 0 && (
              <div className="preview-errors">
                <h4>Errors {previewResult.errors.length > 10 ? `(showing first 10 of ${previewResult.errors.length})` : ''}</h4>
                <table>
                  <thead>
                    <tr><th>Row</th><th>Employee ID</th><th>Message</th></tr>
                  </thead>
                  <tbody>
                    {previewResult.errors.slice(0, 10).map((e: any, i: number) => (
                      <tr key={i}><td>{e.row ?? e.index ?? '-'}</td><td>{e.employeeId ?? e.field ?? '-'}</td><td>{e.error ?? e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceUploadPage;
