# Attendance Upload API - Specification

This document describes the recommended API endpoints and file formats for HR to upload attendance data into the Payroll system.

Goals:
- Support both per-day (preferred) attendance records and monthly summary (aggregate) uploads.
- Provide clear validation, safe idempotent upload modes (preview / dry-run / append / overwrite), and detailed failure reporting.
- Keep CSV/XLSX format simple and human-editable while allowing export from common HR tools.

Base URL (example):
`POST https://your-payroll.example.com/api/hr/attendance/upload`

Authentication: Bearer JWT token in `Authorization` header (HR role required).

Common request headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Query params / form fields
- `mode`: `daily` | `monthly` (default `daily`). Selects which file format to expect.
- `action`: `preview` | `append` | `overwrite` (default `preview`). `preview` validates without committing.
- `year` and `month` (optional): helps server route aggregate uploads when `mode=monthly`.
- `delimiter` (optional): CSV delimiter, default `,`.

File upload field
- `attendanceFile` (multipart file) — CSV or XLSX file. Max size: 5MB (changeable).

Response: JSON with summary (see examples later).

Modes
- preview: Validate file and return a report; do not persist changes.
- append: Insert new records; skip/merge duplicates depending on `dedupeStrategy`.
- overwrite: Replace existing records for the supplied date-range / employee+month (use carefully).

Deduplication strategies (server config or request param)
- `skip` (default): skip rows that would duplicate existing employee+date records — report as skipped.
- `update`: update existing records with incoming row data.
- `error`: treat duplicates as errors (fail the upload for those rows).

Validation / Business rules (recommended)
- Employee lookup key: `employeeId` preferred. Fall back to `email` if `employeeId` missing.
- Date format: ISO `YYYY-MM-DD`. Time fields (if present) should be `HH:mm` or `HH:mm:ss` in 24-hour format.
- Allowed statuses: `present`, `absent`, `leave`, `halfday`, `holiday`, `remote` (document custom leave types in `leaveType`). Case-insensitive.
- For `daily` mode, each row must include `employeeId` (or `email`) and `date`.
- For `monthly` mode (aggregate), each row must contain `employeeId`, `month` (1-12) and `year`.
- Hours fields must be numeric and >= 0.
- Validate unique combination of (`employeeId`, `date`) for daily uploads (or action-specific behavior for duplicates).

File Formats

1) Daily (preferred) — CSV columns (header row required)

Columns (CSV header names are case-insensitive):
- `employeeId` (string) — preferred unique employee code (e.g., EMP001). Required unless `email` provided.
- `email` (string) — optional alternative identifier (unique per employee). Use if no `employeeId`.
- `date` (YYYY-MM-DD) — required.
- `status` — one of `present`, `absent`, `leave`, `halfday`, `holiday`, `remote`.
- `inTime` (optional) — `HH:mm` or `HH:mm:ss` (local timezone or include timezone if desired).
- `outTime` (optional) — `HH:mm` or `HH:mm:ss`.
- `hoursWorked` (optional) — decimal number.
- `overtimeHours` (optional) — decimal number.
- `leaveType` (optional) — e.g., `sick`, `casual`, `paid`, `unpaid`.
- `location` (optional) — office or work-from-place identifier.
- `notes` (optional) — free text.

Example CSV (daily):
```csv
employeeId,email,date,status,inTime,outTime,hoursWorked,overtimeHours,leaveType,notes
EMP001,alice@company.com,2025-10-01,present,09:15,18:00,8,0,,"On-site"
EMP002,bob@company.com,2025-10-01,leave,,,,,sick,"Medical leave"
EMP003,charlie@company.com,2025-10-01,remote,09:30,17:30,7.5,0,,"WFH"
```

2) Monthly / Aggregate — CSV columns (header required)

Use this when payroll is computed from monthly summaries instead of per-day records.

Columns:
- `employeeId` (required)
- `month` (1-12)
- `year` (YYYY)
- `totalWorkingDays` (integer)
- `daysPresent` (integer)
- `leaveWithoutPay` (integer) — LWP
- `overtimeHours` (decimal)
- `variableEarnings` (optional) — JSON string or pipe-separated list (e.g., `bonus:5000|commission:2000`)
- `variableDeductions` (optional) — similar format

Example CSV (monthly):
```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours,variableEarnings
EMP001,10,2025,22,20,2,5,"bonus:5000|commission:0"
EMP002,10,2025,22,22,0,0,
```

XLSX support
- If provided as Excel, the server should accept `.xlsx` and map the sheet's header row to the same column names.

Server-side validation steps
1. Accept file and parse first N rows (preview mode) or full file (append/overwrite).
2. Normalize headers (trim, lower-case) and map to canonical names.
3. Validate required columns as per `mode`.
4. For daily mode: validate `date` format and that `employeeId` or `email` maps to an existing employee; otherwise mark as `error: unknown employee`.
5. Validate numeric fields (hours, overtime) and enum values for `status` and `leaveType`.
6. Enforce unique `employeeId+date` constraints depending on `action` and `dedupeStrategy`.
7. If `preview`, return summary and failure rows without persisting.
8. If `append` or `overwrite`, perform database write(s) transactional per-row or per-batch, and return a detailed result report.

API Response Format

Success (200 for preview, 201 for actual upload):
```json
{
  "message": "Attendance upload processed",
  "mode": "daily",
  "action": "append",
  "processed": 100,
  "successCount": 95,
  "failureCount": 5,
  "skippedCount": 0,
  "errors": [
    { "row": 12, "employeeId": "EMP999", "date": "2025-10-01", "error": "Unknown employeeId" },
    { "row": 23, "employeeId": "EMP005", "date": "2025-10-15", "error": "Invalid date format" }
  ]
}
```

Partial failures should not leave the DB in an inconsistent state. Use transactions or per-row atomic operations with clear logging.

Error responses
- 400 Bad Request — validation errors (e.g., missing required columns). Return JSON with `errors` array for rows.
- 401 Unauthorized — missing or invalid token.
- 403 Forbidden — user lacks HR role.
- 413 Payload Too Large — file size exceeds limit.
- 422 Unprocessable Entity — semantic errors (e.g., month/year mismatch for aggregate mode).

Client-side UX recommendations
- Provide a preview step showing first 50 rows and validation issues before commit.
- Show counts: rows processed / success / failures with downloadable failure CSV.
- Allow mapping UI for column names (map headers from Excel exports with different names to canonical fields).
- Provide examples and downloadable template CSV files for `daily` and `monthly` modes.

Server implementation notes
- Prefer per-day records if business needs day-level reports and calendar visualizations.
- If the backend stores attendance per month only, convert daily rows to monthly aggregates during ingestion.
- Keep a separate historical import log table capturing filename, uploader ID, timestamp, success/failure counts, and failure details for audit.

Sample cURL (preview):
```bash
curl -X POST "https://your-payroll.example.com/api/hr/attendance/upload?mode=daily&action=preview" \
  -H "Authorization: Bearer $TOKEN" \
  -F "attendanceFile=@attendance_october.csv" \
  -F "delimiter=," \
  -F "dedupeStrategy=skip"
```

Sample cURL (append):
```bash
curl -X POST "https://your-payroll.example.com/api/hr/attendance/upload?mode=daily&action=append" \
  -H "Authorization: Bearer $TOKEN" \
  -F "attendanceFile=@attendance_october.csv"
```

Backwards compatibility
- If older CSVs contain different headers (e.g., `emp_id`, `empId`, `EmployeeID`), the server should perform header normalization and mapping heuristics.

Edge cases & notes
- Timezones: recommend storing dates in server local timezone or as ISO with timezone. For day-only records, interpret `date` as local date in company timezone.
- Half-day: represent as `status=halfday` and optionally `hoursWorked=4`.
- Overtime that crosses days: provide `overtimeHours` on the relevant date or allow separate overtime upload.
- Missing employees: return clear errors with row numbers and don't auto-create employees during attendance import.

Appendix: quick templates

- `templates/daily_attendance_template.csv` (columns as above)
- `templates/monthly_attendance_template.csv` (columns as above)

---
Document version: 1.0 — created: 2025-11-16
