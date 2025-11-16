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

### 4\. `attendance_details` Collection

**Purpose:** Stores all the *variable monthly inputs* for payroll. This is populated by the CSV upload.

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

### 5\. `payslips` Collection

**Purpose:** Stores the final, calculated *result* of a payroll run. This is a permanent historical record (a snapshot).

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