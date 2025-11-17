# Payroll Management System API - Complete Documentation

**Version:** 2.1  
**Last Updated:** November 17, 2025

A comprehensive Node.js + TypeScript + MongoDB backend for managing employee payroll, attendance, and salary information.

---

## 📚 Documentation Index

| Document | Description | Audience |
|----------|-------------|----------|
| **[API_DOCUMENTATION_V2.md](./docs/API_DOCUMENTATION_V2.md)** | Complete API endpoint reference with examples | Frontend Developers |
| **[ATTENDANCE_API_COMPLETE_REFERENCE.md](./docs/ATTENDANCE_API_COMPLETE_REFERENCE.md)** | Comprehensive attendance module documentation (CRUD + CSV upload) | Frontend Developers |
| **[PAYSLIP_GENERATION_API_REFERENCE.md](./docs/PAYSLIP_GENERATION_API_REFERENCE.md)** | Complete payslip generation API and business logic | Frontend Developers |
| **[MODELS_DOCUMENTATION.md](./docs/MODELS_DOCUMENTATION.md)** | Database schema and model definitions | All Developers |
| **[_schema-reference.md](./docs/_schema-reference.md)** | Quick schema reference (collections overview) | All Developers |
| **[ATTENDANCE_UPLOAD_SPEC.md](./ATTENDANCE_UPLOAD_SPEC.md)** | CSV upload format and specifications | Frontend/HR Users |
| **[PAYSLIP_REFACTOR_NOTES.md](./docs/PAYSLIP_REFACTOR_NOTES.md)** | Technical notes on payslip-attendance integration refactor | Backend Developers |
| **README_DOCS.md** | This file - overview and quick start | All Developers |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (v5+)
- TypeScript
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd payroll-app-ts

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Add MongoDB connection string and JWT_SECRET
```

### Environment Variables

Create `.env` file:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/payroll_db
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

### Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Create initial HR user
npx ts-node createHR.ts
```

### Default HR Credentials (from createHR.ts)

```
Email: tejas@gmail.com
Password: 123456
Employee ID: HR002
```

---

## 🏗️ Architecture Overview

### Tech Stack
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt
- **File Upload:** Multer
- **CSV Parsing:** csv-parser
- **PDF Generation:** pdfkit
- **Logging:** Winston + Morgan
- **Validation:** express-validator

### Project Structure

```
payroll-app-ts/
├── config/
│   ├── db.ts                    # MongoDB connection
│   └── logger.ts                # Winston logger configuration
├── controllers/
│   ├── auth.controller.ts       # Authentication logic
│   ├── user.controller.ts       # User profile management
│   ├── employee.controller.ts   # Employee-specific actions
│   └── hr.controller.ts         # HR management functions
├── middleware/
│   ├── auth.middleware.ts       # JWT authentication & authorization
│   ├── error.middleware.ts      # Global error handler
│   ├── request-response.middleware.ts  # Request/response logging
│   └── validator.middleware.ts  # Input validation
├── models/
│   ├── user.model.ts            # User authentication model
│   ├── employee.model.ts        # Employee information model
│   ├── salary.model.ts          # Salary structure model
│   ├── attendance.model.ts      # Attendance records model
│   └── payslip.model.ts         # Payslip generation model
├── routes/
│   ├── auth.routes.ts           # /api/auth/* endpoints
│   ├── user.routes.ts           # /api/users/* endpoints
│   ├── employee.routes.ts       # /api/employee/* endpoints
│   └── hr.routes.ts             # /api/hr/* endpoints
├── services/
│   ├── user.service.ts          # User business logic
│   ├── employee.service.ts      # Employee business logic
│   └── hr.service.ts            # HR business logic
├── uploads/                     # Uploaded files (CSV)
├── logs/                        # Application logs
├── index.ts                     # Application entry point
├── createHR.ts                  # Script to create HR admin
└── package.json
```

---

## 🔐 Authentication & Authorization

### Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|--------------|
| **`employee`** | View own payslips, View own attendance, Update own profile, Change own password |
| **`hr`** | All employee actions + Onboard employees, Manage salaries, Upload attendance, Generate payslips, Reset passwords |

### Authentication Flow

1. **Register/Login** → Receive JWT token
2. **Store Token** → localStorage/sessionStorage
3. **Include Token** → `Authorization: Bearer <token>` header
4. **Server Validates** → Checks token & role
5. **Access Granted/Denied** → Based on role

### Token Expiration
- Tokens expire after **24 hours**
- Frontend should handle 401 responses and redirect to login

---

## 📡 API Endpoints Summary

### Authentication (Public)
- `POST /api/auth/register-hr` - Register HR user
- `POST /api/auth/login` - Login (employee or HR)

### User Profile (Authenticated)
- `GET /api/users/profile` - Get my profile
- `PUT /api/users/profile` - Update my profile
- `PUT /api/users/password` - Change password

### Employee Routes (Employee Role)
- `GET /api/employee/payslips` - View my payslips
- `GET /api/employee/payslips/:id/download` - Get my payslip details (JSON for frontend PDF)
- `GET /api/employee/attendance` - View my attendance
- `GET /api/employee/attendance/download` - Download attendance CSV

### HR Routes (HR Role)
- `POST /api/hr/onboard` - Onboard new employee
- `GET /api/hr/employees` - Get all employees
- `GET /api/hr/employees/:id` - Get employee by ID
- `PUT /api/hr/employees/:id` - Update employee
- `GET /api/hr/employees/:id/salary` - Get salary details
- `PUT /api/hr/employees/:id/salary` - Update salary
- `GET /api/hr/employees/:employeeId/attendance/daily` - Get daily attendance records
- `POST /api/hr/attendance/daily` - Create/update daily attendance (UPSERT)
- `PUT /api/hr/attendance/daily/:recordId` - Update daily attendance record
- `DELETE /api/hr/attendance/daily/:recordId` - Delete daily attendance record
- `GET /api/hr/attendance/summary` - Get attendance summary (all employees, specific month)
- `GET /api/hr/employees/:id/attendance` - Get monthly attendance (legacy)
- `POST /api/hr/attendance` - Create monthly attendance record (legacy)
- `PUT /api/hr/attendance/:attId` - Update monthly attendance record (legacy)
- `POST /api/hr/attendance/upload` - Upload attendance CSV (daily or monthly)
- `POST /api/hr/payroll/generate` - Generate payslips (auto-aggregates daily attendance)
- `GET /api/hr/payslips` - View all payslips (with filters: year, month, employeeId)
- `GET /api/hr/employees/:employeeId/payslips` - View payslips for specific employee
- `GET /api/hr/payslips/:id/download` - Get payslip details (JSON for frontend PDF)
- `PUT /api/hr/users/:id/reset-password` - Reset user password

**For detailed request/response examples, see [API_DOCUMENTATION_V2.md](./docs/API_DOCUMENTATION_V2.md)**

---

## 📊 Database Models

### Core Models

1. **User** - Authentication credentials (email, password, role)
2. **Employee** - Personal & professional information
3. **Salary** - Salary structure (earnings, deductions)
4. **DailyAttendance** - Individual daily attendance records (primary for payroll)
5. **Attendance** - Monthly attendance records (optional, for variable earnings/deductions)
6. **Payslip** - Generated payslips with calculations

### Model Relationships

```
User ──┬──> Employee
       │
Employee ──┬──> Salary
           ├──> DailyAttendance (primary)
           ├──> Attendance (optional)
           └──> Payslip
```

### Collections

- `users` - Login credentials
- `employee_details` - Employee master data
- `salary_details` - Salary structure
- `daily_attendance` - **Primary source** for payroll (individual daily records)
- `attendance_details` - **Optional** monthly variable earnings/deductions
- `payslips` - Generated payroll results

### Auto-Generated Fields

- **Employee ID**: `EMP001`, `EMP002`, ... (sequential, auto-generated)
- **HR Employee ID**: `HR001`, `HR002`, ... (sequential, auto-generated)
- **Default Password**: `"password"` (for onboarded employees)

**For complete schema details, see [MODELS_DOCUMENTATION.md](./MODELS_DOCUMENTATION.md)**

---

## 🎯 Key Features

### 1. Employee Onboarding
- Auto-generates unique Employee ID (EMP###)
- Creates Employee record + User account
- Sets default password ("password")
- Creates salary structure based on annual CTC

### 2. Attendance Management
- **Daily attendance records** (individual day-by-day tracking)
- Manual entry (create/update single daily record)
- CSV bulk upload (daily or monthly format)
- Preview mode (validate without saving)
- Duplicate handling strategies (skip/update/error)
- Auto-detection of CSV format
- Status codes: P (Present), A (Absent), LOP, PL, H (Holiday), WO (Week Off)
- Monthly summary aggregation from daily records

### 3. Payroll Processing
- Generate payslips for entire organization
- **Automatically aggregates daily attendance** to monthly summary
- Calculates:
  - Gross earnings (fixed + variable)
  - LOP deductions based on attendance
  - Statutory deductions (PF, tax, etc.)
  - Net pay
- Exports to PDF

### 4. Security Features
- JWT-based authentication
- Role-based access control
- Password hashing (bcrypt)
- Token expiration (24 hours)
- Input validation (express-validator)

### 5. Logging & Monitoring
- Winston logger for application logs
- Morgan for HTTP request logging
- Async request/response payload logging
- Error tracking and debugging

---

## 🔧 Configuration

### MongoDB Connection

In `config/db.ts`:
```typescript
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/payroll_db';
```

### JWT Secret

In `.env`:
```env
JWT_SECRET=your_super_secret_key_minimum_32_characters_recommended
```

### File Upload Limits

In `routes/hr.routes.ts`:
```typescript
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
```

---

## 🧪 Testing

### Test HR Registration

```bash
curl -X POST http://localhost:5000/api/auth/register-hr \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "securePass123",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "securePass123"
  }'
```

### Test Protected Route

```bash
curl -X GET http://localhost:5000/api/users/profile \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📝 CSV Upload Format

### Monthly Attendance Format

```csv
employeeId,month,year,totalWorkingDays,daysPresent,leaveWithoutPay,overtimeHours
EMP001,1,2024,22,20,2,8
EMP002,1,2024,22,21,1,0
```

### Daily Attendance Format

```csv
employeeId,date,status,checkIn,checkOut
EMP001,2024-01-01,P,09:00,18:00
EMP001,2024-01-02,P,09:15,18:10
EMP002,2024-01-01,LOP,,
```

**For complete CSV specifications, see [ATTENDANCE_UPLOAD_SPEC.md](./ATTENDANCE_UPLOAD_SPEC.md)**

---

## 🚨 Error Handling

### Standard Error Response

```json
{
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |

---

## 🔄 Frontend Integration

### Quick Setup (React + Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Example: Login

```javascript
const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userRole', data.role);
  return data;
};
```

**For complete frontend examples, see [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)**

---

## 📋 Common Use Cases

### 1. Onboard New Employee (HR)

```javascript
const onboardEmployee = async () => {
  const response = await api.post('/hr/onboard', {
    email: 'john.doe@company.com',
    firstName: 'John',
    lastName: 'Doe',
    designation: 'Software Engineer',
    joiningDate: '2024-01-15',
    annualCTC: 1200000,
    department: 'Engineering'
  });
  
  console.log('Employee ID:', response.data.employee.employeeId);
  // Output: Employee ID: EMP003
  // Default password: "password"
};
```

### 2. Upload Attendance CSV (HR)

```javascript
const uploadAttendance = async (file) => {
  const formData = new FormData();
  formData.append('payrollFile', file);
  
  const response = await api.post(
    '/hr/attendance/upload?mode=monthly&action=append&dedupeStrategy=skip',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' }
    }
  );
  
  console.log('Records processed:', response.data.successCount);
};
```

### 3. Generate Payslips (HR)

```javascript
const generatePayslips = async (month, year) => {
  const response = await api.post('/hr/payroll/generate', {
    month,
    year
  });
  
  console.log('Payslips generated:', response.data.payslipsGenerated);
  console.log('Total net pay:', response.data.totalNetPay);
};
```

### 4. View My Payslips (Employee)

```javascript
const getMyPayslips = async (year) => {
  const response = await api.get(`/employee/payslips?year=${year}`);
  return response.data; // Array of payslips
};
```

---

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Production Build

```bash
npm start
```

### Create HR Admin

```bash
npx ts-node createHR.ts
```

---

## 📦 Dependencies

### Core Dependencies
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT generation/verification
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing

### File Processing
- `multer` - File upload handling
- `csv-parser` - CSV parsing
- `pdfkit` - PDF generation

### Validation & Logging
- `express-validator` - Input validation
- `winston` - Logging framework
- `morgan` - HTTP request logger

### TypeScript
- `typescript` - TypeScript compiler
- `@types/*` - Type definitions
- `ts-node-dev` - Development server

---

## 🐛 Troubleshooting

### Issue: MongoDB Connection Failed

**Solution:**
```bash
# Ensure MongoDB is running
mongod

# Check connection string in .env
MONGO_URI=mongodb://localhost:27017/payroll_db
```

### Issue: JWT Token Expired

**Solution:**
- Tokens expire after 24 hours
- Frontend should catch 401 errors and redirect to login
- User must login again to get a new token

### Issue: CSV Upload Fails

**Solution:**
- Check file size (max 5MB)
- Verify CSV headers match expected format
- Use `action=preview` to validate before writing
- Check employee IDs exist in database

### Issue: CORS Errors

**Solution:**
```typescript
// In index.ts, ensure CORS is enabled
import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
```

---

## 📞 Support & Contact

For issues or questions:
1. Check documentation files in this folder
2. Review error logs in `logs/` directory
3. Verify environment variables in `.env`
4. Test endpoints with provided examples

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🎉 Getting Started Checklist

- [ ] Install Node.js and MongoDB
- [ ] Clone repository and install dependencies
- [ ] Create `.env` file with MongoDB URI and JWT secret
- [ ] Run `npm run dev` to start development server
- [ ] Run `npx ts-node createHR.ts` to create HR admin
- [ ] Test login with HR credentials
- [ ] Review API documentation in [API_DOCUMENTATION_V2.md](./API_DOCUMENTATION_V2.md)
- [ ] Review frontend integration in [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
- [ ] Start building your frontend application!

---

**Happy Coding! 🚀**
