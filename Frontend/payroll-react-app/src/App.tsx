import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeeDashboardPage from './pages/EmployeeDashboardPage';
import OnboardEmployeePage from './pages/OnboardEmployeePage';
import EmployeesListPage from './pages/EmployeesListPage';
import AttendanceSummaryPage from './pages/AttendanceSummaryPage';
import EmployeeAttendancePage from './pages/EmployeeAttendancePage';
import AttendanceUploadPage from './pages/AttendanceUploadPage';
import EmployeePayslipPage from './pages/EmployeePayslipPage';
import PayslipDetailPage from './pages/PayslipDetailPage';
import EmployeeProfilePage from './pages/Employee/EmployeeProfilePage';
import EmployeePayslipsPage from './pages/Employee/EmployeePayslipsPage';
import EmployeePayslipDetailPage from './pages/Employee/EmployeePayslipDetailPage';
import EmployeeAttendancePageNew from './pages/Employee/EmployeeAttendancePage';
import { useAuth } from './context/AuthContext';

// ProtectedRoute component - redirects to login if not authenticated
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

function App() {
  const { isAuthenticated, role } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={<ProtectedRoute element={<DashboardPage />} />} />
        <Route path="/employee-dashboard" element={<ProtectedRoute element={<EmployeeDashboardPage />} />} />
        <Route path="/onboard-employee" element={<ProtectedRoute element={<OnboardEmployeePage />} />} />
        <Route path="/employees" element={<ProtectedRoute element={<EmployeesListPage />} />} />
        <Route path="/employees-list" element={<ProtectedRoute element={<EmployeesListPage />} />} />
        <Route path="/attendance/upload" element={<ProtectedRoute element={<AttendanceUploadPage />} />} />
        <Route path="/attendance/:id" element={<ProtectedRoute element={<EmployeeAttendancePage />} />} />
        <Route path="/attendance" element={<ProtectedRoute element={<AttendanceSummaryPage />} />} />
        <Route path="/hr/employee-payslips" element={<ProtectedRoute element={<EmployeePayslipPage />} />} />
        <Route path="/hr/payslips/:id" element={<ProtectedRoute element={<PayslipDetailPage />} />} />

        {/* Employee Protected Routes */}
        <Route path="/employee/dashboard" element={<ProtectedRoute element={<EmployeeDashboardPage />} />} />
        <Route path="/employee/profile" element={<ProtectedRoute element={<EmployeeProfilePage />} />} />
        <Route path="/employee/attendance" element={<ProtectedRoute element={<EmployeeAttendancePageNew />} />} />
        <Route path="/employee/payslips" element={<ProtectedRoute element={<EmployeePayslipsPage />} />} />
        <Route path="/employee/payslips/:id" element={<ProtectedRoute element={<EmployeePayslipDetailPage />} />} />

        {/* Root redirect - goes to appropriate dashboard based on role if authenticated, otherwise to login */}
        <Route
          path="/"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? role === 'employee'
                    ? '/employee/dashboard'
                    : '/dashboard'
                  : '/login'
              }
              replace
            />
          }
        />

        {/* Catch-all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
