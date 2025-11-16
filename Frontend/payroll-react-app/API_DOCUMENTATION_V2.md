# Payroll API - Complete Documentation (v2.0)

**Base URL:** `http://localhost:5000/api`

**Last Updated:** November 16, 2025

---

## Table of Contents
1. [Authentication Endpoints](#1-authentication-endpoints)
2. [User Profile Endpoints](#2-user-profile-endpoints)
3. [Employee Endpoints](#3-employee-endpoints)
4. [HR Management Endpoints](#4-hr-management-endpoints)
5. [Error Handling](#error-handling)
6. [Frontend Integration Guide](#frontend-integration-guide)

---

## Authentication & Authorization

### Headers
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Roles
- **`employee`** - Regular employees (can view own data)
- **`hr`** - HR administrators (full access)

### Token Expiration
- JWT tokens expire after **24 hours**
- Store token securely in localStorage/sessionStorage
- Include token in all protected requests

---

## 1. AUTHENTICATION ENDPOINTS

### 1.1 Register HR User
- **Method:** `POST`
- **Endpoint:** `/auth/register-hr`
- **Access:** Public
- **Description:** Register a new HR administrator account

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "admin@company.com",
  "password": "securePass123",
  "firstName": "Jane",
  "lastName": "Smith",
  "employeeId": "HR002"
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address (unique) |
| password | string | Yes | Minimum 6 characters |
| firstName | string | No | Defaults to "HR" |
| lastName | string | No | Defaults to "Admin" |
| employeeId | string | No | Auto-generated as HR001, HR002, etc. |

**Response (201 - Created):**
```json
{
  "message": "HR user registered successfully",
  "_id": "674567890abcdef123456789",
  "email": "admin@company.com",
  "role": "hr",
  "employeeId": "HR002",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (400 - Error):**
```json
{
  "message": "User with this email already exists"
}
```

---

### 1.2 Login User
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Access:** Public
- **Description:** Authenticate user (employee or HR) and receive JWT token

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "password123"
}
```

**Response (200 - Success):**
```json
{
  "message": "Login successful",
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@company.com",
  "role": "employee",
  "employeeId": "674567890abcdef123456790",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401 - Unauthorized):**
```json
{
  "message": "Invalid credentials"
}
```

---

## 2. USER PROFILE ENDPOINTS

### 2.1 Get My Profile
- **Method:** `GET`
- **Endpoint:** `/users/profile`
- **Access:** Private (Employee, HR)
- **Description:** Retrieve authenticated user's employee profile

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 - Success):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "personalEmail": "john@company.com",
  "designation": "Software Engineer",
  "department": "IT",
  "joiningDate": "2024-01-15T00:00:00.000Z",
  "dob": "1995-05-20T00:00:00.000Z",
  "phone": "9876543210",
  "address": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "zip": "560001"
  },
  "bankDetails": {
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234"
  },
  "taxInfo": {
    "pan": "ABCDE1234F",
    "uan": "101234567890"
  },
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-20T15:30:00.000Z"
}
```

---

### 2.2 Update My Profile
- **Method:** `PUT`
- **Endpoint:** `/users/profile`
- **Access:** Private (Employee, HR)
- **Description:** Update own profile information (limited fields)

**Allowed Fields:** 
- `personalEmail`, `phone`, `dob`, `address`, `bankDetails`, `taxInfo`

**Request Body (All fields optional):**
```json
{
  "personalEmail": "newemail@gmail.com",
  "phone": "9123456789",
  "dob": "1995-05-20",
  "address": {
    "street": "456 New Road",
    "city": "Pune",
    "state": "Maharashtra",
    "zip": "411001"
  },
  "bankDetails": {
    "bankName": "ICICI Bank",
    "accountNumber": "9876543210",
    "ifscCode": "ICIC0000001"
  },
  "taxInfo": {
    "pan": "XYZ9876543AB",
    "uan": "201234567890"
  }
}
```

**Response (200 - Success):**
```json
{
  "message": "Profile updated successfully",
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "personalEmail": "newemail@gmail.com",
  "phone": "9123456789",
  "isActive": true
}
```

---

### 2.3 Change Password
- **Method:** `PUT`
- **Endpoint:** `/users/password`
- **Access:** Private (Employee, HR)
- **Description:** Change own password

**Request Body:**
```json
{
  "oldPassword": "currentPassword123",
  "newPassword": "newSecurePass456"
}
```

**Response (200 - Success):**
```json
{
  "message": "Password changed successfully"
}
```

**Response (400 - Error):**
```json
{
  "message": "Old password is incorrect"
}
```

---

## 3. EMPLOYEE ENDPOINTS

All employee endpoints require `role: "employee"`.

### 3.1 View My Payslips
- **Method:** `GET`
- **Endpoint:** `/employee/payslips`
- **Access:** Private (Employee only)

**Query Parameters:**
```
?year=2024
```

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "employee": "507f1f77bcf86cd799439012",
    "month": 1,
    "year": 2024,
    "generatedOn": "2024-02-01T10:00:00.000Z",
    "payrollInfo": {
      "totalWorkingDays": 22,
      "daysPaid": 20,
      "lopDays": 2
    },
    "earnings": [
      {
        "name": "Basic Salary",
        "amount": 50000,
        "type": "fixed"
      },
      {
        "name": "HRA",
        "amount": 15000,
        "type": "fixed"
      }
    ],
    "deductions": [
      {
        "name": "Income Tax",
        "amount": 5000,
        "type": "tax"
      },
      {
        "name": "PF",
        "amount": 1800,
        "type": "statutory"
      }
    ],
    "grossEarnings": 70000,
    "totalDeductions": 6800,
    "netPay": 63200,
    "status": "generated",
    "paymentDate": "2024-02-05T00:00:00.000Z"
  }
]
```

---

### 3.2 Download Payslip (PDF)
- **Method:** `GET`
- **Endpoint:** `/employee/payslips/:id/download`
- **Access:** Private (Employee only)

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439013"
```

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="payslip-{id}.pdf"`

---

### 3.3 View My Attendance
- **Method:** `GET`
- **Endpoint:** `/employee/attendance`
- **Access:** Private (Employee only)

**Query Parameters (Optional):**
```
?year=2024&month=1
```

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "employee": "507f1f77bcf86cd799439012",
    "month": 1,
    "year": 2024,
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
    "variableDeductions": [
      {
        "name": "LOP Deduction",
        "amount": 4545.45
      }
    ]
  }
]
```

---

### 3.4 Download Attendance (CSV)
- **Method:** `GET`
- **Endpoint:** `/employee/attendance/download`
- **Access:** Private (Employee only)

**Query Parameters (Optional):**
```
?year=2024&month=1
```

**Response (200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="attendance.csv"`

---

## 4. HR MANAGEMENT ENDPOINTS

All HR endpoints require `role: "hr"`.

### 4.1 Onboard Employee
- **Method:** `POST`
- **Endpoint:** `/hr/onboard`
- **Access:** Private (HR only)
- **Description:** Create new employee with auto-generated credentials

**Request Body:**
```json
{
  "email": "john.doe@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "designation": "Senior Developer",
  "joiningDate": "2024-02-01",
  "annualCTC": 1200000,
  "department": "Engineering"
}
```

**Field Details:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Unique email for login |
| firstName | string | Yes | Employee first name |
| lastName | string | Yes | Employee last name |
| designation | string | Yes | Job title |
| joiningDate | string | Yes | ISO8601 date (YYYY-MM-DD) |
| annualCTC | number | Yes | Annual salary in INR |
| department | string | No | Department name |

**Auto-Generated Fields:**
- `employeeId`: EMP001, EMP002, etc. (sequential)
- `password`: "password" (default - employee should change)
- `role`: "employee"

**Response (201 - Created):**
```json
{
  "message": "Employee onboarded successfully",
  "data": {
    "employee": {
      "_id": "507f1f77bcf86cd799439015",
      "employeeId": "EMP002",
      "firstName": "John",
      "lastName": "Doe",
      "personalEmail": "john.doe@company.com",
      "designation": "Senior Developer",
      "department": "Engineering",
      "joiningDate": "2024-02-01T00:00:00.000Z",
      "isActive": true
    },
    "user": {
      "_id": "507f1f77bcf86cd799439016",
      "email": "john.doe@company.com",
      "role": "employee"
    }
  }
}
```

---

### 4.2 Get All Employees
- **Method:** `GET`
- **Endpoint:** `/hr/employees`
- **Access:** Private (HR only)

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "personalEmail": "john@company.com",
    "designation": "Software Engineer",
    "department": "IT",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "isActive": true
  }
]
```

---

### 4.3 Get Employee By ID
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id`
- **Access:** Private (HR only)

**URL Parameters:**
```
:id = MongoDB ObjectId (e.g., "507f1f77bcf86cd799439012")
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "personalEmail": "john@company.com",
  "designation": "Software Engineer",
  "department": "IT",
  "joiningDate": "2024-01-15T00:00:00.000Z",
  "dob": "1995-05-20T00:00:00.000Z",
  "phone": "9876543210",
  "address": {
    "street": "123 Main St",
    "city": "Bangalore",
    "state": "Karnataka",
    "zip": "560001"
  },
  "bankDetails": {
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234"
  },
  "taxInfo": {
    "pan": "ABCDE1234F",
    "uan": "101234567890"
  },
  "isActive": true
}
```

---

### 4.4 Update Employee Profile
- **Method:** `PUT`
- **Endpoint:** `/hr/employees/:id`
- **Access:** Private (HR only)

**Request Body (All fields optional):**
```json
{
  "designation": "Lead Software Engineer",
  "department": "Engineering",
  "isActive": true,
  "phone": "9123456789",
  "dob": "1995-05-20",
  "address": {
    "street": "789 Park Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "zip": "560001"
  }
}
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "designation": "Lead Software Engineer",
  "department": "Engineering",
  "phone": "9123456789",
  "isActive": true
}
```

---

### 4.5 Get Salary Details
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id/salary`
- **Access:** Private (HR only)

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439020",
  "employee": "507f1f77bcf86cd799439012",
  "annualCTC": 1200000,
  "effectiveDate": "2024-01-15T00:00:00.000Z",
  "earnings": [
    {
      "name": "Basic Salary",
      "amount": 50000
    },
    {
      "name": "HRA",
      "amount": 15000
    },
    {
      "name": "DA",
      "amount": 10000
    }
  ],
  "deductions": [
    {
      "name": "PF",
      "amount": 1800,
      "isPercent": false,
      "percentOf": "Basic"
    }
  ],
  "employerContributions": [
    {
      "name": "EPF",
      "amount": 1800,
      "isPercent": false,
      "percentOf": "Basic"
    }
  ]
}
```

---

### 4.6 Update Salary Details
- **Method:** `PUT`
- **Endpoint:** `/hr/employees/:id/salary`
- **Access:** Private (HR only)

**Request Body:**
```json
{
  "annualCTC": 1300000,
  "earnings": [
    {
      "name": "Basic Salary",
      "amount": 55000
    },
    {
      "name": "HRA",
      "amount": 16500
    }
  ],
  "deductions": [
    {
      "name": "PF",
      "amount": 1800,
      "isPercent": false,
      "percentOf": "Basic"
    }
  ]
}
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439020",
  "employee": "507f1f77bcf86cd799439012",
  "annualCTC": 1300000,
  "earnings": [...],
  "deductions": [...]
}
```

---

### 4.7 Get Employee Attendance
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id/attendance`
- **Access:** Private (HR only)

**Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "employee": "507f1f77bcf86cd799439012",
    "month": 1,
    "year": 2024,
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
    "variableDeductions": []
  }
]
```

---

### 4.8 Create Attendance Record
- **Method:** `POST`
- **Endpoint:** `/hr/attendance`
- **Access:** Private (HR only)

**Request Body:**
```json
{
  "employee": "507f1f77bcf86cd799439012",
  "month": 2,
  "year": 2024,
  "totalWorkingDays": 20,
  "daysPresent": 18,
  "leaveWithoutPay": 2,
  "overtimeHours": 5,
  "variableEarnings": [
    {
      "name": "Overtime Bonus",
      "amount": 1500
    }
  ],
  "variableDeductions": []
}
```

**Response (201 - Created):**
```json
{
  "_id": "507f1f77bcf86cd799439021",
  "employee": "507f1f77bcf86cd799439012",
  "month": 2,
  "year": 2024,
  "totalWorkingDays": 20,
  "daysPresent": 18,
  "leaveWithoutPay": 2,
  "overtimeHours": 5,
  "variableEarnings": [...],
  "variableDeductions": [],
  "createdAt": "2024-02-15T10:00:00.000Z",
  "updatedAt": "2024-02-15T10:00:00.000Z"
}
```

**Response (400 - Duplicate):**
```json
{
  "message": "Attendance record already exists for this month."
}
```

---

### 4.9 Update Attendance Record
- **Method:** `PUT`
- **Endpoint:** `/hr/attendance/:attId`
- **Access:** Private (HR only)

**URL Parameters:**
```
:attId = Attendance Record MongoDB ObjectId
```

**Request Body (All fields optional):**
```json
{
  "totalWorkingDays": 22,
  "daysPresent": 21,
  "leaveWithoutPay": 1,
  "overtimeHours": 10,
  "variableEarnings": [
    {
      "name": "Overtime Bonus",
      "amount": 3000
    }
  ]
}
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439021",
  "employee": "507f1f77bcf86cd799439012",
  "month": 2,
  "year": 2024,
  "totalWorkingDays": 22,
  "daysPresent": 21,
  "leaveWithoutPay": 1,
  "overtimeHours": 10,
  "updatedAt": "2024-02-20T14:30:00.000Z"
}
```

---

### 4.10 Upload Attendance (CSV)
- **Method:** `POST`
- **Endpoint:** `/hr/upload/payroll` OR `/hr/attendance/upload`
- **Access:** Private (HR only)
- **Description:** Bulk upload attendance via CSV file

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
```

**Request Body (Form Data):**
```
payrollFile: <CSV file>
```

**Query Parameters (Optional):**
| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| mode | string | `daily` \| `monthly` | Auto-detected if not provided |
| action | string | `preview` \| `append` \| `overwrite` | Default: `preview` |
| dedupeStrategy | string | `skip` \| `update` \| `error` | Duplicate handling |
| year | number | e.g., 2024 | Required for some modes |
| month | number | 1-12 | Required for some modes |
| delimiter | string | e.g., `,` | Default: `,` |

**CSV Format Examples:**

Monthly format:
```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,2,2024,22,20,2,8
EMP002,2,2024,22,21,1,0
```

Daily format:
```csv
employeeId,date,status,checkIn,checkOut
EMP001,2024-02-01,P,09:30,18:30
EMP001,2024-02-02,P,09:25,18:20
EMP002,2024-02-01,LOP,,
```

**Response (200 - Preview):**
```json
{
  "message": "Preview processed",
  "recordsProcessed": 3,
  "successCount": 3,
  "failureCount": 0,
  "mode": "monthly",
  "action": "preview",
  "issues": []
}
```

**Response (201 - Write):**
```json
{
  "message": "Payroll data processed successfully",
  "recordsProcessed": 3,
  "successCount": 3,
  "failureCount": 0,
  "mode": "monthly",
  "action": "append"
}
```

**Response (400 - Missing Headers):**
```json
{
  "message": "CSV missing required monthly headers: month, year"
}
```

---

### 4.11 Generate Payslips
- **Method:** `POST`
- **Endpoint:** `/hr/payroll/generate`
- **Access:** Private (HR only)
- **Description:** Generate payslips for all employees for a specific month. **Includes robust validations and graceful error handling.**

**✅ Key Features:**
- **Month-end validation**: Prevents generation before month ends (unless force=true)
- **Duplicate prevention**: Skips employees with existing payslips (idempotent)
- **Pro-rata calculation**: Automatically adjusts salary for mid-month joiners
- **Graceful error handling**: Continues processing all employees even if some fail
- **Comprehensive validation**: Checks for missing salary/attendance data
- **Detailed reporting**: Returns success/failure counts with warnings

**Request Body:**
```json
{
  "month": 2,
  "year": 2024,
  "force": false
}
```

**Request Body Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| month | number | Yes | Month number (1-12) |
| year | number | Yes | Year (2000-2100) |
| force | boolean | No | Allow generation before month ends (default: false, not recommended) |

**Validations Performed:**
1. ✅ **Input validation**: Month (1-12), Year (2000-2100)
2. ✅ **Month-end check**: Current date must be >= first day of next month (unless force=true)
3. ✅ **Active employees check**: At least one active employee must exist
4. ✅ **HR exclusion**: HR users (employeeId starts with 'HR') are automatically excluded from payroll
5. ✅ **Salary structure check**: Each employee must have salary configured
6. ✅ **Attendance data check**: Attendance record must exist for the month
7. ✅ **Working days validation**: Total working days must be > 0
8. ✅ **Days present validation**: Must be between 0 and total working days
9. ✅ **Pro-rata for joiners**: Automatically applies if employee joined mid-month
10. ✅ **Duplicate check**: Skips if payslip already exists (safe re-runs)

**Important Business Rules:**
- 🚫 **HR users are excluded**: Employees with IDs starting with "HR" (e.g., HR001, HR002) are automatically filtered out and will NOT have payslips generated
- ✅ **Only regular employees**: Only employees with IDs starting with "EMP" (e.g., EMP001, EMP002) are processed for payroll

**Response (200 - Success):**
```json
{
  "message": "Payroll run for 2/2024 completed successfully.",
  "processed": 15,
  "success": 14,
  "skipped": 1,
  "failed": 0,
  "errors": [],
  "warnings": [
    "Employee EMP005 joined mid-month (2/15/2024). Salary pro-rated to 53.6% (15/28 days)."
  ]
}
```

**Response (400 - Month Not Ended):**
```json
{
  "message": "Payroll for 11/2025 cannot be run before month ends (11/30/2025). Current date: 11/16/2025. Use force=true to override (not recommended)."
}
```

**Response (400 - Invalid Input):**
```json
{
  "message": "Invalid month or year. Month must be 1-12, year must be between 2000-2100."
}
```

**Response (200 - Partial Success with Errors):**
```json
{
  "message": "Payroll run for 10/2025 completed successfully.",
  "processed": 5,
  "success": 3,
  "skipped": 0,
  "failed": 2,
  "errors": [
    "Employee EMP004: Missing attendance data. Please upload attendance before generating payslips.",
    "Employee EMP007: Missing salary structure. Please configure salary first."
  ],
  "warnings": []
}
```

**Response (200 - With Force Flag Before Month End):**
```json
{
  "message": "Payroll run for 11/2025 completed successfully.",
  "processed": 10,
  "success": 10,
  "skipped": 0,
  "failed": 0,
  "errors": [],
  "warnings": [
    "WARNING: Payroll generated before month end. Attendance data may be incomplete."
  ]
}
```

**Pro-rata Calculation Example:**

If an employee with salary ₹60,000/month joins on Feb 15 in a 28-day month:
- Days employed: 28 - 15 + 1 = 14 days
- Pro-rata factor: 14/28 = 0.5 (50%)
- Final salary: ₹60,000 × 0.5 = ₹30,000

Additionally, if the employee has 2 LOP days out of 14 working days:
- Days paid: 12 days
- LOP factor: 12/14 = 0.857
- Final salary: ₹30,000 × 0.857 = ₹25,710

**Processing Behavior:**

The payroll generation processes each employee **independently**:
- ✅ Employees with complete data → **Payslip generated successfully**
- ❌ Employees with missing data → **Skipped with error message** (doesn't stop other employees)
- 🔄 Employees with existing payslips → **Skipped** (idempotent operation)

This approach ensures **maximum reliability**:
- No all-or-nothing transactions that could fail entirely
- Clear visibility into which employees succeeded and which failed
- Ability to fix missing data and re-run (only missing employees will be processed)

**Use Cases:**

1. **Normal Payroll Run** (after month ends):
```json
{
  "month": 10,
  "year": 2024
}
```

2. **Force Run Before Month End** (for testing/preview):
```json
{
  "month": 11,
  "year": 2025,
  "force": true
}
```
⚠️ Warning: Attendance data will be incomplete!

3. **Re-running Payroll** (safe due to idempotency):
If you run the same request twice, the second run will skip all employees (processed=15, skipped=15, success=0).

4. **Fixing Failed Employees**:
If first run fails for 2 employees (missing data), fix their data and re-run. The system will:
- Skip the 13 employees who already have payslips
- Process only the 2 employees who previously failed

---

### 4.12 Download Employee Payslip (PDF)
- **Method:** `GET`
- **Endpoint:** `/hr/payslips/:id/download`
- **Access:** Private (HR only)

**URL Parameters:**
```
:id = Payslip MongoDB ObjectId
```

**Response (200):**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="payslip-{id}.pdf"`

---

### 4.13 Reset User Password
- **Method:** `PUT`
- **Endpoint:** `/hr/users/:id/reset-password`
- **Access:** Private (HR only)
- **Description:** Reset employee password (admin function)

**URL Parameters:**
```
:id = User MongoDB ObjectId (not Employee ID)
```

**Request Body:**
```json
{
  "newPassword": "tempPassword@123"
}
```

**Response (200):**
```json
{
  "message": "User password reset successfully"
}
```

---

## ERROR HANDLING

### Standard Error Response Format

All errors follow this structure:

```json
{
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful GET/PUT request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions (wrong role) |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

### Common Error Scenarios

**401 - Invalid/Missing Token:**
```json
{
  "message": "Not authorized, no token"
}
```

**403 - Wrong Role:**
```json
{
  "message": "Role 'employee' is not authorized for this action"
}
```

**400 - Validation Error:**
```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Email is required",
      "path": "email",
      "location": "body"
    }
  ]
}
```

---

## FRONTEND INTEGRATION GUIDE

### Setup: Axios Instance

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-attach token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Example: Login & Store Token

```javascript
const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('role', data.role);
  localStorage.setItem('user', JSON.stringify(data));
  return data;
};
```

### Example: Protected Request

```javascript
const getMyProfile = async () => {
  const { data } = await api.get('/users/profile');
  return data;
};

const updateProfile = async (updates) => {
  const { data } = await api.put('/users/profile', updates);
  return data;
};
```

### Example: File Upload (CSV)

```javascript
const uploadAttendance = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('payrollFile', file);
  
  const params = new URLSearchParams({
    mode: options.mode || 'monthly',
    action: options.action || 'preview',
    dedupeStrategy: options.dedupeStrategy || 'skip'
  });
  
  const { data } = await api.post(
    `/hr/attendance/upload?${params}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  
  return data;
};
```

### Example: Download PDF

```javascript
const downloadPayslip = async (payslipId) => {
  const response = await api.get(`/employee/payslips/${payslipId}/download`, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payslip-${payslipId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};
```

### React Example: Protected Route

```jsx
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }
  
  return children;
};

// Usage
<Route path="/hr/dashboard" element={
  <ProtectedRoute requiredRole="hr">
    <HRDashboard />
  </ProtectedRoute>
} />
```

---

## IMPORTANT NOTES

1. **Employee Onboarding**
   - `employeeId` is auto-generated (EMP001, EMP002, ...)
   - Default password is `"password"`
   - Employees should change password after first login

2. **HR Registration**
   - `employeeId` is auto-generated (HR001, HR002, ...)
   - Can optionally specify custom employeeId

3. **Authentication**
   - JWT tokens expire after 24 hours
   - Include `Authorization: Bearer <token>` header in all protected requests
   - Store token securely (not in cookies if XSS risk exists)

4. **File Uploads**
   - Maximum file size: 5MB
   - Supported formats: CSV (XLSX planned)
   - Use `multipart/form-data` content type

5. **Date Formats**
   - Request: ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS.SSSZ)
   - Response: ISO 8601 with timezone

6. **Currency**
   - All monetary values in INR (Indian Rupees)

7. **Uniqueness Constraints**
   - Email addresses must be unique
   - Employee IDs must be unique
   - Attendance: one record per employee per month

---

## QUICK REFERENCE

### Endpoint Summary

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/register-hr` | Public | Register HR user |
| POST | `/auth/login` | Public | Login |
| GET | `/users/profile` | Any | Get my profile |
| PUT | `/users/profile` | Any | Update my profile |
| PUT | `/users/password` | Any | Change password |
| GET | `/employee/payslips` | Employee | View payslips |
| GET | `/employee/payslips/:id/download` | Employee | Download payslip PDF |
| GET | `/employee/attendance` | Employee | View attendance |
| GET | `/employee/attendance/download` | Employee | Download attendance CSV |
| POST | `/hr/onboard` | HR | Onboard employee |
| GET | `/hr/employees` | HR | List all employees |
| GET | `/hr/employees/:id` | HR | Get employee details |
| PUT | `/hr/employees/:id` | HR | Update employee |
| GET | `/hr/employees/:id/salary` | HR | Get salary details |
| PUT | `/hr/employees/:id/salary` | HR | Update salary |
| GET | `/hr/employees/:id/attendance` | HR | Get employee attendance |
| POST | `/hr/attendance` | HR | Create attendance record |
| PUT | `/hr/attendance/:attId` | HR | Update attendance record |
| POST | `/hr/attendance/upload` | HR | Upload attendance CSV |
| POST | `/hr/payroll/generate` | HR | Generate payslips |
| GET | `/hr/payslips/:id/download` | HR | Download payslip PDF |
| PUT | `/hr/users/:id/reset-password` | HR | Reset user password |

---

**For detailed model schemas, see:** `MODELS_DOCUMENTATION.md`

**For CSV upload specification, see:** `ATTENDANCE_UPLOAD_SPEC.md`
