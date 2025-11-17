import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import employeeApi, { DailyAttendance } from '../../services/employeeApi';
import './EmployeeAttendancePage.css';

const EmployeeAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    status: 'P' as 'P' | 'A' | 'LOP' | 'PL',
    checkIn: '',
    checkOut: '',
    notes: '',
  });

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth]);

  const loadAttendance = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await employeeApi.getMyDailyAttendance(token, selectedYear, selectedMonth);
      setAttendanceRecords(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSavingAttendance(true);
    setError('');
    try {
      await employeeApi.markAttendance(token, {
        date: formData.date,
        status: formData.status,
        checkIn: formData.checkIn || undefined,
        checkOut: formData.checkOut || undefined,
        notes: formData.notes || undefined,
      });

      // Reload attendance
      await loadAttendance();
      setShowMarkForm(false);
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        status: 'P',
        checkIn: '',
        checkOut: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
      console.error('Error marking attendance:', err);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!token) return;
    setDownloadingCSV(true);
    setError('');
    try {
      await employeeApi.downloadAttendanceCSV(token, selectedYear, selectedMonth);
    } catch (err: any) {
      setError(err.message || 'Failed to download attendance CSV');
      console.error('Error downloading CSV:', err);
    } finally {
      setDownloadingCSV(false);
    }
  };

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1] || '';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'P': return 'status-present';
      case 'A': return 'status-absent';
      case 'LOP': return 'status-lop';
      case 'PL': return 'status-pl';
      case 'H': return 'status-holiday';
      case 'WO': return 'status-weekoff';
      default: return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'P': return 'Present';
      case 'A': return 'Absent';
      case 'LOP': return 'Loss of Pay';
      case 'PL': return 'Paid Leave';
      case 'H': return 'Holiday';
      case 'WO': return 'Week Off';
      default: return status;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    try {
      return new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateStats = () => {
    const presentDays = attendanceRecords.filter(r => r.status === 'P').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'A').length;
    const lopDays = attendanceRecords.filter(r => r.status === 'LOP').length;
    const plDays = attendanceRecords.filter(r => r.status === 'PL').length;
    const totalDays = attendanceRecords.length;
    const attendancePercent = totalDays > 0 ? ((presentDays + plDays) / totalDays * 100).toFixed(1) : '0.0';

    return { presentDays, absentDays, lopDays, plDays, totalDays, attendancePercent };
  };

  const stats = calculateStats();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="employee-attendance-container">
        <div className="loading-spinner">Loading attendance...</div>
      </div>
    );
  }

  return (
    <div className="employee-attendance-container">
      <div className="attendance-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/employee/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>My Attendance</h1>
        </div>
        <div className="header-actions">
          <button 
            className="mark-btn"
            onClick={() => setShowMarkForm(!showMarkForm)}
          >
            {showMarkForm ? 'Cancel' : '+ Mark Attendance'}
          </button>
          <button 
            className="download-btn"
            onClick={handleDownloadCSV}
            disabled={downloadingCSV}
          >
            {downloadingCSV ? 'Downloading...' : '📥 Download CSV'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showMarkForm && (
        <div className="mark-attendance-form">
          <h3>Mark Attendance</h3>
          <form onSubmit={handleMarkAttendance}>
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  required
                >
                  <option value="P">Present</option>
                  <option value="A">Absent</option>
                  <option value="LOP">Loss of Pay</option>
                  <option value="PL">Paid Leave</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Check In</label>
                <input
                  type="time"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Check Out</label>
                <input
                  type="time"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
            <button type="submit" className="submit-btn" disabled={savingAttendance}>
              {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </button>
          </form>
        </div>
      )}

      <div className="filters-section">
        <div className="filter-group">
          <label>Month:</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {months.map((m) => (
              <option key={m} value={m}>
                {getMonthName(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalDays}</div>
            <div className="stat-label">Total Days</div>
          </div>
        </div>
        <div className="stat-card present">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.presentDays}</div>
            <div className="stat-label">Present</div>
          </div>
        </div>
        <div className="stat-card absent">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <div className="stat-value">{stats.absentDays}</div>
            <div className="stat-label">Absent</div>
          </div>
        </div>
        <div className="stat-card lop">
          <div className="stat-icon">🔻</div>
          <div className="stat-info">
            <div className="stat-value">{stats.lopDays}</div>
            <div className="stat-label">LOP Days</div>
          </div>
        </div>
        <div className="stat-card leave">
          <div className="stat-icon">🏖️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.plDays}</div>
            <div className="stat-label">Paid Leave</div>
          </div>
        </div>
        <div className="stat-card percentage">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{stats.attendancePercent}%</div>
            <div className="stat-label">Attendance</div>
          </div>
        </div>
      </div>

      <div className="attendance-content">
        {attendanceRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h2>No Attendance Records</h2>
            <p>No attendance records found for {getMonthName(selectedMonth)} {selectedYear}</p>
            <button className="mark-btn" onClick={() => setShowMarkForm(true)}>
              Mark Your First Attendance
            </button>
          </div>
        ) : (
          <div className="attendance-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours Worked</th>
                  <th>Overtime</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record._id}>
                    <td>{formatDate(record.date)}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td>{record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}</td>
                    <td>{record.overtimeHours ? `${record.overtimeHours.toFixed(1)}h` : '-'}</td>
                    <td className="notes-cell">{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendancePage;
