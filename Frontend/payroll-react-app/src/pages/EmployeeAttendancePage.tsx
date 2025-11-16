import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDailyAttendance, setDayAttendance, deleteDayAttendance } from '../services/attendanceApi';
import { getEmployeeById } from '../services/employeesApi';
import './EmployeeAttendancePage.css';
import type { DailyAttendanceRecord } from '../types/attendance';
import { AttendanceStatusLabels, AttendanceStatusColors } from '../types/attendance';

// FullCalendar imports
import FullCalendar from '@fullcalendar/react';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

const EmployeeAttendancePage: React.FC = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [records, setRecords] = useState<DailyAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [employee, setEmployee] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    date: string;
    existingRecord?: DailyAttendanceRecord;
  } | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  // Load employee details
  useEffect(() => {
    const loadEmployee = async () => {
      if (!id || !token) return;
      try {
        const emp = await getEmployeeById(id, token);
        setEmployee(emp);
      } catch (err) {
        console.error('Failed to load employee:', err);
      }
    };
    loadEmployee();
  }, [id, token]);

  // Load daily attendance records
  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      try {
        setLoading(true);
        setError('');
        const data = await getDailyAttendance(id, token, { year, month });
        setRecords(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token, year, month]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Build events for FullCalendar from daily records
  const events: EventInput[] = records.map((rec) => ({
    id: rec._id,
    title: AttendanceStatusLabels[rec.status] || rec.status,
    start: rec.date,
    allDay: true,
    backgroundColor: AttendanceStatusColors[rec.status] || '#6b7280',
    borderColor: AttendanceStatusColors[rec.status] || '#6b7280',
    extendedProps: {
      status: rec.status,
      record: rec,
    },
  }));

  // Handle day cell click (right-click or left-click)
  const handleDateClick = (arg: DateClickArg) => {
    const clickedDate = arg.dateStr;
    const existingRecord = records.find((r) => r.date === clickedDate);

    // Open context menu
    setContextMenu({
      x: arg.jsEvent.pageX,
      y: arg.jsEvent.pageY,
      date: clickedDate,
      existingRecord,
    });
  };

  // Handle event click (clicking on existing attendance)
  const handleEventClick = (arg: EventClickArg) => {
    const record = arg.event.extendedProps.record as DailyAttendanceRecord;
    
    setContextMenu({
      x: arg.jsEvent.pageX,
      y: arg.jsEvent.pageY,
      date: record.date,
      existingRecord: record,
    });

    arg.jsEvent.preventDefault();
    arg.jsEvent.stopPropagation();
  };

  // Mark attendance for a specific date
  const markAttendance = async (status: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO') => {
    if (!contextMenu || !id || !token) return;

    try {
      setError('');
      const data = await setDayAttendance(
        {
          employee: id,
          date: contextMenu.date,
          status,
        },
        token
      );

      // Update records
      if (contextMenu.existingRecord) {
        setRecords(records.map((r) => (r._id === data._id ? data : r)));
      } else {
        setRecords([...records, data]);
      }

      setSuccess(`Marked as ${AttendanceStatusLabels[status]} for ${contextMenu.date}`);
      setTimeout(() => setSuccess(''), 3000);
      setContextMenu(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save attendance');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Delete attendance record
  const handleDelete = async () => {
    if (!contextMenu?.existingRecord || !token) return;

    if (!window.confirm(`Delete attendance for ${contextMenu.date}?`)) {
      setContextMenu(null);
      return;
    }

    try {
      await deleteDayAttendance(contextMenu.existingRecord._id, token);
      setRecords(records.filter((r) => r._id !== contextMenu.existingRecord!._id));
      setSuccess(`Deleted attendance for ${contextMenu.date}`);
      setTimeout(() => setSuccess(''), 3000);
      setContextMenu(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete attendance');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Calculate stats for current month
  const stats = {
    totalDays: records.length,
    present: records.filter((r) => r.status === 'P').length,
    absent: records.filter((r) => r.status === 'A').length,
    lop: records.filter((r) => r.status === 'LOP').length,
    paidLeave: records.filter((r) => r.status === 'PL').length,
    holiday: records.filter((r) => r.status === 'H').length,
    weekOff: records.filter((r) => r.status === 'WO').length,
  };

  return (
    <div className="employee-attendance-container">
      <div className="attendance-header">
        <Link to="/attendance" className="back-link">
          ← Back to Summary
        </Link>
        <h2>
          Employee Attendance{' '}
          {employee && (
            <span className="employee-name">
              - {employee.firstName} {employee.lastName} ({employee.employeeId})
            </span>
          )}
        </h2>
      </div>

      <div className="controls-row">
        <div className="date-filters">
          <label>Month: </label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2025, m - 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <label style={{ marginLeft: '16px' }}>Year: </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
          />
        </div>

        <div className="instructions">
          <strong>Instructions:</strong> Click on any date to mark attendance
        </div>
      </div>

      {error && <div className="error-alert">{error}</div>}
      {success && <div className="success-alert">{success}</div>}

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-label">Total Marked:</span>
          <span className="stat-value">{stats.totalDays}</span>
        </div>
        <div className="stat-item present">
          <span className="stat-label">Present:</span>
          <span className="stat-value">{stats.present}</span>
        </div>
        <div className="stat-item absent">
          <span className="stat-label">Absent:</span>
          <span className="stat-value">{stats.absent}</span>
        </div>
        <div className="stat-item lop">
          <span className="stat-label">LOP:</span>
          <span className="stat-value">{stats.lop}</span>
        </div>
        <div className="stat-item paid-leave">
          <span className="stat-label">Paid Leave:</span>
          <span className="stat-value">{stats.paidLeave}</span>
        </div>
        <div className="stat-item holiday">
          <span className="stat-label">Holiday:</span>
          <span className="stat-value">{stats.holiday}</span>
        </div>
        <div className="stat-item week-off">
          <span className="stat-label">Week Off:</span>
          <span className="stat-value">{stats.weekOff}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading attendance...</div>
      ) : (
        <div className="calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
            headerToolbar={{
              left: 'title',
              center: '',
              right: 'today prev,next',
            }}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDisplay="block"
            displayEventTime={false}
            fixedWeekCount={false}
            showNonCurrentDates={false}
            initialDate={`${year}-${String(month).padStart(2, '0')}-01`}
          />
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            {contextMenu.date}
            {contextMenu.existingRecord && (
              <span className="current-status">
                {' '}
                - {AttendanceStatusLabels[contextMenu.existingRecord.status]}
              </span>
            )}
          </div>
          <div className="context-menu-items">
            <button className="menu-item present" onClick={() => markAttendance('P')}>
              ✓ Present
            </button>
            <button className="menu-item absent" onClick={() => markAttendance('A')}>
              ✗ Absent
            </button>
            <button className="menu-item lop" onClick={() => markAttendance('LOP')}>
              ⚠ Leave Without Pay
            </button>
            <button className="menu-item paid-leave" onClick={() => markAttendance('PL')}>
              📅 Paid Leave
            </button>
            <button className="menu-item holiday" onClick={() => markAttendance('H')}>
              🎉 Holiday
            </button>
            <button className="menu-item week-off" onClick={() => markAttendance('WO')}>
              🏖 Week Off
            </button>
            {contextMenu.existingRecord && (
              <>
                <div className="menu-divider"></div>
                <button className="menu-item delete" onClick={handleDelete}>
                  🗑️ Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="legend">
        <strong>Legend:</strong>
        {Object.entries(AttendanceStatusLabels).map(([key, label]) => (
          <span key={key} className="legend-item">
            <span className="legend-color" style={{ backgroundColor: AttendanceStatusColors[key] }}></span>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default EmployeeAttendancePage;
