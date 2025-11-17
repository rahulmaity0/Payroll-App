import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PayslipGenerationModal from '../components/Modals/PayslipGenerationModal';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearToken } = useAuth();
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  const handleOnboardClick = () => navigate('/onboard-employee');
  const handleViewEmployees = () => navigate('/employees-list');
  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>HR Dashboard</h1>
        <div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="cards-grid">
          <div className="card" onClick={handleOnboardClick}>
            <div className="card-icon">�</div>
            <h2>Onboard Employee</h2>
            <p>Create a new employee record and send onboarding details.</p>
            <div className="card-arrow">→</div>
          </div>

          <div className="card" onClick={handleViewEmployees}>
            <div className="card-icon">📋</div>
            <h2>View All Employees</h2>
            <p>Browse, view and edit employee details.</p>
            <div className="card-arrow">→</div>
          </div>

          <div className="card" onClick={() => navigate('/attendance')}>
            <div className="card-icon">📅</div>
            <h2>Show Attendance</h2>
            <p>View attendance summary, filter by department or search employee records.</p>
            <div className="card-arrow">→</div>
          </div>

          <div className="card" onClick={() => navigate('/attendance/upload')}>
            <div className="card-icon">⬆️</div>
            <h2>Upload Attendance</h2>
            <p>Upload CSV/XLSX attendance files, preview and commit to the system.</p>
            <div className="card-arrow">→</div>
          </div>

          <div className="card" onClick={() => setIsPayslipModalOpen(true)}>
            <div className="card-icon">💰</div>
            <h2>Generate Payslips</h2>
            <p>Generate monthly payslips for all employees with validations and reports.</p>
            <div className="card-arrow">→</div>
          </div>

          <div className="card" onClick={() => navigate('/hr/employee-payslips')}>
            <div className="card-icon">📊</div>
            <h2>View Employee Payslips</h2>
            <p>Search employees and view detailed payslip breakdowns with charts and analytics.</p>
            <div className="card-arrow">→</div>
          </div>
        </div>
      </div>

      <PayslipGenerationModal 
        isOpen={isPayslipModalOpen} 
        onClose={() => setIsPayslipModalOpen(false)} 
      />
    </div>
  );
};

export default DashboardPage;
