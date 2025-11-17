# Payslip Generation API - Complete Reference

**Last Updated:** November 17, 2025  
**Version:** 2.0  
**Module:** Payslip Generation & Management

---

## Table of Contents

1. [Overview](#overview)
2. [Business Logic & Calculations](#business-logic--calculations)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Testing Scenarios](#testing-scenarios)
8. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

The Payslip Generation module handles **monthly payroll processing** for all active employees. It calculates salaries based on:
- Fixed salary structure (from employee master)
- **Daily attendance data** (automatically aggregated to monthly summary)
- Variable earnings/deductions (bonuses, advances)
- Pro-rata adjustments (for mid-month joiners)

### Data Source

Payslip generation **automatically aggregates daily attendance records** from the `daily_attendance` collection:
- Queries all daily records for each employee for the target month
- Calculates: totalWorkingDays, daysPresent, LOP days, overtime hours
- Status codes that count as "present": P (Present), PL (Paid Leave), H (Holiday), WO (Week Off)
- Status codes for deductions: A (Absent - no pay), LOP (Leave Without Pay)
- Optional variable earnings/deductions from `attendance_details` collection if needed

### Key Features

✅ **Batch Processing** - Generates payslips for all employees in one API call  
✅ **Idempotent** - Safe to re-run (skips existing payslips)  
✅ **Graceful Error Handling** - Individual failures don't stop batch  
✅ **Pro-rata Calculations** - Auto-adjusts for mid-month joiners  
✅ **LOP Deductions** - Proportional salary reduction for unpaid leave  
✅ **Month-end Validation** - Prevents premature payroll runs  
✅ **HR Exclusion** - HR users automatically excluded from payroll  
✅ **PDF Generation** - Download individual payslips  
✅ **Detailed Reporting** - Success/failure/skipped counts with errors  

### Workflow

```
1. HR uploads attendance data (daily CSV with date, status, hours)
2. HR triggers payslip generation (POST /hr/payroll/generate)
3. Backend validates month has ended
4. Backend processes each employee:
   - Checks for existing payslip (skip if exists)
   - Fetches salary structure
   - Aggregates daily attendance records to monthly summary
   - Validates data completeness
   - Calculates pro-rata (if mid-month joiner)
   - Calculates earnings (fixed + variable)
   - Calculates deductions (statutory + variable)
   - Calculates totals (gross, deductions, net)
   - Saves payslip to database
5. Backend returns summary report
6. Employees view/download their payslips
```

---

## Business Logic & Calculations

### 1. Salary Components

#### **Earnings:**
- **Fixed Earnings** - From salary structure (Basic, HRA, DA, etc.)
- **Variable Earnings** - From attendance file (Bonuses, Commissions, Reimbursements)

#### **Deductions:**
- **Statutory Deductions** - PF, ESI, Professional Tax (from salary structure)
- **Variable Deductions** - Salary Advance, Loan EMI (from attendance file)

### 2. Calculation Formulas

#### **Basic Formula (Full Month, No LOP):**
```
Monthly Basic = Annual CTC ÷ 12
Gross Earnings = Sum of all earnings
Total Deductions = Sum of all deductions
Net Pay = Gross Earnings - Total Deductions
```

#### **With Leave Without Pay (LOP):**
```
Per Day Rate = Monthly Amount ÷ Total Working Days
Prorated Amount = Per Day Rate × Days Present
```

**Example:**
- Monthly Basic: ₹50,000
- Total Working Days: 22
- Days Present: 20 (2 LOP days)
- Per Day Rate: ₹50,000 ÷ 22 = ₹2,272.73
- Actual Basic: ₹2,272.73 × 20 = ₹45,454.55

#### **With Mid-Month Joiner:**
```
Days in Month = 28/30/31 (calendar days)
Days Employed = Days in Month - Joining Date + 1
Pro-rata Factor = Days Employed ÷ Days in Month
Final Amount = LOP Prorated Amount × Pro-rata Factor
```

**Example:**
- Employee joins on Feb 15 (28-day month)
- Days employed: 28 - 15 + 1 = 14 days
- Pro-rata factor: 14 ÷ 28 = 0.5 (50%)
- Monthly Basic: ₹60,000
- Prorated Basic: ₹60,000 × 0.5 = ₹30,000

**Combined Example (Mid-month joiner + LOP):**
- Employee joins Feb 15 (14 working days for them)
- Total working days: 14
- Days present: 12 (2 LOP)
- Monthly Basic: ₹60,000
- Step 1 - LOP proration: (₹60,000 ÷ 14) × 12 = ₹51,428.57
- Step 2 - Mid-month proration: ₹51,428.57 × 0.5 = ₹25,714.29

#### **Percentage-based Deductions:**
```
PF = 12% of Basic Salary (after LOP & pro-rata)
```

**Example:**
- Final Basic (after LOP & pro-rata): ₹45,000
- PF Deduction: ₹45,000 × 12% = ₹5,400

#### **Fixed Deductions:**
Apply same LOP and pro-rata logic as earnings.

### 3. Calculation Order

**Step 1:** Calculate Fixed Earnings (with LOP & pro-rata)  
**Step 2:** Add Variable Earnings (no proration)  
**Step 3:** Calculate Fixed Deductions (with LOP & pro-rata)  
**Step 4:** Add Variable Deductions (no proration)  
**Step 5:** Sum totals and calculate net pay  

### 4. Rounding Rules

- All amounts rounded to **nearest integer** using `Math.round()`
- No decimal places in final payslip
- Rounding applied to each line item before summing

---

## API Endpoints

### 1. Generate Payslips (HR)

Generate payslips for all active employees for a specific month.

**Endpoint:** `POST /api/hr/payroll/generate`  
**Access:** HR only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "month": 11,
  "year": 2025,
  "force": false
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| month | number | Yes | Month number (1-12) |
| year | number | Yes | Year (2000-2100) |
| force | boolean | No | Allow generation before month ends (default: false) |

#### Validations

The API performs these validations **before** processing:

1. ✅ **Input Validation**
   - `month` must be 1-12
   - `year` must be 2000-2100
   - Both fields required

2. ✅ **Month-end Check**
   - Current date must be >= first day of next month
   - Example: For Nov 2025 payroll, current date must be >= Dec 1, 2025
   - Override with `force: true` (not recommended)

3. ✅ **Active Employees Check**
   - At least one active employee must exist
   - HR users (employeeId starts with "HR") automatically excluded

**Per Employee Validations:**

4. ✅ **Duplicate Check**
   - Skip if payslip already exists (idempotent)

5. ✅ **Salary Structure Check**
   - Employee must have salary configured
   - Error if missing

6. ✅ **Attendance Data Check**
   - At least one daily attendance record must exist for the month
   - Automatically aggregates from `daily_attendance` collection
   - Error if no daily records found

7. ✅ **Working Days Validation**
   - `totalWorkingDays` must be > 0
   - `daysPresent` must be 0 to `totalWorkingDays`

#### Response Examples

**Success (200 OK):**
```json
{
  "message": "Payroll run for 11/2025 completed successfully.",
  "processed": 15,
  "success": 14,
  "skipped": 1,
  "failed": 0,
  "errors": [],
  "warnings": [
    "Employee EMP005 joined mid-month (11/15/2025). Salary pro-rated to 53.3% (16/30 days)."
  ]
}
```

**Partial Success with Errors (200 OK):**
```json
{
  "message": "Payroll run for 11/2025 completed successfully.",
  "processed": 10,
  "success": 7,
  "skipped": 1,
  "failed": 2,
  "errors": [
    "Employee EMP004: Missing attendance data. Please upload attendance before generating payslips.",
    "Employee EMP007: Missing salary structure. Please configure salary first."
  ],
  "warnings": []
}
```

**All Skipped (Already Generated):**
```json
{
  "message": "Payroll run for 11/2025 completed successfully.",
  "processed": 15,
  "success": 0,
  "skipped": 15,
  "failed": 0,
  "errors": [],
  "warnings": []
}
```

**Month Not Ended (400 Bad Request):**
```json
{
  "message": "Payroll for 11/2025 cannot be run before month ends (11/30/2025). Current date: 11/16/2025. Use force=true to override (not recommended)."
}
```

**Invalid Input (400 Bad Request):**
```json
{
  "message": "Invalid month or year. Month must be 1-12, year must be between 2000-2100."
}
```

**No Active Employees (400 Bad Request):**
```json
{
  "message": "No active employees found for payroll processing. (HR users are excluded from payroll)"
}
```

**No Daily Attendance Data (Individual Employee Error):**
```json
{
  "errors": [
    "Employee EMP001: Missing attendance data. Please upload attendance before generating payslips."
  ]
}
```

**Note:** The "Missing attendance data" error means no daily attendance records found in `daily_attendance` collection for that employee for the target month.

**With Force Flag (Before Month End):**
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

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| message | string | Overall status message |
| processed | number | Total employees processed |
| success | number | Payslips successfully generated |
| skipped | number | Employees skipped (existing payslips) |
| failed | number | Employees failed (errors) |
| errors | string[] | Array of error messages with employee IDs |
| warnings | string[] | Array of warning messages (pro-rata, etc.) |

#### Processing Behavior

- **Independent Processing:** Each employee processed separately
- **No Transactions:** Failures don't rollback successful payslips
- **Continue on Error:** Individual failures don't stop batch
- **Idempotent:** Safe to re-run (skips existing payslips)

**Scenario: First run with 2 failures**
- Processed: 10
- Success: 7 (payslips created)
- Failed: 2 (missing data)
- Skipped: 1 (already had payslip)

**Scenario: Fix data and re-run**
- Processed: 10
- Success: 2 (only the previously failed ones)
- Failed: 0
- Skipped: 8 (now includes the 7 from first run + 1 existing)

---

### 2. View My Payslips (Employee)

Get list of payslips for logged-in employee.

**Endpoint:** `GET /api/employee/payslips`  
**Access:** Employee only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
```
?year=2025
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | No | Filter by year (optional) |

#### Response (200 OK)

```json
[
  {
    "_id": "673abc123def456789012345",
    "employee": "507f1f77bcf86cd799439012",
    "month": 11,
    "year": 2025,
    "generatedOn": "2025-12-01T10:00:00.000Z",
    "payrollInfo": {
      "totalWorkingDays": 22,
      "daysPaid": 20,
      "lopDays": 2
    },
    "earnings": [
      {
        "name": "Basic Salary",
        "amount": 45455,
        "type": "fixed"
      },
      {
        "name": "HRA",
        "amount": 13636,
        "type": "fixed"
      },
      {
        "name": "Performance Bonus",
        "amount": 5000,
        "type": "variable"
      }
    ],
    "deductions": [
      {
        "name": "Provident Fund",
        "amount": 5455,
        "type": "statutory"
      },
      {
        "name": "Professional Tax",
        "amount": 200,
        "type": "statutory"
      }
    ],
    "grossEarnings": 64091,
    "totalDeductions": 5655,
    "netPay": 58436,
    "status": "generated",
    "createdAt": "2025-12-01T10:00:00.000Z",
    "updatedAt": "2025-12-01T10:00:00.000Z"
  },
  {
    "_id": "673abc123def456789012346",
    "employee": "507f1f77bcf86cd799439012",
    "month": 10,
    "year": 2025,
    "generatedOn": "2025-11-01T10:00:00.000Z",
    "payrollInfo": {
      "totalWorkingDays": 23,
      "daysPaid": 23,
      "lopDays": 0
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
        "name": "Provident Fund",
        "amount": 6000,
        "type": "statutory"
      }
    ],
    "grossEarnings": 65000,
    "totalDeductions": 6000,
    "netPay": 59000,
    "status": "paid",
    "paymentDate": "2025-11-05T00:00:00.000Z",
    "createdAt": "2025-11-01T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z"
  }
]
```

**Empty Response (No Payslips):**
```json
[]
```

---

### 3. Download My Payslip (Employee)

Get complete payslip details with attendance summary and salary breakdown for frontend PDF generation.

**Endpoint:** `GET /api/employee/payslips/:id/download`  
**Access:** Employee only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**URL Parameters:**
```
:id = Payslip MongoDB ObjectId
```

**Example:**
```http
GET /api/employee/payslips/673abc123def456789012345/download
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "_id": "673abc123def456789012345",
  "employee": {
    "employeeId": "EMP001",
    "firstName": "John",
    "lastName": "Doe",
    "designation": "Senior Software Engineer",
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
    {
      "name": "Basic Salary",
      "amount": 45455,
      "type": "fixed"
    },
    {
      "name": "HRA",
      "amount": 13636,
      "type": "fixed"
    },
    {
      "name": "Special Allowance",
      "amount": 9091,
      "type": "fixed"
    },
    {
      "name": "Performance Bonus",
      "amount": 5000,
      "type": "variable"
    }
  ],
  "deductions": [
    {
      "name": "Provident Fund",
      "amount": 5455,
      "type": "statutory"
    },
    {
      "name": "Professional Tax",
      "amount": 200,
      "type": "tax"
    },
    {
      "name": "LOP Deduction",
      "amount": 4132,
      "type": "lop"
    }
  ],
  "grossEarnings": 73182,
  "totalDeductions": 9787,
  "netPay": 63395,
  "status": "generated",
  "paymentDate": null
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Payslip MongoDB ObjectId |
| `employee` | object | Employee details for payslip header |
| `employee.employeeId` | string | Employee ID (e.g., EMP001) |
| `employee.firstName` | string | Employee first name |
| `employee.lastName` | string | Employee last name |
| `employee.designation` | string | Job title |
| `employee.department` | string | Department name |
| `employee.bankDetails` | object | Bank account information |
| `employee.taxInfo` | object | Tax information (PAN, UAN) |
| `month` | number | Month (1-12) |
| `year` | number | Year |
| `generatedOn` | string | Timestamp when payslip was generated |
| `payrollInfo` | object | **Attendance summary** |
| `payrollInfo.totalWorkingDays` | number | Total working days in month |
| `payrollInfo.daysPaid` | number | Days counted for salary (includes P, PL, H, WO) |
| `payrollInfo.lopDays` | number | Leave Without Pay days |
| `earnings` | array | **Salary breakdown - Earnings** |
| `earnings[].name` | string | Earning component name |
| `earnings[].amount` | number | Calculated amount (after LOP/pro-rata) |
| `earnings[].type` | string | Type: `fixed`, `variable`, `reimbursement` |
| `deductions` | array | **Salary breakdown - Deductions** |
| `deductions[].name` | string | Deduction component name |
| `deductions[].amount` | number | Calculated amount |
| `deductions[].type` | string | Type: `statutory`, `tax`, `lop`, `other` |
| `grossEarnings` | number | **Total earnings** (sum of all earnings) |
| `totalDeductions` | number | **Total deductions** (sum of all deductions) |
| `netPay` | number | **Final credit amount** (grossEarnings - totalDeductions) |
| `status` | string | Payment status: `pending`, `paid`, `generated` |
| `paymentDate` | string/null | Date when payment was made (null if not paid) |

#### Error Response (404 Not Found)

```json
{
  "message": "Payslip not found"
}
```

**Security:**
- Employee can only download their own payslips
- Backend validates payslip belongs to authenticated user

---

### 4. View All Payslips (HR)

Get list of all payslips across all employees with optional filters.

**Endpoint:** `GET /api/hr/payslips`  
**Access:** HR only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
```
?year=2025
?month=10
?employeeId=507f1f77bcf86cd799439012
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | No | Filter by year (e.g., 2025) |
| month | number | No | Filter by month (1-12) |
| employeeId | string | No | Filter by employee MongoDB ObjectId |

**Example:**
```http
GET /api/hr/payslips?year=2025&month=11
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

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

**Empty Response:**
```json
[]
```

---

### 5. View Employee Payslips (HR)

Get all payslips for a specific employee with optional filters.

**Endpoint:** `GET /api/hr/employees/:employeeId/payslips`  
**Access:** HR only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**URL Parameters:**
```
:employeeId = Employee MongoDB ObjectId
```

**Query Parameters:**
```
?year=2025
?month=10
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | No | Filter by year (e.g., 2025) |
| month | number | No | Filter by month (1-12) |

**Example:**
```http
GET /api/hr/employees/674123456789abcdef012345/payslips?year=2025
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

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

**Error Response (404):**
```json
{
  "message": "Employee not found or no payslips available"
}
```

---

### 6. Download Employee Payslip Details (HR)

Get complete payslip details for any employee with attendance summary and salary breakdown for frontend PDF generation.

**Endpoint:** `GET /api/hr/payslips/:id/download`  
**Access:** HR only  
**Authentication:** Bearer token required

#### Request

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**URL Parameters:**
```
:id = Payslip MongoDB ObjectId
```

**Example:**
```http
GET /api/hr/payslips/673abc123def456789012345/download
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response (200 OK)

**Headers:**
```http
Content-Type: application/json
```

**Body:** Same as employee payslip response (see section 3 above)

**Note:** HR can access any employee's payslip. Response includes complete attendance summary, salary breakdown, and final credit amount calculation.

#### Error Response (404 Not Found)

```json
{
  "message": "Payslip not found"
}
```

**Security:**
- Employee endpoint: Can only access own payslips
- HR endpoint: Can access any employee's payslips

---

## Data Models

### Payslip Model

**Collection:** `payslips`

```typescript
{
  _id: ObjectId,
  employee: ObjectId,              // Ref: Employee
  month: Number,                   // 1-12
  year: Number,                    // e.g., 2025
  generatedOn: Date,               // Auto-set to now
  payrollInfo: {
    totalWorkingDays: Number,      // From attendance
    daysPaid: Number,              // From attendance (daysPresent)
    lopDays: Number                // From attendance (leaveWithoutPay)
  },
  earnings: [{
    name: String,                  // e.g., "Basic Salary"
    amount: Number,                // Rounded to integer
    type: String                   // "fixed" | "variable" | "reimbursement"
  }],
  deductions: [{
    name: String,                  // e.g., "Provident Fund"
    amount: Number,                // Rounded to integer
    type: String                   // "statutory" | "tax" | "lop" | "other"
  }],
  grossEarnings: Number,           // Sum of all earnings
  totalDeductions: Number,         // Sum of all deductions
  netPay: Number,                  // grossEarnings - totalDeductions
  status: String,                  // "pending" | "paid" | "generated"
  paymentDate: Date,               // Optional, set when status = "paid"
  createdAt: Date,                 // Auto-generated
  updatedAt: Date                  // Auto-generated
}
```

**Unique Index:** `(employee, month, year)`  
**Purpose:** Ensures one payslip per employee per month

### Earning Types

| Type | Description | Examples | Proration |
|------|-------------|----------|-----------|
| fixed | From salary structure | Basic, HRA, DA, Allowances | Yes (LOP + pro-rata) |
| variable | Performance-based | Bonus, Commission, Incentive | No |
| reimbursement | Expense reimbursement | Travel, Medical, Food | No |

### Deduction Types

| Type | Description | Examples | Proration |
|------|-------------|----------|-----------|
| statutory | Legal deductions | PF, ESI, Professional Tax | Yes (if fixed amount) |
| tax | Income tax | TDS | Calculated % |
| lop | Leave without pay | LOP Deduction | Calculated |
| other | Miscellaneous | Salary Advance, Loan EMI | No |

### Status Values

| Status | Description | When Set |
|--------|-------------|----------|
| generated | Payslip created, pending payment | Default after generation |
| paid | Salary disbursed | After payment processed |
| pending | Awaiting approval/processing | Future use |

---

## Error Handling

### Validation Errors (400 Bad Request)

**Missing Required Fields:**
```json
{
  "message": "Month and year are required fields."
}
```

**Invalid Range:**
```json
{
  "message": "Invalid month or year. Month must be 1-12, year must be between 2000-2100."
}
```

**Month Not Ended:**
```json
{
  "message": "Payroll for 11/2025 cannot be run before month ends (11/30/2025). Current date: 11/16/2025. Use force=true to override (not recommended)."
}
```

### Processing Errors (200 OK with errors array)

**Missing Salary Structure:**
```
"Employee EMP004: Missing salary structure. Please configure salary first."
```

**Missing Attendance:**
```
"Employee EMP007: Missing attendance data. Please upload attendance before generating payslips."
```

**Invalid Working Days:**
```
"Employee EMP002: Total working days must be greater than 0."
```

**Invalid Days Present:**
```
"Employee EMP003: Invalid days present (25). Must be between 0 and 22."
```

### Warnings (200 OK with warnings array)

**Mid-month Joiner:**
```
"Employee EMP005 joined mid-month (11/15/2025). Salary pro-rated to 53.3% (16/30 days)."
```

**Negative Net Pay:**
```
"Employee EMP009: Negative net pay (-5000). Deductions exceed earnings."
```

**Force Flag Used:**
```
"WARNING: Payroll generated before month end. Attendance data may be incomplete."
```

### Not Found Errors (404 Not Found)

**Payslip Not Found:**
```json
{
  "message": "Payslip not found"
}
```

### Authorization Errors (401/403)

**Missing Token (401):**
```json
{
  "message": "Not authorized, no token"
}
```

**Wrong Role (403):**
```json
{
  "message": "Role 'employee' is not authorized for this action"
}
```

---

## Frontend Integration Guide

### React/TypeScript Example

```typescript
// api/payroll.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface PayrollGenerationRequest {
  month: number;
  year: number;
  force?: boolean;
}

interface PayrollGenerationResponse {
  message: string;
  processed: number;
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
  warnings?: string[];
}

interface Payslip {
  _id: string;
  employee: string;
  month: number;
  year: number;
  generatedOn: string;
  payrollInfo: {
    totalWorkingDays: number;
    daysPaid: number;
    lopDays: number;
  };
  earnings: Array<{
    name: string;
    amount: number;
    type: 'fixed' | 'variable' | 'reimbursement';
  }>;
  deductions: Array<{
    name: string;
    amount: number;
    type: 'statutory' | 'tax' | 'lop' | 'other';
  }>;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: 'pending' | 'paid' | 'generated';
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

// 1. Generate Payslips (HR only)
export const generatePayslips = async (
  request: PayrollGenerationRequest,
  token: string
): Promise<PayrollGenerationResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/hr/payroll/generate`,
    request,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 2. Get My Payslips (Employee)
export const getMyPayslips = async (
  year?: number,
  token: string
): Promise<Payslip[]> => {
  const params = year ? { year } : {};
  
  const response = await axios.get(
    `${API_BASE_URL}/employee/payslips`,
    {
      headers: { Authorization: `Bearer ${token}` },
      params
    }
  );
  
  return response.data;
};

// 3. Get Payslip Details with Full Breakdown (Employee)
export const getMyPayslipDetails = async (
  payslipId: string,
  token: string
): Promise<any> => {
  const response = await axios.get(
    `${API_BASE_URL}/employee/payslips/${payslipId}/download`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};

// 4. Get Employee Payslip Details (HR only)
export const getEmployeePayslipDetails = async (
  payslipId: string,
  token: string
): Promise<any> => {
  const response = await axios.get(
    `${API_BASE_URL}/hr/payslips/${payslipId}/download`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  
  return response.data;
};
```

### Frontend PDF Generation

The API returns **JSON data with complete payslip breakdown**. Frontend is responsible for generating the PDF using this data.

**Recommended Libraries:**
- `jsPDF` - PDF generation
- `pdfmake` - More advanced PDF layouts
- `react-pdf` - React-specific PDF rendering

**Example using jsPDF:**

```typescript
import jsPDF from 'jspdf';
import { getMyPayslipDetails } from '../api/payroll';

const generatePayslipPDF = async (payslipId: string, token: string) => {
  const data = await getMyPayslipDetails(payslipId, token);
  
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('PAYSLIP', 105, 20, { align: 'center' });
  
  // Employee Info
  doc.setFontSize(12);
  doc.text(`Employee: ${data.employee.firstName} ${data.employee.lastName}`, 20, 40);
  doc.text(`ID: ${data.employee.employeeId}`, 20, 47);
  doc.text(`Designation: ${data.employee.designation}`, 20, 54);
  doc.text(`Month/Year: ${data.month}/${data.year}`, 20, 61);
  
  // Attendance Summary
  doc.setFontSize(14);
  doc.text('Attendance Summary', 20, 75);
  doc.setFontSize(11);
  doc.text(`Total Working Days: ${data.payrollInfo.totalWorkingDays}`, 20, 82);
  doc.text(`Days Paid: ${data.payrollInfo.daysPaid}`, 20, 89);
  doc.text(`LOP Days: ${data.payrollInfo.lopDays}`, 20, 96);
  
  // Earnings Breakdown
  let y = 110;
  doc.setFontSize(14);
  doc.text('Earnings', 20, y);
  y += 7;
  doc.setFontSize(11);
  data.earnings.forEach((e: any) => {
    doc.text(`${e.name} (${e.type})`, 25, y);
    doc.text(`₹${e.amount.toLocaleString()}`, 150, y, { align: 'right' });
    y += 6;
  });
  
  // Deductions Breakdown
  y += 5;
  doc.setFontSize(14);
  doc.text('Deductions', 20, y);
  y += 7;
  doc.setFontSize(11);
  data.deductions.forEach((d: any) => {
    doc.text(`${d.name} (${d.type})`, 25, y);
    doc.text(`₹${d.amount.toLocaleString()}`, 150, y, { align: 'right' });
    y += 6;
  });
  
  // Final Calculation
  y += 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Gross Earnings:', 20, y);
  doc.text(`₹${data.grossEarnings.toLocaleString()}`, 150, y, { align: 'right' });
  y += 7;
  doc.text('Total Deductions:', 20, y);
  doc.text(`₹${data.totalDeductions.toLocaleString()}`, 150, y, { align: 'right' });
  y += 7;
  doc.setFontSize(14);
  doc.text('NET PAY:', 20, y);
  doc.text(`₹${data.netPay.toLocaleString()}`, 150, y, { align: 'right' });
  
  // Save/Download
  doc.save(`payslip-${data.employee.employeeId}-${data.month}-${data.year}.pdf`);
};
```

### React Component Example

```tsx
import React, { useState } from 'react';
import { generatePayslips } from '../api/payroll';

const PayrollGenerationForm: React.FC = () => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [force, setForce] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const token = localStorage.getItem('token') || '';

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await generatePayslips({ month, year, force }, token);
      setResult(response);
      
      if (response.failed === 0 && response.success > 0) {
        alert(`Success! Generated ${response.success} payslips.`);
      } else if (response.failed > 0) {
        alert(`Partial success. ${response.success} succeeded, ${response.failed} failed. Check errors below.`);
      } else if (response.skipped === response.processed) {
        alert('All payslips already exist for this month.');
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Payroll generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payroll-generation">
      <h2>Generate Monthly Payslips</h2>
      
      <div className="form-group">
        <label>Month:</label>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <option key={m} value={m}>
              {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Year:</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={2000}
          max={2100}
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={force}
            onChange={(e) => setForce(e.target.checked)}
          />
          Force generate (even if month hasn't ended)
        </label>
        {force && (
          <p className="warning">⚠️ Warning: Attendance data may be incomplete!</p>
        )}
      </div>

      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Payslips'}
      </button>

      {result && (
        <div className="result">
          <h3>Generation Result</h3>
          <div className="stats">
            <p><strong>Processed:</strong> {result.processed}</p>
            <p className="success"><strong>Success:</strong> {result.success}</p>
            <p className="info"><strong>Skipped:</strong> {result.skipped}</p>
            <p className="error"><strong>Failed:</strong> {result.failed}</p>
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <div className="warnings">
              <h4>Warnings:</h4>
              <ul>
                {result.warnings.map((warning: string, i: number) => (
                  <li key={i} className="warning">{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="errors">
              <h4>Errors:</h4>
              <ul>
                {result.errors.map((error: string, i: number) => (
                  <li key={i} className="error">{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayrollGenerationForm;
```

### Employee Payslip View Component

```tsx
import React, { useState, useEffect } from 'react';
import { getMyPayslips, downloadMyPayslip } from '../api/payroll';

const MyPayslips: React.FC = () => {
  const [payslips, setPayslips] = useState<any[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState<boolean>(false);
  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    loadPayslips();
  }, [year]);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const data = await getMyPayslips(year, token);
      setPayslips(data);
    } catch (error) {
      console.error('Failed to load payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payslipId: string) => {
    try {
      await downloadMyPayslip(payslipId, token);
    } catch (error) {
      alert('Failed to download payslip');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="my-payslips">
      <h2>My Payslips</h2>
      
      <div className="filters">
        <label>Year:</label>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2025, 2024, 2023, 2022].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : payslips.length === 0 ? (
        <p>No payslips found for {year}</p>
      ) : (
        <div className="payslips-list">
          {payslips.map(payslip => (
            <div key={payslip._id} className="payslip-card">
              <div className="header">
                <h3>
                  {new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <span className={`status ${payslip.status}`}>
                  {payslip.status}
                </span>
              </div>

              <div className="summary">
                <div className="item">
                  <span className="label">Gross Earnings:</span>
                  <span className="value gross">{formatCurrency(payslip.grossEarnings)}</span>
                </div>
                <div className="item">
                  <span className="label">Total Deductions:</span>
                  <span className="value deductions">-{formatCurrency(payslip.totalDeductions)}</span>
                </div>
                <div className="item net-pay">
                  <span className="label">Net Pay:</span>
                  <span className="value">{formatCurrency(payslip.netPay)}</span>
                </div>
              </div>

              <div className="attendance-info">
                <span>Working Days: {payslip.payrollInfo.totalWorkingDays}</span>
                <span>Days Paid: {payslip.payrollInfo.daysPaid}</span>
                {payslip.payrollInfo.lopDays > 0 && (
                  <span className="lop">LOP: {payslip.payrollInfo.lopDays} days</span>
                )}
              </div>

              <button onClick={() => handleDownload(payslip._id)}>
                Download PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyPayslips;
```

---

## Testing Scenarios

### 1. Normal Payroll Run (Full Month, No LOP)

**Prerequisites:**
- Attendance uploaded for all employees
- Month has ended
- No existing payslips for the month

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- All employees get payslips
- Full salary (no proration)
- `success` = total employee count
- `failed` = 0, `skipped` = 0

### 2. Payroll with LOP Days

**Prerequisites:**
- Some employees have `leaveWithoutPay > 0` in attendance
- `daysPresent < totalWorkingDays`

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- Earnings and deductions prorated based on `daysPresent`
- Formula: `(amount / totalWorkingDays) * daysPresent`

**Verify:**
```
Basic Salary = ₹50,000
Total Working Days = 22
Days Present = 20
Expected Basic = (₹50,000 / 22) × 20 = ₹45,455 (rounded)
```

### 3. Mid-Month Joiner

**Prerequisites:**
- Employee with `joiningDate` in the payroll month
- Example: Joined Nov 15, 2025

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- Warning in response: `"Employee EMP005 joined mid-month..."`
- Salary prorated by calendar days
- Formula: `amount × (daysEmployed / daysInMonth)`

**Verify:**
```
Basic Salary = ₹60,000
Days in Nov = 30
Joining Date = Nov 15
Days Employed = 30 - 15 + 1 = 16
Pro-rata Factor = 16 / 30 = 0.533
Expected Basic = ₹60,000 × 0.533 = ₹32,000 (rounded)
```

### 4. Mid-Month Joiner + LOP

**Prerequisites:**
- Employee joined mid-month
- Has LOP days

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- Both proration factors applied
- Formula: `(amount / totalWorkingDays) × daysPresent × proRataFactor`

**Verify:**
```
Basic Salary = ₹60,000
Joining Date = Nov 15 (16 days employed)
Pro-rata Factor = 16 / 30 = 0.533
Total Working Days (for employee) = 16
Days Present = 14 (2 LOP)
Step 1: ₹60,000 / 16 = ₹3,750 per day
Step 2: ₹3,750 × 14 = ₹52,500
Step 3: ₹52,500 × 0.533 = ₹27,983 (rounded)
```

### 5. Re-run Payroll (Idempotency)

**Prerequisites:**
- Payslips already generated for month/year

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- All employees skipped
- `skipped` = total employee count
- `success` = 0
- No duplicate payslips created

### 6. Partial Failure (Missing Data)

**Prerequisites:**
- Some employees missing salary structure
- Some employees missing attendance

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- Successful employees get payslips
- Failed employees in `errors` array with specific reasons
- `success` + `failed` + `skipped` = `processed`

**Example Response:**
```json
{
  "processed": 10,
  "success": 7,
  "skipped": 0,
  "failed": 3,
  "errors": [
    "Employee EMP004: Missing salary structure...",
    "Employee EMP007: Missing attendance data...",
    "Employee EMP009: Invalid days present (25). Must be between 0 and 22."
  ]
}
```

### 7. Force Flag (Before Month End)

**Prerequisites:**
- Current date before end of target month
- Example: Nov 16, 2025 (month hasn't ended)

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025,
  "force": true
}
```

**Expected:**
- Payslips generated despite month not ending
- Warning in response: `"WARNING: Payroll generated before month end..."`
- Use only for testing/preview

### 8. Month Not Ended (Without Force)

**Prerequisites:**
- Current date before end of target month

**Test:**
```json
POST /api/hr/payroll/generate
{
  "month": 11,
  "year": 2025
}
```

**Expected:**
- 400 Bad Request
- Error: `"Payroll for 11/2025 cannot be run before month ends..."`

### 9. View Payslips (Employee)

**Test:**
```http
GET /api/employee/payslips?year=2025
Authorization: Bearer <token>
```

**Expected:**
- Returns array of payslips for authenticated employee
- Only payslips belonging to that employee
- Filtered by year if provided

### 10. Download Payslip (Employee)

**Test:**
```http
GET /api/employee/payslips/673abc123def456789012345/download
Authorization: Bearer <token>
```

**Expected:**
- PDF file download
- Filename: `payslip-{id}.pdf`
- Content-Type: `application/pdf`
- 404 if payslip doesn't belong to employee

---

## Common Issues & Solutions

### Issue 1: "Month and year are required fields"

**Cause:** Missing `month` or `year` in request body

**Solution:**
```json
{
  "month": 11,
  "year": 2025
}
```

### Issue 2: "Payroll cannot be run before month ends"

**Cause:** Current date is before the end of target month

**Solutions:**
1. **Wait until month ends** (recommended)
2. **Use force flag** (not recommended for production):
```json
{
  "month": 11,
  "year": 2025,
  "force": true
}
```

### Issue 3: "Missing attendance data"

**Cause:** Attendance not uploaded for employee for that month

**Solution:**
1. Upload attendance CSV for the month
2. Re-run payroll generation
3. Only missing employees will be processed (idempotent)

### Issue 4: "Missing salary structure"

**Cause:** Employee doesn't have salary configured

**Solution:**
1. Configure salary via `PUT /api/hr/employees/:id/salary`
2. Re-run payroll generation

### Issue 5: All Employees Skipped

**Cause:** Payslips already exist for month/year

**Solution:**
- This is normal behavior (idempotent)
- If you need to regenerate, delete existing payslips first (database operation)

### Issue 6: Negative Net Pay

**Cause:** Deductions exceed earnings (unusual but possible)

**Solution:**
- Review salary structure
- Review deductions in attendance file
- Check for data entry errors
- Payslip will still be generated with warning

### Issue 7: HR Users Included in Payroll

**Cause:** HR users should not get payslips

**Solution:**
- Backend automatically excludes employees with `employeeId` starting with "HR"
- Ensure HR users have proper employee IDs (HR001, HR002, etc.)

### Issue 8: Wrong Proration Amount

**Cause:** Incorrect calculation of pro-rata or LOP

**Debug Steps:**
1. Check `totalWorkingDays` in attendance
2. Check `daysPresent` in attendance
3. Check `joiningDate` in employee record
4. Verify calculation: `(amount / totalWorkingDays) × daysPresent × proRataFactor`

### Issue 9: Payslip Download Fails

**Cause:** 
- Payslip doesn't exist
- Payslip belongs to different employee (security)

**Solution:**
- Verify payslip ID is correct
- Ensure employee is viewing their own payslip
- HR can download any payslip using HR endpoint

### Issue 10: Percentage Deductions Incorrect

**Cause:** PF or other % deductions calculated wrong

**Debug:**
- Check if `isPercent: true` in salary structure
- Check `percentOf` field (usually "Basic")
- Verify Basic amount in earnings
- Formula: `Basic × (amount / 100)`

---

## Best Practices

### For Frontend Developers

1. **Always Use Preview First:**
   - Show calculation preview before actual generation
   - Not implemented yet, but force=true can serve as test

2. **Handle Partial Failures:**
   - Don't treat as complete failure if some succeed
   - Display errors clearly for failed employees
   - Allow HR to fix data and re-run

3. **Show Warnings:**
   - Display pro-rata warnings to HR
   - Explain mid-month joiner proration
   - Alert on negative net pay

4. **Year Filter:**
   - Default to current year
   - Allow dropdown selection for past years
   - Show latest payslips first

5. **Loading States:**
   - Payroll generation can take 10-30 seconds
   - Show progress indicator
   - Disable button during processing

6. **Currency Formatting:**
   ```javascript
   const formatCurrency = (amount) => {
     return new Intl.NumberFormat('en-IN', {
       style: 'currency',
       currency: 'INR',
       minimumFractionDigits: 0
     }).format(amount);
   };
   ```

7. **Error Display:**
   - Group errors by type (missing data, invalid data)
   - Show employee ID for each error
   - Provide actionable guidance

### For Testing

1. **Test Data Setup:**
   - Create employees with various scenarios
   - Mid-month joiners (different dates)
   - LOP cases (different days)
   - Full month workers

2. **Boundary Testing:**
   - First day of month joiners
   - Last day of month joiners
   - Zero LOP days
   - Maximum LOP days

3. **Edge Cases:**
   - Negative net pay
   - Zero salary
   - Missing data
   - Duplicate runs

---

## Appendix

### Calculation Examples

**Example 1: Simple Case**
```
Employee: EMP001
Month: Nov 2025
Joining Date: Jan 1, 2024 (full month employee)
Total Working Days: 22
Days Present: 22
LOP Days: 0

Salary Structure:
- Basic: ₹50,000
- HRA: ₹15,000
- PF: 12% of Basic

Calculation:
Basic: ₹50,000 (no proration)
HRA: ₹15,000 (no proration)
Gross: ₹65,000
PF: ₹50,000 × 12% = ₹6,000
Net: ₹65,000 - ₹6,000 = ₹59,000
```

**Example 2: With LOP**
```
Employee: EMP002
Total Working Days: 22
Days Present: 20
LOP Days: 2

Salary Structure:
- Basic: ₹50,000
- HRA: ₹15,000

Calculation:
Basic: (₹50,000 / 22) × 20 = ₹45,455
HRA: (₹15,000 / 22) × 20 = ₹13,636
Gross: ₹59,091
Net: ₹59,091
```

**Example 3: Mid-Month Joiner**
```
Employee: EMP003
Joining Date: Nov 15, 2025
Days in Month: 30
Days Employed: 16
Pro-rata Factor: 16/30 = 0.533
Total Working Days: 16
Days Present: 16

Salary Structure:
- Basic: ₹60,000

Calculation:
Basic: ₹60,000 × 0.533 = ₹32,000
Gross: ₹32,000
Net: ₹32,000
```

**Example 4: Mid-Month Joiner + LOP**
```
Employee: EMP004
Joining Date: Nov 15, 2025
Days Employed: 16
Pro-rata Factor: 0.533
Total Working Days: 16
Days Present: 14
LOP Days: 2

Salary Structure:
- Basic: ₹60,000

Calculation:
Step 1 (LOP): (₹60,000 / 16) × 14 = ₹52,500
Step 2 (Pro-rata): ₹52,500 × 0.533 = ₹27,983
Gross: ₹27,983
Net: ₹27,983
```

### Month-End Dates Reference

| Month | Days | Last Date |
|-------|------|-----------|
| January | 31 | Jan 31 |
| February | 28/29 | Feb 28/29 |
| March | 31 | Mar 31 |
| April | 30 | Apr 30 |
| May | 31 | May 31 |
| June | 30 | Jun 30 |
| July | 31 | Jul 31 |
| August | 31 | Aug 31 |
| September | 30 | Sep 30 |
| October | 31 | Oct 31 |
| November | 30 | Nov 30 |
| December | 31 | Dec 31 |

**Payroll can be run on:** First day of next month (e.g., Dec 1 for Nov payroll)

---

**End of Document**

**For Support:** Contact backend team  
**Last Updated:** November 17, 2025  
**Version:** 2.0
