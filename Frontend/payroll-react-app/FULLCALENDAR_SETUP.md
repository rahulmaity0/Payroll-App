FullCalendar Setup

This project includes a FullCalendar-based attendance view. To enable the richer calendar UI you must install the FullCalendar packages and rebuild the app.

Run in PowerShell from project root:

```powershell
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
npm start
```

Notes:
- If you use TypeScript and encounter missing types, install `@types/fullcalendar` or the plugin-specific types if necessary. Most modern `@fullcalendar/*` packages include their own types.
- After installing, navigate to Dashboard → Show Attendance → click an employee to open the calendar view.
- The calendar uses attendance API responses: if the API returns per-day `days` arrays (e.g. `[{ date: "2024-02-01", status: "present" }, ...]`) the calendar will use those exact dates. Otherwise it approximates day-level events using `month`, `year`, `totalWorkingDays`, `daysPresent`, and `leaveWithoutPay`.

If you'd like, I can also wire a click handler to open a modal with the raw record details for a selected date.
