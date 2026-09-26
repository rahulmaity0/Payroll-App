# Payroll App

A full-stack payroll and attendance system with two roles. **HR** onboards employees, uploads attendance and generates payslips. **Employees** see their own profile, attendance and payslips.

## Features

- JWT login with bcrypt-hashed passwords and role-based routes (`hr`, `employee`)
- Employee onboarding and management
- Bulk attendance upload from CSV, with monthly attendance summaries and a calendar view
- Salary structures and payslip generation, downloadable as PDF
- HR dashboard with charts; employee self-service pages

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, Multer, csv-parser, PDFKit, Winston |
| Frontend | React, TypeScript, React Router, Chart.js, FullCalendar, jsPDF |

## Project structure

```
Backend/payroll-app-ts     Express API (routes under /api/auth, /api/users, /api/employee, /api/hr)
Frontend/payroll-react-app React client
```

API and data-model references are in `Backend/payroll-app-ts/docs`.

## Running locally

**Backend** needs Node.js and a MongoDB instance. Create `Backend/payroll-app-ts/.env` with:

```
MONGO_URI=mongodb://localhost:27017/payroll
JWT_SECRET=<a long random string>
PORT=5000
HR_ADMIN_EMAIL=hr@example.com
HR_ADMIN_PASSWORD=<password for the first HR account>
```

```bash
cd Backend/payroll-app-ts
npm install
npx ts-node createHR.ts   # creates the first HR user
npm run dev               # API on http://localhost:5000
```

**Frontend**

```bash
cd Frontend/payroll-react-app
npm install
REACT_APP_API_BASE_URL=http://localhost:5000 npm start
```

A sample attendance file for the upload page is at `Backend/payroll-app-ts/sample_attendance_upload.csv`.
