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

  const cards = [
    {
      id: 1,
      icon: '👤',
      title: 'My Profile',
      description: 'View and edit your personal information, salary details, and tax information.',
      path: '/employee/profile',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      iconBg: 'rgba(102, 126, 234, 0.1)',
    },
    {
      id: 2,
      icon: '📅',
      title: 'My Attendance',
      description: 'Mark daily attendance, view history, and download attendance reports.',
      path: '/employee/attendance',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      iconBg: 'rgba(240, 147, 251, 0.1)',
    },
    {
      id: 3,
      icon: '💰',
      title: 'My Payslips',
      description: 'View detailed salary breakdowns, download PDFs, and track payment history.',
      path: '/employee/payslips',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      iconBg: 'rgba(79, 172, 254, 0.1)',
    },
  ];

  return (
    <div className="employee-dashboard-container">
      <div className="employee-dashboard-header">
        <div className="header-content">
          <h1 className="page-title">Welcome Back! 👋</h1>
          <p className="page-subtitle">What would you like to do today?</p>
        </div>
        <button className="btn btn-secondary logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="employee-dashboard-content">
        <div className="dashboard-cards">
          {cards.map((card) => (
            <div
              key={card.id}
              className="dashboard-card card-interactive"
              onClick={() => navigate(card.path)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && navigate(card.path)}
            >
              <div className="card-icon-wrapper" style={{ background: card.iconBg }}>
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
    </div>
  );
};

export default EmployeeDashboardPage;
