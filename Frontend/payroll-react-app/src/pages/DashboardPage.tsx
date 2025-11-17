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

  const cards = [
    {
      id: 1,
      icon: '👥',
      title: 'Onboard Employee',
      description: 'Create a new employee record and send onboarding details.',
      onClick: handleOnboardClick,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    {
      id: 2,
      icon: '📋',
      title: 'View All Employees',
      description: 'Browse, view and edit employee details.',
      onClick: handleViewEmployees,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    },
    {
      id: 3,
      icon: '📅',
      title: 'Show Attendance',
      description: 'View attendance summary, filter by department or search employee records.',
      onClick: () => navigate('/attendance'),
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    },
    {
      id: 4,
      icon: '📤',
      title: 'Upload Attendance',
      description: 'Bulk upload attendance records via Excel file.',
      onClick: () => navigate('/upload-attendance'),
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    },
    {
      id: 5,
      icon: '💰',
      title: 'Generate Payslips',
      description: 'Generate monthly payslips for all employees.',
      onClick: () => setIsPayslipModalOpen(true),
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    {
      id: 6,
      icon: '📊',
      title: 'View Payslips',
      description: 'View all generated payslips and download PDFs.',
      onClick: () => navigate('/hr/employee-payslips'),
      gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    },
  ];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="page-title">HR Dashboard 💼</h1>
          <p className="page-subtitle">Manage your workforce efficiently</p>
        </div>
        <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="dashboard-content">
        <div className="cards-grid">
          {cards.map((card) => (
            <div
              key={card.id}
              className="card card-interactive"
              onClick={card.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && card.onClick()}
            >
              <div className="card-icon-wrapper">
                <span className="card-icon">{card.icon}</span>
              </div>
              <h2 className="card-title">{card.title}</h2>
              <p className="card-description">{card.description}</p>
              <div className="card-footer">
                <span className="card-action">
                  View Details <span className="arrow">→</span>
                </span>
              </div>
              <div className="card-gradient" style={{ background: card.gradient }}></div>
            </div>
          ))}
        </div>
      </div>

      {isPayslipModalOpen && (
        <PayslipGenerationModal
          isOpen={isPayslipModalOpen}
          onClose={() => setIsPayslipModalOpen(false)}
          onSuccess={() => {
            setIsPayslipModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
