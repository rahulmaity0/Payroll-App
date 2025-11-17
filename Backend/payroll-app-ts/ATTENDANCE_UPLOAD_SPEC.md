# Attendance Upload API - Specification

**Last Updated:** November 17, 2025

This document describes the actual API endpoints and file formats for HR to upload attendance data into the Payroll system.

## Features
- Supports both **daily** (per-day records) and **monthly** (aggregate summary) attendance uploads
- **Daily attendance is the primary source for payroll calculations** - automatically aggregated for payslip generation
- Monthly attendance is optional - used only for variable earnings/deductions
- Auto-detection of CSV format based on headers
- CSV header validation before processing
- Multiple upload modes: preview, append, overwrite
- Duplicate handling strategies: skip, update, error
- Human-editable CSV format compatible with Excel and HR tools

---

## API Endpoint

**URL:** `POST /api/hr/attendance/upload`

**Authentication:** Bearer JWT token in `Authorization` header (HR role required)

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

---

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `mode` | `daily` \| `monthly` | Auto-detect | Specifies CSV format. If omitted, server auto-detects based on headers. |
| `action` | `preview` \| `append` \| `overwrite` | `preview` | `preview` validates without saving; `append` adds new records; `overwrite` replaces existing. |
| `year` | Integer | - | Optional. Used with `month` for monthly uploads. |
| `month` | Integer (1-12) | - | Optional. Used with `year` for monthly uploads. |
| `delimiter` | String | `,` | CSV delimiter character. |
| `dedupeStrategy` | `skip` \| `update` \| `error` | `skip` | Handling for duplicate records. |

---

## File Upload Field

**Field Name:** `payrollFile` (multipart file)

**Supported Formats:** CSV

**Max Size:** 5MB (configurable)

**Important:** The multipart form field MUST be named `payrollFile`, not `attendanceFile`.

---

## Upload Modes

### Preview Mode (`action=preview`)
- Validates CSV structure and data
- Returns detailed report without saving to database
- Use this first to catch errors before committing

### Append Mode (`action=append`)
- Inserts new attendance records
- Handles duplicates based on `dedupeStrategy`
- Default mode for adding new data

### Overwrite Mode (`action=overwrite`)
- Replaces existing records for the specified date range/employee+month
- **Use with caution** - deletes existing data before inserting

---

## Duplicate Handling Strategies

| Strategy | Behavior |
|----------|----------|
| `skip` (default) | Skip duplicate records (same employeeId + date). Report as skipped. |
| `update` | Update existing records with new data from CSV. |
| `error` | Treat duplicates as errors and fail the upload for those rows. |

---

## CSV Format Auto-Detection

The server automatically detects CSV format based on headers:

- **Daily format detected** if headers include: `employeeId` AND `date`
- **Monthly format detected** if headers include: `employeeId` AND `month` AND `year`

If auto-detection fails, you'll receive an error asking to specify `mode=daily` or `mode=monthly`.

---

## CSV Formats

### 1. Daily Attendance Format (Recommended)

**Required Headers:**
- `employeeId` (string) - Employee code (e.g., EMP001)
- `date` (YYYY-MM-DD) - Attendance date

**Optional Headers:**
- `status` - One of: `P` (present), `A` (absent), `LOP` (leave without pay), `L` (leave), etc.
- `checkIn` - Check-in time (HH:mm or HH:mm:ss)
- `checkOut` - Check-out time (HH:mm or HH:mm:ss)
- `hoursWorked` - Decimal number
- `overtimeHours` - Decimal number
- `notes` - Free text

**Example CSV (Daily):**
```csv
employeeId,date,status,checkIn,checkOut,hoursWorked,overtimeHours,notes
EMP001,2024-01-01,P,09:00,18:00,8,0,On-site
EMP002,2024-01-01,LOP,,,0,0,Medical leave
EMP003,2024-01-01,P,09:30,17:30,7.5,0,Remote work
EMP001,2024-01-02,P,09:15,18:10,8,0.25,
```

**Minimal Example (Only Required Fields):**
```csv
employeeId,date
EMP001,2024-01-01
EMP001,2024-01-02
EMP002,2024-01-01
```

---

### 2. Monthly Attendance Format (Aggregate)

Use this format for monthly summary uploads when you don't have daily records.

**Required Headers:**
- `employeeId` (string) - Employee code (e.g., EMP001)
- `month` (integer 1-12) - Month number
- `year` (integer YYYY) - Year

**Optional Headers:**
- `totalWorkingDays` - Integer
- `daysPresent` - Integer
- `leaveWithoutPay` - Integer (LOP days)
- `overtimeHours` - Decimal number
- `variableEarnings` - JSON or pipe-separated (e.g., `bonus:5000|commission:2000`)
- `variableDeductions` - Similar format

**Example CSV (Monthly):**
```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,1,2024,22,20,2,8
EMP002,1,2024,22,21,1,0
EMP003,1,2024,22,22,0,5.5
```

**Minimal Example (Only Required Fields):**
```csv
employeeId,month,year
EMP001,1,2024
EMP002,1,2024
```

---

## Validation Rules

### All Uploads
- Header row is **required**
- CSV headers are **case-insensitive**
- Employee IDs must exist in the database (no auto-creation)
- File size limit: **5MB**

### Daily Format
- Required headers: `employeeId`, `date`
- Date format: `YYYY-MM-DD` (ISO 8601)
- Time fields (if present): `HH:mm` or `HH:mm:ss` (24-hour format)
- Numeric fields (hours) must be >= 0
- Unique constraint: `(employeeId, date)` combination

### Monthly Format
- Required headers: `employeeId`, `month`, `year`
- Month must be 1-12
- Year must be 4-digit integer (e.g., 2024)
- Numeric fields must be >= 0
- Unique constraint: `(employeeId, month, year)` combination

---

## API Response Format

### Success Response

**HTTP 200** (for `action=preview`)  
**HTTP 201** (for `action=append` or `action=overwrite`)

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
    { 
      "row": 12, 
      "employeeId": "EMP999", 
      "date": "2024-01-01", 
      "error": "Unknown employeeId" 
    },
    { 
      "row": 23, 
      "employeeId": "EMP005", 
      "date": "2024-01-15", 
      "error": "Invalid date format" 
    }
  ]
}
```

### Error Responses

| Status Code | Meaning | Example |
|-------------|---------|---------|
| **400 Bad Request** | Validation errors, missing required headers | `{"message": "CSV missing required daily headers: date"}` |
| **401 Unauthorized** | Missing or invalid JWT token | `{"message": "Not authorized, token failed"}` |
| **403 Forbidden** | User lacks HR role | `{"message": "Not authorized as HR"}` |
| **413 Payload Too Large** | File exceeds 5MB limit | `{"message": "File too large"}` |
| **500 Internal Server Error** | Server-side processing error | `{"message": "Error processing CSV"}` |

---

## Usage Examples

### Example 1: Preview Daily Attendance (PowerShell)

```powershell
$token = "your-jwt-token"
$headers = @{
    "Authorization" = "Bearer $token"
}

$form = @{
    payrollFile = Get-Item -Path "C:\attendance_daily.csv"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/hr/attendance/upload?mode=daily&action=preview" `
    -Method Post `
    -Headers $headers `
    -Form $form
```

### Example 2: Upload Monthly Attendance (cURL)

```bash
curl -X POST "http://localhost:5000/api/hr/attendance/upload?mode=monthly&action=append&dedupeStrategy=skip" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "payrollFile=@attendance_monthly.csv"
```

### Example 3: Auto-Detect Format (JavaScript/Axios)

```javascript
const formData = new FormData();
formData.append('payrollFile', fileInput.files[0]);

const response = await axios.post(
  'http://localhost:5000/api/hr/attendance/upload?action=preview',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  }
);

console.log('Validation Result:', response.data);
```

---

## Frontend Integration

### React Component Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const UploadAttendance = () => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('auto');
  const [action, setAction] = useState('preview');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('payrollFile', file);

    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams();
      
      if (mode !== 'auto') queryParams.append('mode', mode);
      queryParams.append('action', action);
      queryParams.append('dedupeStrategy', 'skip');

      const response = await axios.post(
        `http://localhost:5000/api/hr/attendance/upload?${queryParams}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setResult(response.data);
      alert(`Upload completed: ${response.data.successCount} successful, ${response.data.failureCount} failed`);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-attendance">
      <h2>Upload Attendance</h2>
      
      <div>
        <label>Select CSV File:</label>
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div>
        <label>Format:</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="auto">Auto-detect</option>
          <option value="daily">Daily</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <div>
        <label>Action:</label>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="preview">Preview (validate only)</option>
          <option value="append">Append (add new)</option>
          <option value="overwrite">Overwrite (replace existing)</option>
        </select>
      </div>

      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      {result && (
        <div className="result">
          <h3>Upload Result</h3>
          <p>Processed: {result.processed}</p>
          <p>Success: {result.successCount}</p>
          <p>Failed: {result.failureCount}</p>
          {result.errors.length > 0 && (
            <div>
              <h4>Errors:</h4>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    Row {err.row}: {err.error} (Employee: {err.employeeId})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadAttendance;
```

---

## Best Practices

### 1. Always Preview First
```javascript
// Step 1: Preview
const preview = await uploadAttendance(file, 'preview');
if (preview.failureCount === 0) {
  // Step 2: Commit
  await uploadAttendance(file, 'append');
}
```

### 2. Handle Large Files
- Split large CSV files into batches (e.g., 1000 rows each)
- Upload each batch separately with `action=append`
- Monitor success/failure counts

### 3. Implement Retry Logic
```javascript
const uploadWithRetry = async (file, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadAttendance(file, 'append');
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 4. Validate CSV Before Upload
```javascript
const validateCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const hasDaily = headers.includes('employeeid') && headers.includes('date');
      const hasMonthly = headers.includes('employeeid') && 
                         headers.includes('month') && 
                         headers.includes('year');
      
      if (hasDaily || hasMonthly) {
        resolve({ valid: true, format: hasDaily ? 'daily' : 'monthly' });
      } else {
        reject({ valid: false, message: 'Invalid CSV format' });
      }
    };
    reader.readAsText(file);
  });
};
```

---

## CSV Templates

### Daily Attendance Template
```csv
employeeId,date,status,checkIn,checkOut,hoursWorked,overtimeHours,notes
EMP001,2024-01-01,P,09:00,18:00,8,0,
```

### Monthly Attendance Template
```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,1,2024,22,20,2,0
```

---

## Troubleshooting

### Issue: "CSV missing required headers"

**Cause:** Required headers not found in CSV  
**Solution:** Ensure CSV has `employeeId,date` (daily) or `employeeId,month,year` (monthly)

### Issue: "Unknown employeeId"

**Cause:** Employee doesn't exist in database  
**Solution:** Onboard employee first via `/api/hr/onboard` endpoint

### Issue: Duplicates not handled correctly

**Cause:** Wrong `dedupeStrategy`  
**Solution:** Use `dedupeStrategy=update` to update existing records, or `dedupeStrategy=skip` to ignore duplicates

### Issue: File upload fails silently

**Cause:** Wrong field name  
**Solution:** Ensure multipart field is named `payrollFile`, not `attendanceFile` or `file`

---

## Server Implementation Notes

### Header Validation (Before Processing)

The server reads the first line of the CSV file to validate headers before processing:

```typescript
// From controllers/hr.controller.ts
const headers = firstLineFromCSV.split(delimiter).map(h => h.trim().toLowerCase());
const requiredDaily = ['employeeid', 'date'];
const requiredMonthly = ['employeeid', 'month', 'year'];

if (mode === 'daily') {
  const missing = requiredDaily.filter(h => !headers.includes(h));
  if (missing.length) {
    return res.status(400).json({ 
      message: `CSV missing required daily headers: ${missing.join(', ')}` 
    });
  }
}
```

This ensures early validation and clear error messages.

---

**Document Version:** 2.0  
**Last Updated:** November 16, 2025
