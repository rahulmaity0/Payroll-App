## Payroll System Schemas

### 1\. `users` Collection

**Purpose:** Stores login credentials and roles. Links a "login" to an "employee."

```javascript
{
  _id: ObjectId,
  email: String, (Required, Unique)
  password: String, (Required, Hashed)
  role: String, (Enum: ['employee', 'hr'])
  employee: ObjectId (Ref: 'Employee', Required, Unique)
  timestamps: true
}
```

### 2\. `employee_details` Collection

**Purpose:** Stores the master record for an employee's personal and professional information.

```javascript
{
  _id: ObjectId,
  employeeId: String, (Required, Unique)
  firstName: String, (Required)
  lastName: String, (Required)
  personalEmail: String, (Required)
  designation: String, (Required)
  department: String,
  joiningDate: Date, (Required)
  dob: Date,
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String
  },
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String
  },
  taxInfo: {
    pan: String,
    uan: String
  },
  isActive: Boolean, (Default: true)
  timestamps: true
}
```

### 3\. `salary_details` Collection

**Purpose:** Stores the fixed salary structure (CTC breakup) for an employee. This is the "template" for their pay.

```javascript
{
  _id: ObjectId,
  employee: ObjectId, (Ref: 'Employee', Required, Unique)
  annualCTC: Number, (Required)
  effectiveDate: Date,
  earnings: [
    { name: String, amount: Number } // e.g., Basic, HRA
  ],
  deductions: [
    { 
      name: String, // e.g., Provident Fund
      amount: Number,
      isPercent: Boolean,
      percentOf: String // e.g., 'Basic'
    }
  ],
  employerContributions: [ // Part of CTC, not deducted from pay
    { 
      name: String, // e.g., Employer PF
      amount: Number,
      isPercent: Boolean,
      percentOf: String
    }
  ],
  timestamps: true
}
```

### 4\.  `daily_attendance` Collection

**Purpose:** Stores individual daily attendance records. This is the **primary source** for payroll calculations. CSV uploads populate this collection.

```javascript
{
  _id: ObjectId,
  employee: ObjectId, (Ref: 'Employee', Required)
  date: String, (Required, Format: YYYY-MM-DD)
  status: String, (Required, Enum: ['P', 'A', 'LOP', 'PL', 'H', 'WO'])
  checkIn: String, (Optional, Format: HH:mm)
  checkOut: String, (Optional, Format: HH:mm)
  hoursWorked: Number, (Optional, 0-24)
  overtimeHours: Number, (Optional, >= 0)
  notes: String, (Optional, Max: 500 chars)
  timestamps: true
  // Unique Index: (employee, date)
}
```

**Status Codes:**
- `P` = Present (counts as paid day)
- `A` = Absent (no pay)
- `LOP` = Leave Without Pay (deduction)
- `PL` = Paid Leave (counts as paid day)
- `H` = Holiday (counts as paid day)
- `WO` = Week Off (counts as paid day)

**Payroll Usage:**
- Payslip generation **aggregates** daily records to calculate monthly totals
- totalWorkingDays = count of all records
- daysPresent = count of P + PL + H + WO
- lopDays = count of LOP

### 5\. `attendance_details` Collection

**Purpose:** Stores **optional** monthly variable inputs for payroll (bonuses, advances, etc.). This is a supplementary collection - **not required** for payroll if only using daily attendance.

```javascript
{
  _id: ObjectId,
  employee: ObjectId, (Ref: 'Employee', Required)
  month: Number, (Required, 1-12)
  year: Number, (Required)
  
  // Core Attendance
  totalWorkingDays: Number, (Required)
  daysPresent: Number, (Required)
  leaveWithoutPay: Number, (Default: 0)
  overtimeHours: Number, (Default: 0)
  
  // Variable Inputs
  variableEarnings: [
    { name: String, amount: Number } // e.g., Bonus, Commission
  ],
  variableDeductions: [
    { name: String, amount: Number } // e.g., Salary Advance
  ],
  timestamps: true
  // Unique Index: (employee, month, year)
}
```

### 6\. `payslips` Collection

**Purpose:** Stores the final, calculated *result* of a payroll run. This is a permanent historical record (a snapshot).

**Data Sources:**
- Salary structure from `salary_details`
- Attendance aggregated from `daily_attendance` (primary)
- Optional variable earnings/deductions from `attendance_details` (supplementary)

```javascript
{
  _id: ObjectId,
  employee: ObjectId, (Ref: 'Employee', Required)
  month: Number, (Required)
  year: Number, (Required)
  generatedOn: Date,
  
  // Summary of inputs used for this calculation
  payrollInfo: {
    totalWorkingDays: Number, (Required)
    daysPaid: Number, (Required)
    lopDays: Number, (Default: 0)
  },
  
  // Final calculated values
  earnings: [
    { 
      name: String, 
      amount: Number,
      type: String (Enum: ['fixed', 'variable', 'reimbursement'])
    }
  ],
  deductions: [
    {
      name: String,
      amount: Number,
      type: String (Enum: ['statutory', 'tax', 'lop', 'other'])
    }
  ],
  
  // Final Totals
  grossEarnings: Number, (Required)
  totalDeductions: Number, (Required)
  netPay: Number, (Required),
  
  status: String, (Enum: ['pending', 'paid', 'generated'])
  paymentDate: Date,
  timestamps: true
  // Unique Index: (employee, month, year)
}
```