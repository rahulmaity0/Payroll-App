# Attendance API - Complete Documentation

**Last Updated:** November 17, 2025  
**Version:** 2.0  
**Module:** Daily & Monthly Attendance Management

---

## Table of Contents

1. [Overview](#overview)
2. [Database Collections](#database-collections)
3. [Daily Attendance CRUD APIs](#daily-attendance-crud-apis)
4. [Monthly Attendance CRUD APIs](#monthly-attendance-crud-apis)
5. [Attendance Summary API](#attendance-summary-api)
6. [Bulk Upload API](#bulk-upload-api)
7. [Status Codes & Enums](#status-codes--enums)
8. [Error Handling](#error-handling)
9. [Frontend Integration Examples](#frontend-integration-examples)
10. [Testing Guide](#testing-guide)

---

## Overview

The Attendance Module supports two parallel systems:

1. **Daily Attendance System** (New) - Individual day-by-day records
2. **Monthly Attendance System** (Legacy) - Monthly aggregate records

### Key Features
- ✅ CRUD operations for both daily and monthly records
- ✅ CSV bulk upload with auto-detection
- ✅ Monthly summary aggregation from daily records
- ✅ Duplicate prevention with unique indexes
- ✅ Multiple dedupe strategies (skip/update/error)
- ✅ Preview mode for validation before commits

### Authentication
All endpoints require:
- **Authorization:** `Bearer <JWT_TOKEN>`
- **Role:** `hr` (HR administrators only)

---

## Database Collections

### 1. DailyAttendance Collection

**Collection Name:** `daily_attendance`

**Purpose:** Stores individual daily attendance records for click-to-mark calendar interfaces.

**Schema:**
```typescript
{
  _id: ObjectId,
  employee: ObjectId,           // Ref: Employee
  date: String,                 // YYYY-MM-DD format
  status: String,               // Enum: P|A|LOP|PL|H|WO
  checkIn: String,              // HH:mm format (optional)
  checkOut: String,             // HH:mm format (optional)
  hoursWorked: Number,          // 0-24 (optional)
  overtimeHours: Number,        // ≥0 (optional)
  notes: String,                // Max 500 chars (optional)
  createdAt: Date,              // Auto-generated
  updatedAt: Date               // Auto-generated
}
```

**Unique Index:** `(employee, date)` - Prevents duplicate records for same employee on same date

**Validations:**
- `date`: Must match `/^\d{4}-\d{2}-\d{2}$/` (YYYY-MM-DD)
- `status`: Must be one of P, A, LOP, PL, H, WO
- `checkIn`/`checkOut`: Must match `/^\d{2}:\d{2}$/` (HH:mm) if provided
- `hoursWorked`: 0-24 range
- `overtimeHours`: ≥0

---

### 2. Attendance Collection

**Collection Name:** `attendance_details`

**Purpose:** Stores monthly aggregate attendance data (legacy system, still supported).

**Schema:**
```typescript
{
  _id: ObjectId,
  employee: ObjectId,           // Ref: Employee
  month: Number,                // 1-12
  year: Number,                 // e.g., 2025
  totalWorkingDays: Number,     // Total days in month
  daysPresent: Number,          // Days employee was present
  leaveWithoutPay: Number,      // LOP days (default: 0)
  overtimeHours: Number,        // Total overtime (default: 0)
  variableEarnings: [{          // Optional bonuses
    name: String,
    amount: Number
  }],
  variableDeductions: [{        // Optional deductions
    name: String,
    amount: Number
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Unique Index:** `(employee, month, year)` - One record per employee per month

---

## Daily Attendance CRUD APIs

### 1. Get Daily Attendance Records

Fetch daily attendance records for a specific employee with optional date filtering.

**Endpoint:** `GET /api/hr/employees/:employeeId/attendance/daily`

**URL Parameters:**
- `employeeId` (required): Employee MongoDB ObjectId

**Query Parameters:**
- `year` (optional): Filter by year (e.g., 2025)
- `month` (optional): Filter by month (1-12)

**Request Example:**
```http
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance/daily?year=2025&month=11
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
[
  {
    "_id": "673abc123def456789012345",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-17",
    "status": "P",
    "checkIn": "09:00",
    "checkOut": "18:00",
    "hoursWorked": 8,
    "overtimeHours": 0,
    "notes": "Regular shift",
    "createdAt": "2025-11-17T09:05:00.000Z",
    "updatedAt": "2025-11-17T09:05:00.000Z"
  },
  {
    "_id": "673abc123def456789012346",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-18",
    "status": "PL",
    "notes": "Sick leave approved",
    "createdAt": "2025-11-18T08:30:00.000Z",
    "updatedAt": "2025-11-18T08:30:00.000Z"
  }
]
```

**Response (404 Not Found):**
```json
{
  "message": "Employee not found"
}
```

**Use Cases:**
- Display employee's monthly calendar
- Generate attendance reports
- View attendance history

---

### 2. Create/Update Daily Attendance (UPSERT)

Create new daily attendance record or update existing if same employee+date already exists.

**Endpoint:** `POST /api/hr/attendance/daily`

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439012",
  "date": "2025-11-17",
  "status": "P",
  "checkIn": "09:00",
  "checkOut": "18:00",
  "hoursWorked": 8,
  "overtimeHours": 0,
  "notes": "Regular shift"
}
```

**Required Fields:**
- `employee` (ObjectId): Employee reference
- `date` (string): Date in YYYY-MM-DD format
- `status` (string): One of P, A, LOP, PL, H, WO

**Optional Fields:**
- `checkIn` (string): Check-in time in HH:mm format
- `checkOut` (string): Check-out time in HH:mm format
- `hoursWorked` (number): Decimal hours (0-24)
- `overtimeHours` (number): Decimal hours (≥0)
- `notes` (string): Text notes (max 500 chars)

**Response (201 Created):**
```json
{
  "message": "Daily attendance record saved successfully",
  "data": {
    "_id": "673abc123def456789012345",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-17",
    "status": "P",
    "checkIn": "09:00",
    "checkOut": "18:00",
    "hoursWorked": 8,
    "overtimeHours": 0,
    "notes": "Regular shift",
    "createdAt": "2025-11-17T09:05:00.000Z",
    "updatedAt": "2025-11-17T09:05:00.000Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "message": "Date must be YYYY-MM-DD format"
}
```

**UPSERT Behavior:**
- If record with same `(employee, date)` exists → Updates existing record
- If no matching record exists → Creates new record
- Unique constraint prevents duplicates
- Safe to call multiple times (idempotent)

**Use Cases:**
- Mark attendance via calendar UI
- Update attendance status (e.g., change A to PL after leave approval)
- Batch import from attendance device

---

### 3. Update Daily Attendance by ID

Update specific fields of an existing daily attendance record.

**Endpoint:** `PUT /api/hr/attendance/daily/:recordId`

**URL Parameters:**
- `recordId` (required): Daily Attendance Record ObjectId

**Request Body (all fields optional):**
```json
{
  "status": "PL",
  "notes": "Leave approved by manager"
}
```

**Response (200 OK):**
```json
{
  "message": "Daily attendance record updated successfully",
  "data": {
    "_id": "673abc123def456789012345",
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-17",
    "status": "PL",
    "notes": "Leave approved by manager",
    "updatedAt": "2025-11-17T11:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "message": "Daily attendance record not found"
}
```

**Use Cases:**
- Correct mistakes in attendance marking
- Update notes/comments
- Change status after leave approval

---

### 4. Delete Daily Attendance

Delete a specific daily attendance record.

**Endpoint:** `DELETE /api/hr/attendance/daily/:recordId`

**URL Parameters:**
- `recordId` (required): Daily Attendance Record ObjectId

**Request Example:**
```http
DELETE /api/hr/attendance/daily/673abc123def456789012345
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "message": "Daily attendance record deleted successfully"
}
```

**Response (404 Not Found):**
```json
{
  "message": "Daily attendance record not found"
}
```

**Use Cases:**
- Remove duplicate entries
- Delete test/incorrect data
- Compliance with data retention policies

---

## Monthly Attendance CRUD APIs

### 1. Get Employee Attendance (Monthly)

Fetch monthly attendance records for a specific employee.

**Endpoint:** `GET /api/hr/employees/:id/attendance`

**URL Parameters:**
- `id` (required): Employee MongoDB ObjectId

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month

**Request Example:**
```http
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance?year=2025&month=11
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "employee": "507f1f77bcf86cd799439012",
    "month": 11,
    "year": 2025,
    "totalWorkingDays": 22,
    "daysPresent": 20,
    "leaveWithoutPay": 2,
    "overtimeHours": 8,
    "variableEarnings": [
      {
        "name": "Overtime Bonus",
        "amount": 2000
      }
    ],
    "variableDeductions": [],
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-30T18:00:00.000Z"
  }
]
```

**Use Cases:**
- View monthly attendance summary
- Payroll calculations
- Attendance reports

---

### 2. Create Monthly Attendance Record

Create a new monthly attendance record.

**Endpoint:** `POST /api/hr/attendance`

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439012",
  "month": 11,
  "year": 2025,
  "totalWorkingDays": 22,
  "daysPresent": 20,
  "leaveWithoutPay": 2,
  "overtimeHours": 8,
  "variableEarnings": [
    {
      "name": "Performance Bonus",
      "amount": 5000
    }
  ],
  "variableDeductions": []
}
```

**Required Fields:**
- `employee` (ObjectId): Employee reference
- `month` (number): 1-12
- `year` (number): Year (e.g., 2025)
- `totalWorkingDays` (number): Total working days in month
- `daysPresent` (number): Days employee was present

**Optional Fields:**
- `leaveWithoutPay` (number): LOP days (default: 0)
- `overtimeHours` (number): Overtime hours (default: 0)
- `variableEarnings` (array): Additional earnings
- `variableDeductions` (array): Additional deductions

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439021",
  "employee": "507f1f77bcf86cd799439012",
  "month": 11,
  "year": 2025,
  "totalWorkingDays": 22,
  "daysPresent": 20,
  "leaveWithoutPay": 2,
  "overtimeHours": 8,
  "variableEarnings": [
    {
      "name": "Performance Bonus",
      "amount": 5000
    }
  ],
  "variableDeductions": [],
  "createdAt": "2025-11-30T10:00:00.000Z",
  "updatedAt": "2025-11-30T10:00:00.000Z"
}
```

**Response (400 Bad Request):**
```json
{
  "message": "Attendance record already exists for this month"
}
```

---

### 3. Update Monthly Attendance Record

Update an existing monthly attendance record.

**Endpoint:** `PUT /api/hr/attendance/:attId`

**URL Parameters:**
- `attId` (required): Attendance Record ObjectId

**Request Body (all fields optional):**
```json
{
  "totalWorkingDays": 22,
  "daysPresent": 21,
  "leaveWithoutPay": 1,
  "overtimeHours": 10
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439021",
  "employee": "507f1f77bcf86cd799439012",
  "month": 11,
  "year": 2025,
  "totalWorkingDays": 22,
  "daysPresent": 21,
  "leaveWithoutPay": 1,
  "overtimeHours": 10,
  "updatedAt": "2025-11-30T14:30:00.000Z"
}
```

---

### 4. Delete Monthly Attendance Record

Delete a specific monthly attendance record.

**Endpoint:** `DELETE /api/hr/attendance/:attId`

**URL Parameters:**
- `attId` (required): Attendance Record ObjectId

**Response (200 OK):**
```json
{
  "message": "Attendance record deleted successfully"
}
```

**Response (404 Not Found):**
```json
{
  "message": "Attendance record not found"
}
```

---

## Attendance Summary API

Get aggregated attendance summary for all employees for a specific month. **Automatically aggregates from DailyAttendance collection.**

**Endpoint:** `GET /api/hr/attendance/summary`

**Query Parameters:**
- `month` (required): Month number (1-12)
- `year` (required): Year (e.g., 2025)

**Request Example:**
```http
GET /api/hr/attendance/summary?month=11&year=2025
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "employee": {
      "_id": "507f1f77bcf86cd799439012",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "designation": "Software Engineer"
    },
    "month": 11,
    "year": 2025,
    "totalWorkingDays": 22,
    "daysPresent": 18,
    "leaveWithoutPay": 2,
    "paidLeave": 1,
    "absent": 1,
    "holidays": 0,
    "weekOffs": 0,
    "overtimeHours": 8.5
  },
  {
    "_id": "507f1f77bcf86cd799439013",
    "employee": {
      "_id": "507f1f77bcf86cd799439013",
      "employeeId": "EMP002",
      "firstName": "Jane",
      "lastName": "Smith",
      "designation": "Senior Developer"
    },
    "month": 11,
    "year": 2025,
    "totalWorkingDays": 20,
    "daysPresent": 19,
    "leaveWithoutPay": 0,
    "paidLeave": 1,
    "absent": 0,
    "holidays": 0,
    "weekOffs": 0,
    "overtimeHours": 0
  }
]
```

**Response (400 Bad Request):**
```json
{
  "message": "Month and year are required query parameters"
}
```

**Aggregation Logic:**

The summary is calculated from `daily_attendance` records:
- **totalWorkingDays**: Count of all days with any status
- **daysPresent**: Count of days with `status = 'P'`
- **leaveWithoutPay**: Count of days with `status = 'LOP'`
- **paidLeave**: Count of days with `status = 'PL'`
- **absent**: Count of days with `status = 'A'`
- **holidays**: Count of days with `status = 'H'`
- **weekOffs**: Count of days with `status = 'WO'`
- **overtimeHours**: Sum of all `overtimeHours` values

**Use Cases:**
- Monthly payroll processing
- Attendance reports for all employees
- Dashboard statistics
- HR analytics

---

## Bulk Upload API

Upload attendance data in bulk via CSV file. Supports both daily and monthly modes with auto-detection.

**Endpoint:** `POST /api/hr/attendance/upload` (or `/api/hr/upload/payroll`)

**Method:** POST  
**Content-Type:** multipart/form-data  
**File Field Name:** `payrollFile` ⚠️ **CRITICAL**

### Query Parameters

| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| mode | string | daily \| monthly | auto-detect | Upload mode |
| action | string | preview \| append \| overwrite | preview | Action to perform |
| dedupeStrategy | string | skip \| update \| error | skip | Duplicate handling |
| delimiter | string | any character | , | CSV delimiter |
| year | number | e.g., 2025 | - | Optional year filter |
| month | number | 1-12 | - | Optional month filter |

### CSV Format - Daily Mode

**Required Headers:** `employeeid`, `date`  
**Optional Headers:** `status`, `checkin`, `checkout`, `hoursworked`, `overtimehours`, `notes`

**Example CSV:**
```csv
employeeid,date,status,checkin,checkout,hoursworked,overtimehours,notes
EMP001,2025-11-17,P,09:00,18:00,8,0,Regular shift
EMP002,2025-11-17,PL,,,0,0,Sick leave
EMP003,2025-11-17,LOP,,,0,0,Absent without approval
EMP001,2025-11-18,P,09:15,18:15,8,0,
```

**Where Data Goes:** `daily_attendance` collection

### CSV Format - Monthly Mode

**Required Headers:** `employeeid`, `month`, `year`, `totalworkingdays`, `dayspresent`  
**Optional Headers:** `leavewithoutpay`, `overtimehours`, `variableearnings`, `variabledeductions`

**Example CSV:**
```csv
employeeid,month,year,totalworkingdays,dayspresent,leavewithoutpay,overtimehours
EMP001,11,2025,22,20,2,8
EMP002,11,2025,22,21,1,0
EMP003,11,2025,22,19,3,5
```

**Where Data Goes:** `attendance_details` collection

### Auto-Detection Logic

Backend automatically detects mode by inspecting CSV headers:
- Contains `date` → **daily mode**
- Contains `checkin` or `checkout` → **daily mode**
- Contains `month` AND `year` → **monthly mode**
- Cannot detect → Returns 400 error

### Action Modes

#### 1. Preview (Default)
- Validates CSV structure
- Checks for errors
- **Does NOT write to database**
- Returns success/error counts
- **Use for validation before actual upload**

#### 2. Append
- Writes validated records to database
- Handles duplicates per `dedupeStrategy`
- Default behavior for normal uploads

#### 3. Overwrite
- Deletes existing records first
- Then writes new data
- **Use with caution - destructive**

### Dedupe Strategies

#### 1. Skip (Default)
- If record exists → Skip, increment `skipped` count
- No error thrown
- Safe for re-uploads

#### 2. Update
- If record exists → Update with new data
- Uses UPSERT operation
- Overwrites existing values

#### 3. Error
- If record exists → Add to `errors` array, increment `failed` count
- Continues processing other rows
- Strict duplicate prevention

### Request Example

```javascript
const formData = new FormData();
formData.append('payrollFile', fileObject);

const response = await fetch(
  'http://localhost:5000/api/hr/attendance/upload?mode=daily&action=preview&dedupeStrategy=skip',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN'
      // Do NOT set Content-Type - browser adds boundary automatically
    },
    body: formData
  }
);

const result = await response.json();
```

### Response Examples

**Preview Success (200 OK):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "preview",
  "processed": 40,
  "success": 38,
  "skipped": 0,
  "failed": 2,
  "errors": [
    "Row 5: Invalid date format '2025-11-32'. Must be YYYY-MM-DD",
    "Row 12: Employee EMP999 not found"
  ]
}
```

**Append Success (201 Created):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "append",
  "processed": 40,
  "success": 38,
  "skipped": 2,
  "failed": 0,
  "errors": []
}
```

**Missing File (400 Bad Request):**
```json
{
  "message": "Please upload a CSV file"
}
```

**Invalid Headers (400 Bad Request):**
```json
{
  "message": "CSV missing required daily headers: employeeid, date"
}
```

**Validation Errors (200 OK with errors):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "append",
  "processed": 5,
  "success": 3,
  "skipped": 0,
  "failed": 2,
  "errors": [
    "Row 3: Invalid status 'X'. Must be one of: P, A, LOP, PL, H, WO",
    "Row 4: Employee EMP999 not found"
  ]
}
```

### Employee Lookup Logic

Backend tries multiple strategies to find employee:
1. If `employeeid` contains `@` → Search by email (personalEmail or email field)
2. Else → Search by employeeId field
3. If not found → Add error "Employee X not found" and skip row

**Supported column names for employee:**
- `employeeid`
- `employee_id`
- `emp_id`
- `email`

### Validation Rules

**Daily Mode:**
- `date`: Must be YYYY-MM-DD format
- `status`: Must be P, A, LOP, PL, H, WO (uppercase)
- `checkin`/`checkout`: Must be HH:mm format (24-hour)
- `hoursworked`: 0-24 range
- `overtimehours`: ≥0

**Monthly Mode:**
- `month`: 1-12
- `year`: Valid 4-digit year
- `totalworkingdays`: Must be > 0
- `dayspresent`: 0 to totalWorkingDays

### Processing Flow

1. Receive file with field name "payrollFile"
2. Parse query parameters
3. Read CSV first line to detect headers
4. Normalize headers to lowercase
5. Auto-detect mode if not provided
6. Validate required headers exist
7. Process each CSV row:
   - Normalize column keys
   - Lookup employee by employeeId or email
   - Validate date/status/fields
   - If preview → count success, skip write
   - If append/overwrite → write to database
   - Handle duplicates per dedupeStrategy
   - Collect errors with row numbers
8. Delete uploaded file from server
9. Return response with counts and errors

---

## Status Codes & Enums

### Daily Attendance Status Codes

| Code | Label | Description | Use Case |
|------|-------|-------------|----------|
| `P` | Present | Employee was present and worked | Regular working day |
| `A` | Absent | Employee was absent without leave | Unplanned absence |
| `LOP` | Leave Without Pay | Unpaid leave/absence | Exceeds leave quota |
| `PL` | Paid Leave | Vacation, sick leave, or other paid time off | Approved leave |
| `H` | Holiday | Company/public holiday | Declared holidays |
| `WO` | Week Off | Regular weekly off day | Weekend/rest day |

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, DELETE, or preview upload |
| 201 | Created | Successful POST or append/overwrite upload |
| 400 | Bad Request | Invalid data, missing fields, validation errors |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User is not HR role |
| 404 | Not Found | Employee/record not found |
| 500 | Internal Server Error | Unexpected server error |

---

## Error Handling

### Common Error Patterns

**Invalid Date Format:**
```json
{
  "message": "Date must be in YYYY-MM-DD format"
}
```

**Invalid Status:**
```json
{
  "message": "Invalid status"
}
```
Validation error from express-validator when status is not one of P, A, LOP, PL, H, WO.

**Invalid Time Format:**
```json
{
  "message": "Check-in must be HH:mm format"
}
```

**Employee Not Found:**
```json
{
  "message": "Employee not found"
}
```

**Record Not Found:**
```json
{
  "message": "Daily attendance record not found"
}
```

**Duplicate Record (Monthly):**
```json
{
  "message": "Attendance record already exists for this month"
}
```

**Missing Required Fields:**
```json
{
  "message": "Employee, date, and status are required"
}
```

### Bulk Upload Errors

Errors are returned as array with row numbers:
```json
{
  "errors": [
    "Row 3: Invalid date format '2025-11-32'. Must be YYYY-MM-DD",
    "Row 5: Employee EMP999 not found",
    "Row 8: Invalid status 'X'. Must be one of: P, A, LOP, PL, H, WO"
  ]
}
```

**Error row numbering:** Row 1 is header, so data starts at Row 2.

---

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// API Service Layer
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface DailyAttendance {
  employee: string;
  date: string;
  status: 'P' | 'A' | 'LOP' | 'PL' | 'H' | 'WO';
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  notes?: string;
}

// 1. Get daily attendance
export const getDailyAttendance = async (
  employeeId: string,
  year?: number,
  month?: number,
  token: string
) => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  
  const response = await axios.get(
    `${API_BASE_URL}/hr/employees/${employeeId}/attendance/daily?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 2. Mark attendance (UPSERT)
export const markAttendance = async (
  data: DailyAttendance,
  token: string
) => {
  const response = await axios.post(
    `${API_BASE_URL}/hr/attendance/daily`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 3. Update attendance
export const updateAttendance = async (
  recordId: string,
  updates: Partial<DailyAttendance>,
  token: string
) => {
  const response = await axios.put(
    `${API_BASE_URL}/hr/attendance/daily/${recordId}`,
    updates,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 4. Delete attendance
export const deleteAttendance = async (
  recordId: string,
  token: string
) => {
  const response = await axios.delete(
    `${API_BASE_URL}/hr/attendance/daily/${recordId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 5. Get monthly summary
export const getAttendanceSummary = async (
  month: number,
  year: number,
  token: string
) => {
  const response = await axios.get(
    `${API_BASE_URL}/hr/attendance/summary?month=${month}&year=${year}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 6. Upload CSV
export const uploadAttendanceCSV = async (
  file: File,
  mode: 'daily' | 'monthly',
  action: 'preview' | 'append' | 'overwrite',
  token: string
) => {
  const formData = new FormData();
  formData.append('payrollFile', file);
  
  const response = await axios.post(
    `${API_BASE_URL}/hr/attendance/upload?mode=${mode}&action=${action}&dedupeStrategy=skip`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - axios handles it automatically
      }
    }
  );
  
  return response.data;
};
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { Calendar } from 'react-calendar';
import { getDailyAttendance, markAttendance } from './api';

const AttendanceCalendar: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const token = localStorage.getItem('token') || '';
  
  useEffect(() => {
    loadAttendance();
  }, [employeeId]);
  
  const loadAttendance = async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const data = await getDailyAttendance(employeeId, year, month, token);
    setAttendance(data);
  };
  
  const handleMarkAttendance = async (status: string) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    await markAttendance({
      employee: employeeId,
      date: dateStr,
      status: status as any,
      checkIn: '09:00',
      checkOut: '18:00',
      hoursWorked: 8,
      overtimeHours: 0
    }, token);
    
    await loadAttendance();
  };
  
  return (
    <div>
      <Calendar
        value={selectedDate}
        onChange={setSelectedDate}
        tileClassName={({ date }) => {
          const dateStr = date.toISOString().split('T')[0];
          const record = attendance.find(a => a.date === dateStr);
          return record ? `status-${record.status}` : '';
        }}
      />
      
      <div>
        <button onClick={() => handleMarkAttendance('P')}>Present</button>
        <button onClick={() => handleMarkAttendance('A')}>Absent</button>
        <button onClick={() => handleMarkAttendance('PL')}>Paid Leave</button>
        <button onClick={() => handleMarkAttendance('LOP')}>LOP</button>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
```

### CSV Upload Component

```tsx
import React, { useState } from 'react';
import { uploadAttendanceCSV } from './api';

const CSVUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'daily' | 'monthly'>('daily');
  const [result, setResult] = useState<any>(null);
  const token = localStorage.getItem('token') || '';
  
  const handlePreview = async () => {
    if (!file) return;
    
    const data = await uploadAttendanceCSV(file, mode, 'preview', token);
    setResult(data);
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    const data = await uploadAttendanceCSV(file, mode, 'append', token);
    setResult(data);
    alert('Upload successful!');
  };
  
  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      
      <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
        <option value="daily">Daily</option>
        <option value="monthly">Monthly</option>
      </select>
      
      <button onClick={handlePreview}>Preview</button>
      <button onClick={handleUpload} disabled={!result || result.failed > 0}>
        Upload
      </button>
      
      {result && (
        <div>
          <p>Processed: {result.processed}</p>
          <p>Success: {result.success}</p>
          <p>Failed: {result.failed}</p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((err: string, i: number) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
```

---

## Testing Guide

### Manual Testing with cURL

**1. Mark Daily Attendance:**
```bash
curl -X POST http://localhost:5000/api/hr/attendance/daily \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee": "507f1f77bcf86cd799439012",
    "date": "2025-11-17",
    "status": "P",
    "checkIn": "09:00",
    "checkOut": "18:00",
    "hoursWorked": 8
  }'
```

**2. Get Daily Attendance:**
```bash
curl -X GET "http://localhost:5000/api/hr/employees/507f1f77bcf86cd799439012/attendance/daily?year=2025&month=11" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**3. Get Summary:**
```bash
curl -X GET "http://localhost:5000/api/hr/attendance/summary?month=11&year=2025" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**4. Upload CSV (Preview):**
```bash
curl -X POST "http://localhost:5000/api/hr/attendance/upload?mode=daily&action=preview" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "payrollFile=@daily_attendance.csv"
```

### Test Data Sets

**Sample Daily Attendance CSV:**
```csv
employeeid,date,status,checkin,checkout,hoursworked,overtimehours,notes
EMP001,2025-11-01,P,09:00,18:00,8,0,
EMP001,2025-11-02,P,09:15,18:15,8,0,
EMP001,2025-11-03,P,08:45,19:00,9,1,Overtime
EMP001,2025-11-04,PL,,,0,0,Sick leave
EMP001,2025-11-05,P,09:00,18:00,8,0,
```

**Sample Monthly Attendance CSV:**
```csv
employeeid,month,year,totalworkingdays,dayspresent,leavewithoutpay,overtimehours
EMP001,11,2025,22,20,2,8
EMP002,11,2025,22,21,1,0
EMP003,11,2025,22,19,3,5
```

### Testing Checklist

#### Daily Attendance CRUD
- [ ] Create daily record - success
- [ ] Create daily record - duplicate (should update)
- [ ] Get daily records - all dates
- [ ] Get daily records - filtered by year
- [ ] Get daily records - filtered by month+year
- [ ] Update daily record - success
- [ ] Update daily record - not found
- [ ] Delete daily record - success
- [ ] Delete daily record - not found

#### Validation
- [ ] Invalid date format - returns 400
- [ ] Invalid status - returns 400
- [ ] Invalid time format - returns 400
- [ ] Invalid employee ID - returns 404
- [ ] Missing required fields - returns 400

#### CSV Upload
- [ ] Upload daily CSV - preview mode
- [ ] Upload daily CSV - append mode
- [ ] Upload monthly CSV - preview mode
- [ ] Upload monthly CSV - append mode
- [ ] Auto-detect daily mode
- [ ] Auto-detect monthly mode
- [ ] Handle validation errors
- [ ] Handle duplicate records (skip)
- [ ] Handle duplicate records (update)
- [ ] Handle duplicate records (error)

#### Summary
- [ ] Get summary - with data
- [ ] Get summary - no data (empty array)
- [ ] Get summary - missing parameters
- [ ] Verify aggregation calculations

#### Authentication
- [ ] No token - returns 401
- [ ] Invalid token - returns 401
- [ ] Non-HR user - returns 403

---

## Appendix

### Sample Files Included

1. `daily_attendance_template.csv` - Template for daily uploads
2. `sample_attendance_upload.csv` - Sample data with 40 records
3. `ATTENDANCE_UPLOAD_API_REFERENCE.txt` - Quick reference for upload API
4. `FE_ATTENDANCE_UPLOAD_IMPLEMENTATION.txt` - Frontend implementation guide

### Database Indexes

**DailyAttendance:**
- Unique: `{ employee: 1, date: 1 }`
- Query optimization: `{ date: 1 }`

**Attendance:**
- Unique: `{ employee: 1, month: 1, year: 1 }`

### Performance Considerations

- Use date range filters to limit query results
- Summary endpoint uses aggregation pipeline (efficient)
- Daily records grow linearly (1 record per employee per day)
- Consider archiving old daily records after aggregation
- Bulk upload processes rows sequentially (not optimized for 10k+ rows)

### Migration Notes

- Both systems run in parallel (no breaking changes)
- Existing monthly data preserved in `attendance_details`
- New daily data in `daily_attendance` collection
- Summary endpoint aggregates from daily records
- Frontend can use either system as needed

---

**End of Documentation**

**For Support:** Contact backend team  
**Last Updated:** November 17, 2025  
**Version:** 2.0
