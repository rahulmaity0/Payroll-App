# Payroll API - Complete Endpoint Documentation

**Base URL:** `http://localhost:5000/api`

**Authentication:** Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 1. AUTHENTICATION ENDPOINTS

### 1.1 Login User
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Access:** Public
- **Description:** Authenticate user and receive JWT token

**Request Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "email": "tejas@gmail.com",
  "password": "123456"
}
```

**Response (200 - Success):**
```json
{
  "message": "Login successful",
  "_id": "507f1f77bcf86cd799439011",
  "email": "tejas@gmail.com",
  "role": "hr",
  "employeeId": "507f1f77bcf86cd799439012",
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
  "firstName": "Tejas",
  "lastName": "Kumar",
  "personalEmail": "tejas@gmail.com",
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
- **Description:** Update authenticated user's profile information

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body (All fields optional):**
```json
{
  "personalEmail": "newemail@gmail.com",
  "phone": "9876543210",
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
  "firstName": "Tejas",
  "lastName": "Kumar",
  "personalEmail": "newemail@gmail.com",
  "designation": "Software Engineer",
  "phone": "9876543210",
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
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-25T14:20:00.000Z"
}
```

---

### 2.3 Change Password
- **Method:** `PUT`
- **Endpoint:** `/users/password`
- **Access:** Private (Employee, HR)
- **Description:** Change authenticated user's password

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "oldPassword": "123456",
  "newPassword": "newPassword@123"
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

### 3.1 View My Payslips
- **Method:** `GET`
- **Endpoint:** `/employee/payslips`
- **Access:** Private (Employee role only)
- **Description:** Retrieve all payslips for the logged-in employee

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Query Parameters (Optional):**
```
?year=2024
```

**Response (200 - Success):**
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
      },
      {
        "name": "Bonus",
        "amount": 5000,
        "type": "variable"
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
    "paymentDate": "2024-02-05T00:00:00.000Z",
    "createdAt": "2024-02-01T10:00:00.000Z",
    "updatedAt": "2024-02-01T10:00:00.000Z"
  }
]
```

---

### 3.2 Download Payslip (PDF)
- **Method:** `GET`
- **Endpoint:** `/employee/payslips/:id/download`
- **Access:** Private (Employee role only)
- **Description:** Download a specific payslip as PDF

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439013"
```

**Response (200 - Success):**
- Returns PDF file with Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="payslip-507f1f77bcf86cd799439013.pdf"`

---

### 3.3 View My Attendance
- **Method:** `GET`
- **Endpoint:** `/employee/attendance`
- **Access:** Private (Employee role only)
- **Description:** Retrieve attendance records for the logged-in employee

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Query Parameters (Optional):**
```
?year=2024&month=1
```

**Response (200 - Success):**
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
    ],
    "createdAt": "2024-02-01T10:00:00.000Z",
    "updatedAt": "2024-02-01T10:00:00.000Z"
  }
]
```

---

### 3.4 Download Attendance (CSV)
- **Method:** `GET`
- **Endpoint:** `/employee/attendance/download`
- **Access:** Private (Employee role only)
- **Description:** Download attendance records as CSV file

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Query Parameters (Optional):**
```
?year=2024&month=1
```

**Response (200 - Success):**
- Returns CSV file with Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="attendance.csv"`

---

## 4. HR ENDPOINTS

### 4.1 Onboard Employee
- **Method:** `POST`
- **Endpoint:** `/hr/onboard`
- **Access:** Private (HR role only)
- **Description:** Create a new employee and associate user account

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

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

**Note:** The `employeeId` and `password` fields in the request (if provided) will be ignored. The `employeeId` is auto-generated by the system with the prefix `EMP` (e.g., `EMP001`, `EMP002`, ...) and is assigned sequentially. The default password for all new employees is `"password"`. Employees can change their password after first login using the Change Password endpoint.

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
- **Access:** Private (HR role only)
- **Description:** Retrieve all employees

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**Response (200 - Success):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "employeeId": "EMP001",
    "firstName": "Tejas",
    "lastName": "Kumar",
    "personalEmail": "tejas@gmail.com",
    "designation": "Software Engineer",
    "department": "IT",
    "joiningDate": "2024-01-15T00:00:00.000Z",
    "isActive": true
  },
  {
    "_id": "507f1f77bcf86cd799439015",
    "employeeId": "EMP002",
    "firstName": "John",
    "lastName": "Doe",
    "personalEmail": "john.doe@company.com",
    "designation": "Senior Developer",
    "department": "Engineering",
    "joiningDate": "2024-02-01T00:00:00.000Z",
    "isActive": true
  }
]
```

---

### 4.3 Get Employee By ID
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id`
- **Access:** Private (HR role only)
- **Description:** Retrieve specific employee details

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439012"
```

**Response (200 - Success):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "Tejas",
  "lastName": "Kumar",
  "personalEmail": "tejas@gmail.com",
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
- **Access:** Private (HR role only)
- **Description:** Update employee information

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439012"
```

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

**Response (200 - Success):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "employeeId": "EMP001",
  "firstName": "Tejas",
  "lastName": "Kumar",
  "personalEmail": "tejas@gmail.com",
  "designation": "Lead Software Engineer",
  "department": "Engineering",
  "joiningDate": "2024-01-15T00:00:00.000Z",
  "phone": "9123456789",
  "isActive": true
}
```

---

### 4.5 Get Salary Details
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id/salary`
- **Access:** Private (HR role only)
- **Description:** Retrieve salary structure for an employee

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439012"
```

**Response (200 - Success):**
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
    },
    {
      "name": "ESI",
      "amount": 850,
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
- **Access:** Private (HR role only)
- **Description:** Update employee's salary structure

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439012"
```

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
    },
    {
      "name": "DA",
      "amount": 11000
    }
  ],
  "deductions": [
    {
      "name": "PF",
      "amount": 1800,
      "isPercent": false,
      "percentOf": "Basic"
    },
    {
      "name": "ESI",
      "amount": 850,
      "isPercent": false,
      "percentOf": "Basic"
    }
  ]
}
```

**Response (200 - Success):**
```json
{
  "_id": "507f1f77bcf86cd799439020",
  "employee": "507f1f77bcf86cd799439012",
  "annualCTC": 1300000,
  "earnings": [
    {
      "name": "Basic Salary",
      "amount": 55000
    },
    {
      "name": "HRA",
      "amount": 16500
    },
    {
      "name": "DA",
      "amount": 11000
    }
  ],
  "deductions": [
    {
      "name": "PF",
      "amount": 1800,
      "isPercent": false,
      "percentOf": "Basic"
    },
    {
      "name": "ESI",
      "amount": 850,
      "isPercent": false,
      "percentOf": "Basic"
    }
  ]
}
```

---

### 4.7 Get Employee Attendance
- **Method:** `GET`
- **Endpoint:** `/hr/employees/:id/attendance`
- **Access:** Private (HR role only)
- **Description:** Retrieve attendance records for a specific employee

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439012"
```

**Response (200 - Success):**
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
- **Access:** Private (HR role only)
- **Description:** Create a new attendance record for an employee

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

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
  "variableEarnings": [
    {
      "name": "Overtime Bonus",
      "amount": 1500
    }
  ],
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
- **Access:** Private (HR role only)
- **Description:** Update an existing attendance record

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
```
:attId = "507f1f77bcf86cd799439021"
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
  ],
  "variableDeductions": []
}
```

**Response (200 - Success):**
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
  "variableEarnings": [
    {
      "name": "Overtime Bonus",
      "amount": 3000
    }
  ],
  "variableDeductions": [],
  "updatedAt": "2024-02-20T14:30:00.000Z"
}
```

---

### 4.10 Upload Payroll (CSV)
- **Method:** `POST`
- **Endpoint:** `/hr/upload/payroll`
- **Access:** Private (HR role only)
- **Description:** Upload bulk payroll data via CSV file

**Alias:** `POST /hr/attendance/upload` is supported as an alternative path for clients that use that URL.

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

- `mode` - `daily` or `monthly`. If omitted, the server will attempt to auto-detect based on headers/columns.
- `action` - `preview` | `append` | `overwrite`.
  - `preview`: parse and validate file, return summary without writing to DB (response `200`).
  - `append`: insert new records and update existing according to `dedupeStrategy` (response `201`).
  - `overwrite`: replace existing month records for the target month/year (response `201`).
- `dedupeStrategy` - `skip` | `update` | `error`.
  - `skip`: keep existing records and skip duplicates.
  - `update`: update existing records with incoming values.
  - `error`: abort on first duplicate and return error details.
- `year` - (number) target year when required/ambiguous.
- `month` - (number 1-12) target month when required/ambiguous.

**Request Body (Form Data):**
```
payrollFile: <CSV file>
```

**CSV Format Examples:**

- Monthly summary format (one row per employee/month):

```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,2,2024,22,20,2,8
EMP002,2,2024,22,21,1,0
```

- Daily attendance format (one row per employee per day) — useful with `mode=daily`:

```csv
employeeId,date,status,checkIn,checkOut
EMP001,2024-02-01,P,09:30,18:30
EMP001,2024-02-02,P,09:25,18:20
EMP002,2024-02-01,LOP,,
```

Note: for daily mode the server aggregates daily rows into monthly attendance summaries (daysPresent, leaveWithoutPay, overtimeHours) unless you prefer uploading pre-aggregated monthly files.

**Behavior & Responses:**

- `preview` (`action=preview` or default in some clients): server validates and returns a processing summary but does not write to the database. Response: `200`.

- `append` / `overwrite`: server performs writes and returns `201` on success.

- Response body (successful write example):

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

- Response body (preview example):

```json
{
  "message": "Preview processed",
  "recordsProcessed": 3,
  "successCount": 3,
  "failureCount": 0,
  "issues": []
}
```

**Error examples:**

- Duplicate with `dedupeStrategy=error`:

```json
{
  "message": "Duplicate attendance record found",
  "details": { "employeeId": "EMP002", "month": 2, "year": 2024 }
}
```

**Notes / Validation:**

- The server accepts CSV (UTF-8). XLSX support is planned; see `ATTENDANCE_UPLOAD_SPEC.md` for exact column schema and client examples.
- File size limit: 5MB (uploads larger than this should use background job processing; consider batching or server-side queue).
- The form field name remains `payrollFile`. The endpoint also accepts `mode=daily` CSVs for granular uploads.

For full client examples (curl/axios/fetch) and the complete CSV header specification, see `ATTENDANCE_UPLOAD_SPEC.md` in the repo.

---

### 4.11 Generate Payslips
- **Method:** `POST`
- **Endpoint:** `/hr/payroll/generate`
- **Access:** Private (HR role only)
- **Description:** Generate payslips for all employees for a specific month/year

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "month": 2,
  "year": 2024
}
```

**Response (200 - Success):**
```json
{
  "message": "Payroll run for 2/2024 completed.",
  "payslipsGenerated": 15,
  "totalGrossEarnings": 1050000,
  "totalNetPay": 975000,
  "payslips": [
    {
      "employee": "507f1f77bcf86cd799439012",
      "payslipId": "507f1f77bcf86cd799439022",
      "month": 2,
      "year": 2024,
      "grossEarnings": 70000,
      "totalDeductions": 6800,
      "netPay": 63200
    }
  ]
}
```

---

### 4.12 Download Payslip for Employee (PDF)
- **Method:** `GET`
- **Endpoint:** `/hr/payslips/:id/download`
- **Access:** Private (HR role only)
- **Description:** Download a specific payslip as PDF

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439022"
```

**Response (200 - Success):**
- Returns PDF file with Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="payslip-507f1f77bcf86cd799439022.pdf"`

---

### 4.13 Reset User Password
- **Method:** `PUT`
- **Endpoint:** `/hr/users/:id/reset-password`
- **Access:** Private (HR role only)
- **Description:** Reset a user's password (HR admin function)

**Request Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

**URL Parameters:**
```
:id = "507f1f77bcf86cd799439016" (User MongoDB ID)
```

**Request Body:**
```json
{
  "newPassword": "tempPassword@123"
}
```

**Response (200 - Success):**
```json
{
  "message": "User password reset successfully"
}
```

---

## ERROR RESPONSES

### Common Error Format:

**400 - Bad Request:**
```json
{
  "message": "Invalid input or validation error"
}
```

**401 - Unauthorized:**
```json
{
  "message": "Invalid credentials or token expired"
}
```

**403 - Forbidden:**
```json
{
  "message": "Insufficient permissions to access this resource"
}
```

**404 - Not Found:**
```json
{
  "message": "Resource not found"
}
```

**500 - Internal Server Error:**
```json
{
  "message": "Internal Server Error"
}
```

---

## AUTHENTICATION NOTES

1. **JWT Token Expiration:** 1 day (24 hours)
2. **Token Format:** Include in header as `Authorization: Bearer <token>`
3. **Roles:**
   - `employee`: Access to personal payslips, attendance, and profile
   - `hr`: Access to all HR management functions

---

## IMPORTANT NOTES

- All dates should be in ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS.SSSZ`)
- All monetary values are in INR
- Employee IDs must be unique
- Email addresses must be unique across the system
- Attendance can only be created once per employee per month
- Salary updates become effective from the effective date specified
- File uploads (CSV/payroll) have a size limit of 5MB

---

## SUMMARY TABLE

| # | Method | Endpoint | Role | Description |
|---|--------|----------|------|-------------|
| 1 | POST | `/auth/login` | Public | Login and get token |
| 2 | GET | `/users/profile` | Employee, HR | Get my profile |
| 3 | PUT | `/users/profile` | Employee, HR | Update my profile |
| 4 | PUT | `/users/password` | Employee, HR | Change my password |
| 5 | GET | `/employee/payslips` | Employee | View my payslips |
| 6 | GET | `/employee/payslips/:id/download` | Employee | Download payslip PDF |
| 7 | GET | `/employee/attendance` | Employee | View my attendance |
| 8 | GET | `/employee/attendance/download` | Employee | Download attendance CSV |
| 9 | POST | `/hr/onboard` | HR | Onboard new employee |
| 10 | GET | `/hr/employees` | HR | Get all employees |
| 11 | GET | `/hr/employees/:id` | HR | Get employee by ID |
| 12 | PUT | `/hr/employees/:id` | HR | Update employee profile |
| 13 | GET | `/hr/employees/:id/salary` | HR | Get salary details |
| 14 | PUT | `/hr/employees/:id/salary` | HR | Update salary details |
| 15 | GET | `/hr/employees/:id/attendance` | HR | Get employee attendance |
| 16 | POST | `/hr/attendance` | HR | Create attendance record |
| 17 | PUT | `/hr/attendance/:attId` | HR | Update attendance record |
| 18 | POST | `/hr/upload/payroll` | HR | Upload payroll CSV |
| 19 | POST | `/hr/payroll/generate` | HR | Generate payslips |
| 20 | GET | `/hr/payslips/:id/download` | HR | Download payslip PDF |
| 21 | PUT | `/hr/users/:id/reset-password` | HR | Reset user password |
