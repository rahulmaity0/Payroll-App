import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import attendanceApi from '../services/attendanceApi';
import './EmployeeAttendancePage.css';

// FullCalendar imports (requires installing packages - see FULLCALENDAR_SETUP.md)
import FullCalendar from '@fullcalendar/react';
import type { EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

type AttendanceRecord = any;

const EmployeeAttendancePage: React.FC = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      if (!id || !token) return;
      try {
        setLoading(true);
        const data = await attendanceApi.getEmployeeAttendance(id, token);
        setRecords(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  // Colors for statuses
  const statusColor: Record<string, string> = {
    present: '#2ecc71',
    leave: '#f1c40f',
    absent: '#e74c3c',
    holiday: '#3498db',
  };

  // Build events for FullCalendar from attendance records
  const events: EventInput[] = useMemo(() => {
    const evts: EventInput[] = [];
    records.forEach((rec: any) => {
      // Prefer detailed day records if provided: rec.days = [{ date: '2024-02-01', status: 'present' }, ...]
      if (Array.isArray(rec.days) && rec.days.length) {
        rec.days.forEach((d: any) => {
          const status = (d.status || 'present').toString().toLowerCase();
          evts.push({
            title: status.charAt(0).toUpperCase() + status.slice(1),
            start: d.date,
            allDay: true,
            display: 'background',
            backgroundColor: statusColor[status] || '#9b59b6',
            extendedProps: { status },
          });
        });
      } else {
        // Fallback: rec has month/year or createdAt; approximate day-level events
        const recYear = rec.year || (rec.effectiveDate ? new Date(rec.effectiveDate).getFullYear() : new Date().getFullYear());
        const recMonth = typeof rec.month === 'number' ? rec.month - 1 : (rec.effectiveDate ? new Date(rec.effectiveDate).getMonth() : null);
        if (recMonth === null || recMonth === undefined) return;

        const daysInMonth = new Date(recYear, recMonth + 1, 0).getDate();
        const present = rec.daysPresent || 0;
        const leaves = rec.leaveWithoutPay || 0;

        // assign first N days as present, next M as leave, rest absent
        let dayCounter = 1;
        for (let i = 0; i < daysInMonth; i++) {
          let status = 'absent';
          if (i < present) status = 'present';
          else if (i < present + leaves) status = 'leave';

          const date = new Date(recYear, recMonth, i + 1);
          evts.push({
            title: status.charAt(0).toUpperCase() + status.slice(1),
            start: date.toISOString().split('T')[0],
            allDay: true,
            display: 'background',
            backgroundColor: statusColor[status] || '#95a5a6',
            extendedProps: { status },
          });
          dayCounter++;
        }
      }
    });
    return evts;
  }, [records]);

  return (
    <div className="employee-attendance-container">
      <div className="attendance-top">
        <Link to="/attendance">← Back to Summary</Link>
        <h2>Employee Attendance</h2>
        <div className="year-select">
          <label>Year: </label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
      </div>

      {loading ? (
        <div>Loading attendance...</div>
      ) : (
        <div className="calendar-wrap">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
            eventDidMount={(info) => {
              // add tooltip text
              const status = info.event.extendedProps.status;
              if (status) {
                (info.el as HTMLElement).setAttribute('title', status);
              }
            }}
          />
        </div>
      )}

      <div className="legend">
        <strong>Legend:</strong>
        <span className="legend-box present" /> Worked
        <span className="legend-box leave" /> Leave
        <span className="legend-box absent" /> Absent
        <span className="legend-box holiday" /> Holiday
      </div>
    </div>
  );
};

export default EmployeeAttendancePage;
