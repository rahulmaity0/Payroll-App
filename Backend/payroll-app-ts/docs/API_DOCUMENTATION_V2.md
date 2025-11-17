# Payroll API - Complete Documentation (v2.0)

**Base URL:** `http://localhost:5000/api`

**Last Updated:** November 17, 2025

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

### 3.1 Get My Profile (with Salary)
- **Method:** `GET`
- **Endpoint:** `/employee/profile`
- **Access:** Private (Employee only)
- **Description:** View complete profile including salary breakdown

**Response (200):**
```json
{
  "_id": "674123456789abcdef012345",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "personalEmail": "john.doe@personal.com",
  "designation": "Senior Software Engineer",
  "department": "Engineering",
  "joiningDate": "2023-01-15T00:00:00.000Z",
  "dob": "1990-05-20T00:00:00.000Z",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400001"
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
  "salary": {
    "_id": "674567890abcdef123456789",
    "employee": "674123456789abcdef012345",
    "annualCTC": 1200000,
    "effectiveDate": "2023-01-15T00:00:00.000Z",
    "earnings": [
      { "name": "Basic Salary", "amount": 50000 },
      { "name": "HRA", "amount": 15000 },
      { "name": "Special Allowance", "amount": 10000 }
    ],
    "deductions": [
      { "name": "Provident Fund", "amount": 6000, "isPercent": true, "percentOf": "Basic" },
      { "name": "Professional Tax", "amount": 200, "isPercent": false, "percentOf": "Basic" }
    ],
    "employerContributions": [
      { "name": "Employer PF", "amount": 6000, "isPercent": true, "percentOf": "Basic" }
    ]
  }
}
```

**Note:** Salary field will be `null` if not configured

---

### 3.2 Update My Profile
- **Method:** `PUT`
- **Endpoint:** `/employee/profile`
- **Access:** Private (Employee only)
- **Description:** Update employee-editable fields only

**Request Body:**
```json
{
  "personalEmail": "john.new@email.com",
  "phone": "+9876543210",
  "dob": "1990-05-20",
  "address": {
    "street": "456 New St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400002"
  },
  "bankDetails": {
    "bankName": "ICICI Bank",
    "accountNumber": "9876543210",
    "ifscCode": "ICIC0001234"
  }
}
```

**Editable Fields:**
- `personalEmail` - Personal email address
- `phone` - Phone number
- `dob` - Date of birth
- `address` - Residential address
- `bankDetails` - Bank account details

**Readonly Fields (HR only):**
- `employeeId`, `firstName`, `lastName`, `designation`, `department`, `joiningDate`, `isActive`

**Response (200):**
```json
{
  "_id": "674123456789abcdef012345",
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "personalEmail": "john.new@email.com",
  "phone": "+9876543210",
  ...
}
```

---

### 3.3 View My Payslips
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
    "employee": {
      "_id": "674123456789abcdef012345",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "designation": "Senior Software Engineer"
    },
    "month": 11,
    "year": 2025,
    "generatedOn": "2025-11-15T10:00:00.000Z",
    "payrollInfo": {
      "totalWorkingDays": 22,
      "daysPaid": 20,
      "lopDays": 2
    },
    "earnings": [
      { "name": "Basic Salary", "amount": 50000, "type": "fixed" },
      { "name": "HRA", "amount": 15000, "type": "fixed" }
    ],
    "deductions": [
      { "name": "Income Tax", "amount": 5000, "type": "tax" },
      { "name": "PF", "amount": 1800, "type": "statutory" }
    ],
    "grossEarnings": 70000,
    "totalDeductions": 6800,
    "netPay": 63200,
    "status": "generated",
    "paymentDate": "2025-11-30T00:00:00.000Z"
  }
]
```

---

### 3.4 Get Payslip Details (JSON)
- **Method:** `GET`
- **Endpoint:** `/employee/payslips/:id/download`
- **Access:** Private (Employee only)
- **Description:** Get complete payslip with attendance summary and salary breakdown for frontend PDF generation

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439013" (Payslip MongoDB ObjectId)
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "employee": {
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "designation": "Senior Engineer",
    "department": "Engineering",
    "bankDetails": {
      "bankName": "HDFC Bank",
      "accountNumber": "1234567890",
      "ifscCode": "HDFC0001234"
    },
    "taxInfo": {
      "pan": "ABCDE1234F",
      "uan": "101234567890"
    }
  },
  "month": 10,
  "year": 2025,
  "generatedOn": "2025-11-01T10:00:00.000Z",
  "payrollInfo": {
    "totalWorkingDays": 22,
    "daysPaid": 20,
    "lopDays": 2
  },
  "earnings": [
    { "name": "Basic Salary", "amount": 45455, "type": "fixed" },
    { "name": "HRA", "amount": 13636, "type": "fixed" },
    { "name": "Bonus", "amount": 5000, "type": "variable" }
  ],
  "deductions": [
    { "name": "PF", "amount": 5455, "type": "statutory" },
    { "name": "Tax", "amount": 200, "type": "tax" },
    { "name": "LOP", "amount": 4132, "type": "lop" }
  ],
  "grossEarnings": 64091,
  "totalDeductions": 9787,
  "netPay": 54304,
  "status": "generated",
  "paymentDate": null
}
```

**Key Fields:**
- `payrollInfo` - Attendance summary (working days, days paid, LOP)
- `earnings` - Salary breakdown with types (fixed/variable/reimbursement)
- `deductions` - Deduction breakdown with types (statutory/tax/lop/other)
- `netPay` - Final credit amount

**Note:** Frontend generates PDF from this JSON data

---

### 3.5 View My Daily Attendance
- **Method:** `GET`
- **Endpoint:** `/employee/attendance/daily`
- **Access:** Private (Employee only)
- **Description:** View my daily attendance records (chronological order)

**Query Parameters (Optional):**
```
?year=2025&month=11
```

**Response (200):**
```json
[
  {
    "_id": "674abc123def456789012345",
    "employee": "674123456789abcdef012345",
    "date": "2025-11-01",
    "status": "P",
    "checkIn": "09:00",
    "checkOut": "18:00",
    "hoursWorked": 9,
    "overtimeHours": 1,
    "notes": "Worked on project deadline",
    "createdAt": "2025-11-01T09:00:00.000Z",
    "updatedAt": "2025-11-01T18:00:00.000Z"
  },
  {
    "_id": "674abc123def456789012346",
    "employee": "674123456789abcdef012345",
    "date": "2025-11-02",
    "status": "PL",
    "checkIn": null,
    "checkOut": null,
    "hoursWorked": 0,
    "overtimeHours": 0,
    "notes": "Paid leave - personal",
    "createdAt": "2025-11-02T08:00:00.000Z",
    "updatedAt": "2025-11-02T08:00:00.000Z"
  }
]
```

**Status Codes:**
- `P` - Present
- `A` - Absent
- `LOP` - Leave Without Pay
- `PL` - Paid Leave
- `H` - Holiday (HR only)
- `WO` - Week Off (HR only)

---

### 3.6 Mark My Attendance (Self-Mark)
- **Method:** `POST`
- **Endpoint:** `/employee/attendance/daily`
- **Access:** Private (Employee only)
- **Description:** Mark or update attendance for a specific date (UPSERT)

**Request Body:**
```json
{
  "date": "2025-11-17",
  "status": "P",
  "checkIn": "09:15",
  "checkOut": "18:30",
  "hoursWorked": 9.25,
  "notes": "Arrived 15 mins late due to traffic"
}
```

**Field Validation:**
- `date` - Required, YYYY-MM-DD format
- `status` - Required, must be one of: `P`, `A`, `LOP`, `PL`
- `checkIn` - Optional, HH:mm format
- `checkOut` - Optional, HH:mm format
- `hoursWorked` - Optional, 0-24
- `notes` - Optional, max 500 characters

**Response (200):**
```json
{
  "message": "Attendance marked successfully",
  "data": {
    "_id": "674abc123def456789012347",
    "employee": "674123456789abcdef012345",
    "date": "2025-11-17",
    "status": "P",
    "checkIn": "09:15",
    "checkOut": "18:30",
    "hoursWorked": 9.25,
    "notes": "Arrived 15 mins late due to traffic",
    "createdAt": "2025-11-17T09:15:00.000Z",
    "updatedAt": "2025-11-17T18:30:00.000Z"
  }
}
```

**Note:** If record exists for the date, it will be updated (UPSERT behavior)

---

### 3.7 Update My Attendance Record
- **Method:** `PUT`
- **Endpoint:** `/employee/attendance/daily/:recordId`
- **Access:** Private (Employee only)
- **Description:** Update an existing daily attendance record

**URL Parameters:**
```
:recordId = MongoDB ObjectId of the attendance record
```

**Request Body (partial update):**
```json
{
  "checkOut": "19:00",
  "hoursWorked": 10,
  "overtimeHours": 2,
  "notes": "Worked late to finish sprint tasks"
}
```

**Response (200):**
```json
{
  "_id": "674abc123def456789012347",
  "employee": "674123456789abcdef012345",
  "date": "2025-11-17",
  "status": "P",
  "checkIn": "09:15",
  "checkOut": "19:00",
  "hoursWorked": 10,
  "overtimeHours": 2,
  "notes": "Worked late to finish sprint tasks",
  "updatedAt": "2025-11-17T19:00:00.000Z"
}
```

**Security:** Can only update own records

---

### 3.8 Delete My Attendance Record
- **Method:** `DELETE`
- **Endpoint:** `/employee/attendance/daily/:recordId`
- **Access:** Private (Employee only)
- **Description:** Delete a daily attendance record

**URL Parameters:**
```
:recordId = MongoDB ObjectId of the attendance record
```

**Response (200):**
```json
{
  "message": "Attendance record deleted successfully"
}
```

**Security:** Can only delete own records

---

### 3.9 Download My Daily Attendance (CSV)
- **Method:** `GET`
- **Endpoint:** `/employee/attendance/daily/download`
- **Access:** Private (Employee only)
- **Description:** Download daily attendance records as CSV

**Query Parameters (Optional):**
```
?year=2025&month=11
```

**Response (200):**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="daily-attendance.csv"`

**CSV Format:**
```csv
date,status,checkIn,checkOut,hoursWorked,overtimeHours,notes
2025-11-01,P,09:00,18:00,9,1,Worked on project deadline
2025-11-02,PL,,,0,0,Paid leave - personal
2025-11-03,P,09:15,18:30,9.25,0,
```

---

### 3.10 View My Monthly Attendance (Legacy)
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
      { "name": "Overtime Bonus", "amount": 2000 }
    ],
    "variableDeductions": [
      { "name": "LOP Deduction", "amount": 4545.45 }
    ]
  }
]
```

---

### 3.11 Download Monthly Attendance (CSV - Legacy)
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

### 4.7 Get Daily Attendance Records
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:employeeId/attendance/daily`
- **Access:** Private (HR only)
- **Description:** Fetch daily attendance records for a specific employee with optional date filtering

**URL Parameters:**
```
:employeeId = Employee MongoDB ObjectId
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | No | Filter by year (e.g., 2025) |
| month | number | No | Filter by month (1-12) |

**Example Requests:**
```
# Get all daily records for employee
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance/daily

# Get records for specific month
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance/daily?year=2025&month=11

# Get records for entire year
GET /api/hr/employees/507f1f77bcf86cd799439012/attendance/daily?year=2025
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
    "notes": "Sick leave",
    "createdAt": "2025-11-18T08:30:00.000Z",
    "updatedAt": "2025-11-18T08:30:00.000Z"
  }
]
```

**Status Codes:**
| Code | Label | Description |
|------|-------|-------------|
| `P` | Present | Employee was present and worked |
| `A` | Absent | Employee was absent without leave |
| `LOP` | Leave Without Pay | Unpaid leave/absence |
| `PL` | Paid Leave | Vacation, sick leave, or other paid time off |
| `H` | Holiday | Company/public holiday |
| `WO` | Week Off | Regular weekly off day |

**Error Responses:**
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (not HR role)
- `404`: Employee not found
- `500`: Internal server error

---

### 4.8 Create/Update Daily Attendance (UPSERT)
- **Method:** `POST`
- **Endpoint:** `/hr/attendance/daily`
- **Access:** Private (HR only)
- **Description:** Create new daily attendance record OR update existing if same employee+date already exists

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

**Field Details:**
| Field | Type | Required | Format/Values | Description |
|-------|------|----------|---------------|-------------|
| employee | string | Yes | MongoDB ObjectId | Employee reference |
| date | string | Yes | YYYY-MM-DD | Date in ISO format |
| status | string | Yes | P/A/LOP/PL/H/WO | Attendance status |
| checkIn | string | No | HH:mm | Check-in time (24-hour) |
| checkOut | string | No | HH:mm | Check-out time (24-hour) |
| hoursWorked | number | No | 0-24 | Total hours worked (decimal) |
| overtimeHours | number | No | ≥0 | Overtime hours (decimal) |
| notes | string | No | max 500 chars | Free text notes |

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

**UPSERT Behavior:**
- If record with same `employee` + `date` exists → **Updates** existing record
- If no matching record exists → **Creates** new record
- Unique constraint prevents duplicate (employee, date) combinations
- Safe to call multiple times with same data (idempotent)

**Error Responses:**
- `400`: Invalid data (e.g., invalid status, wrong date format, missing required fields)
- `401`: Unauthorized
- `403`: Forbidden (not HR role)
- `404`: Employee not found

**Validation Errors:**
```json
{
  "message": "Date must be YYYY-MM-DD format"
}
```
```json
{
  "message": "Invalid status"
}
```
```json
{
  "message": "Check-in must be HH:mm format"
}
```

---

### 4.9 Update Daily Attendance by ID
- **Method:** `PUT`
- **Endpoint:** `/hr/attendance/daily/:recordId`
- **Access:** Private (HR only)
- **Description:** Update specific fields of an existing daily attendance record

**URL Parameters:**
```
:recordId = Daily Attendance Record MongoDB ObjectId
```

**Request Body (all fields optional):**
```json
{
  "status": "PL",
  "notes": "Approved sick leave"
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
    "notes": "Approved sick leave",
    "updatedAt": "2025-11-17T11:00:00.000Z"
  }
}
```

**Error Responses:**
- `400`: Invalid data
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Record not found

---

### 4.10 Delete Daily Attendance
- **Method:** `DELETE`
- **Endpoint:** `/hr/attendance/daily/:recordId`
- **Access:** Private (HR only)
- **Description:** Delete a specific daily attendance record

**URL Parameters:**
```
:recordId = Daily Attendance Record MongoDB ObjectId
```

**Example Request:**
```
DELETE /api/hr/attendance/daily/673abc123def456789012345
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Daily attendance record deleted successfully"
}
```

**Error Responses:**
- `401`: Unauthorized
- `403`: Forbidden (not HR role)
- `404`: Record not found

---

### 4.11 Upload Attendance (CSV)
- **Method:** `POST`
- **Endpoint:** `/hr/upload/payroll` OR `/hr/attendance/upload`
- **Access:** Private (HR only)
- **Description:** Bulk upload attendance via CSV file. Supports both **daily** and **monthly** modes.

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

**Monthly format** (writes to `Attendance` collection):
```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,2,2024,22,20,2,8
EMP002,2,2024,22,21,1,0
```

**Daily format** (writes to `DailyAttendance` collection):
```csv
employeeId,date,status,checkIn,checkOut,hoursWorked,overtimeHours,notes
EMP001,2025-11-17,P,09:00,18:00,8,0,Regular shift
EMP001,2025-11-18,P,09:15,18:15,8,0,
EMP002,2025-11-17,LOP,,,0,0,Absent without leave
EMP002,2025-11-18,PL,,,0,0,Sick leave approved
```

**Daily CSV Required Fields:**
- `employeeId`: Employee ID (e.g., EMP001)
- `date`: Date in YYYY-MM-DD format
- `status`: One of P, A, LOP, PL, H, WO

**Daily CSV Optional Fields:**
- `checkIn`: Check-in time in HH:mm format (e.g., 09:00)
- `checkOut`: Check-out time in HH:mm format (e.g., 18:00)
- `hoursWorked`: Decimal hours (e.g., 8, 8.5)
- `overtimeHours`: Decimal hours (e.g., 0, 2.5)
- `notes`: Text notes (max 500 characters)

**Mode Auto-Detection:**
- If CSV contains `date` column → **daily mode**
- If CSV contains `month` and `year` columns → **monthly mode**

**Data Destination:**
- **Daily mode**: Writes to `DailyAttendance` collection (individual day records)
- **Monthly mode**: Writes to `Attendance` collection (monthly aggregates)

**Response (200 - Preview):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "preview",
  "processed": 4,
  "success": 4,
  "skipped": 0,
  "failed": 0,
  "errors": []
}
```

**Response (201 - Write Success):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "append",
  "processed": 4,
  "success": 3,
  "skipped": 1,
  "failed": 0,
  "errors": []
}
```

**Response (400 - Validation Errors):**
```json
{
  "message": "Processing complete",
  "mode": "daily",
  "action": "append",
  "processed": 4,
  "success": 2,
  "skipped": 0,
  "failed": 2,
  "errors": [
    "Row 3: Invalid date format '2025-11-32'. Must be YYYY-MM-DD",
    "Row 4: Invalid status 'X'. Must be one of: P, A, LOP, PL, H, WO"
  ]
}
```

---

### 4.12 Get Attendance Summary
- **Method:** `GET`
- **Endpoint:** `/hr/attendance/summary?month=X&year=Y`
- **Access:** Private (HR only)
- **Description:** Get attendance summary for all employees for a specific month. **Aggregates data from DailyAttendance collection.**

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| month | number | Yes | Month (1-12) |
| year | number | Yes | Year (e.g., 2025) |

**Example Request:**
```
GET /api/hr/attendance/summary?month=11&year=2025
Authorization: Bearer <token>
```

**How It Works:**
- Fetches all daily attendance records for the specified month from `DailyAttendance` collection
- Groups by employee and calculates:
  - **totalWorkingDays**: Total number of days with any attendance record
  - **daysPresent**: Count of days with status = 'P'
  - **leaveWithoutPay**: Count of days with status = 'LOP'
  - **paidLeave**: Count of days with status = 'PL'
  - **absent**: Count of days with status = 'A'
  - **holidays**: Count of days with status = 'H'
  - **weekOffs**: Count of days with status = 'WO'
  - **overtimeHours**: Sum of all overtime hours

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

**Response (400 - Missing Parameters):**
```json
{
  "message": "Month and year are required query parameters"
}
```

**Response (200 - No Data):**
```json
[]
```

**Use Case:**
- View monthly attendance summary for all employees
- Calculate payroll based on attendance
- Generate attendance reports
- Monitor employee attendance patterns

**Note:** This endpoint automatically aggregates from daily records, so you don't need to manually maintain monthly summaries.

---

### 4.13 Generate Payslips
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

### 4.14 View All Payslips
- **Method:** `GET`
- **Endpoint:** `/hr/payslips`
- **Access:** Private (HR only)
- **Description:** Get list of all payslips across all employees with optional filters

**Query Parameters:**
```
?year=2025           (Optional - filter by year)
?month=10            (Optional - filter by month 1-12)
?employeeId=<id>     (Optional - filter by employee MongoDB ObjectId)
```

**Example Request:**
```bash
GET /api/hr/payslips?year=2025&month=11
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "674567890abcdef123456789",
    "employee": {
      "_id": "674123456789abcdef012345",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "designation": "Software Engineer"
    },
    "month": 11,
    "year": 2025,
    "grossEarnings": 80000,
    "totalDeductions": 16000,
    "netPay": 64000,
    "status": "paid",
    "generatedOn": "2025-11-15T10:30:00.000Z",
    "paymentDate": "2025-11-30T00:00:00.000Z"
  },
  {
    "_id": "674567890abcdef123456790",
    "employee": {
      "_id": "674123456789abcdef012346",
      "employeeId": "EMP002",
      "firstName": "Jane",
      "lastName": "Smith",
      "designation": "Senior Developer"
    },
    "month": 11,
    "year": 2025,
    "grossEarnings": 100000,
    "totalDeductions": 20000,
    "netPay": 80000,
    "status": "paid",
    "generatedOn": "2025-11-15T10:30:00.000Z",
    "paymentDate": "2025-11-30T00:00:00.000Z"
  }
]
```

**Response (500):**
```json
{
  "message": "Server error message"
}
```

---

### 4.15 View Employee Payslips
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:employeeId/payslips`
- **Access:** Private (HR only)
- **Description:** Get all payslips for a specific employee with optional filters

**URL Parameters:**
```
:employeeId = Employee MongoDB ObjectId
```

**Query Parameters:**
```
?year=2025    (Optional - filter by year)
?month=10     (Optional - filter by month 1-12)
```

**Example Request:**
```bash
GET /api/hr/employees/674123456789abcdef012345/payslips?year=2025
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "674567890abcdef123456789",
    "employee": {
      "_id": "674123456789abcdef012345",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "designation": "Software Engineer"
    },
    "month": 11,
    "year": 2025,
    "grossEarnings": 80000,
    "totalDeductions": 16000,
    "netPay": 64000,
    "status": "paid",
    "generatedOn": "2025-11-15T10:30:00.000Z",
    "paymentDate": "2025-11-30T00:00:00.000Z"
  },
  {
    "_id": "674567890abcdef123456788",
    "employee": {
      "_id": "674123456789abcdef012345",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "designation": "Software Engineer"
    },
    "month": 10,
    "year": 2025,
    "grossEarnings": 80000,
    "totalDeductions": 16000,
    "netPay": 64000,
    "status": "paid",
    "generatedOn": "2025-10-15T10:30:00.000Z",
    "paymentDate": "2025-10-31T00:00:00.000Z"
  }
]
```

**Response (404):**
```json
{
  "message": "Employee not found or no payslips available"
}
```

---

### 4.16 Get Employee Payslip Details (JSON)
- **Method:** `GET`
- **Endpoint:** `/hr/payslips/:id/download`
- **Access:** Private (HR only)
- **Description:** Get complete payslip details for any employee with attendance summary and salary breakdown for frontend PDF generation

**URL Parameters:**
```
:id = Payslip MongoDB ObjectId
```

**Response (200):**
Same as employee payslip response (see section 3.2)

**Response (404):**
```json
{
  "message": "Payslip not found"
}
```

---

### 4.17 Reset User Password
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

### Example: Get Payslip Data for PDF Generation

```javascript
const getPayslipDetails = async (payslipId) => {
  const { data } = await api.get(`/employee/payslips/${payslipId}/download`);
  
  // Data includes:
  // - employee info (name, ID, designation, bank details, tax info)
  // - payrollInfo (totalWorkingDays, daysPaid, lopDays) - Attendance Summary
  // - earnings[] (with name, amount, type) - Salary Breakdown
  // - deductions[] (with name, amount, type) - Deductions Breakdown
  // - grossEarnings, totalDeductions, netPay - Final Calculation
  
  return data;
};

// Frontend generates PDF using jsPDF, pdfmake, or react-pdf
// See PAYSLIP_GENERATION_API_REFERENCE.md for complete PDF generation example
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
| **GET** | **`/employee/profile`** | **Employee** | **Get profile with salary** |
| **PUT** | **`/employee/profile`** | **Employee** | **Update my profile** |
| GET | `/employee/payslips` | Employee | View my payslips |
| GET | `/employee/payslips/:id/download` | Employee | Get payslip details (JSON for PDF) |
| **GET** | **`/employee/attendance/daily`** | **Employee** | **View daily attendance** |
| **POST** | **`/employee/attendance/daily`** | **Employee** | **Mark attendance (self-mark)** |
| **PUT** | **`/employee/attendance/daily/:recordId`** | **Employee** | **Update attendance record** |
| **DELETE** | **`/employee/attendance/daily/:recordId`** | **Employee** | **Delete attendance record** |
| **GET** | **`/employee/attendance/daily/download`** | **Employee** | **Download daily attendance CSV** |
| GET | `/employee/attendance` | Employee | View monthly attendance (legacy) |
| GET | `/employee/attendance/download` | Employee | Download monthly attendance CSV |
| POST | `/hr/onboard` | HR | Onboard employee |
| GET | `/hr/employees` | HR | List all employees |
| GET | `/hr/employees/:id` | HR | Get employee details |
| PUT | `/hr/employees/:id` | HR | Update employee |
| GET | `/hr/employees/:id/salary` | HR | Get salary details |
| PUT | `/hr/employees/:id/salary` | HR | Update salary |
| GET | `/hr/employees/:id/attendance` | HR | Get employee monthly attendance |
| GET | `/hr/employees/:employeeId/attendance/daily` | HR | Get daily attendance records |
| POST | `/hr/attendance/daily` | HR | Create/update daily attendance |
| PUT | `/hr/attendance/daily/:recordId` | HR | Update daily attendance record |
| DELETE | `/hr/attendance/daily/:recordId` | HR | Delete daily attendance record |
| POST | `/hr/attendance` | HR | Create monthly attendance (legacy) |
| PUT | `/hr/attendance/:attId` | HR | Update monthly attendance (legacy) |
| POST | `/hr/attendance/upload` | HR | Upload attendance CSV |
| POST | `/hr/payroll/generate` | HR | Generate payslips |
| GET | `/hr/payslips` | HR | View all payslips (with filters) |
| GET | `/hr/employees/:employeeId/payslips` | HR | View employee payslips |
| GET | `/hr/payslips/:id/download` | HR | Get payslip details (JSON for PDF) |
| PUT | `/hr/users/:id/reset-password` | HR | Reset user password |

---

**For detailed model schemas, see:** `MODELS_DOCUMENTATION.md`

**For CSV upload specification, see:** `ATTENDANCE_UPLOAD_SPEC.md`
