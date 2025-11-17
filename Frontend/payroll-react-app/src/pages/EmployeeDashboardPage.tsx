import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './EmployeeDashboardPage.css';

const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearToken } = useAuth();

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="employee-dashboard-container">
      <div className="employee-dashboard-header">
        <h1>Employee Dashboard</h1>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="employee-dashboard-content">
        <div className="dashboard-cards">
          <div className="dashboard-card" onClick={() => navigate('/employee/profile')}>
            <div className="card-icon">👤</div>
            <h2>My Profile</h2>
            <p>View and edit your personal information, salary details, bank accounts, and tax information.</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/employee/attendance')}>
            <div className="card-icon">📅</div>
            <h2>My Attendance</h2>
            <p>Mark daily attendance, view attendance history, and download attendance reports as CSV.</p>
          </div>

          <div className="dashboard-card" onClick={() => navigate('/employee/payslips')}>
            <div className="card-icon">💰</div>
            <h2>My Payslips</h2>
            <p>View detailed salary breakdowns, download payslip PDFs, and track payment history.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
