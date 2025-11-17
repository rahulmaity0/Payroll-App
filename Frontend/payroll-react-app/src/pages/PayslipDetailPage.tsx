import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { downloadEmployeePayslip } from '../services/payslipApi';
import { Payslip } from '../types/payslip';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import './PayslipDetailPage.css';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PayslipDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: employeeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { token, clearToken } = useAuth();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const month = Number(searchParams.get('month')) || new Date().getMonth() + 1;
  const year = Number(searchParams.get('year')) || new Date().getFullYear();

  useEffect(() => {
    fetchPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  const fetchPayslip = async () => {
    if (!token || !employeeId) return;

    try {
      setLoading(true);
      setError(null);

      // First fetch employee details
      const empResponse = await fetch(`http://localhost:5000/api/hr/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!empResponse.ok) {
        throw new Error('Failed to fetch employee details');
      }

      const empData = await empResponse.json();
      setEmployee(empData);

      // Fetch payslips using HR endpoint
      const payslipsResponse = await fetch(
        `http://localhost:5000/api/hr/employees/${employeeId}/payslips?year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!payslipsResponse.ok) {
        throw new Error('Failed to fetch payslips');
      }

      const payslips: Payslip[] = await payslipsResponse.json();
      const matchingPayslip = payslips.find(
        (p) => p.month === month && p.year === year
      );

      if (!matchingPayslip) {
        throw new Error(`No payslip found for ${getMonthName(month)} ${year}`);
      }

      // Fetch full payslip details using HR download endpoint
      const detailsResponse = await fetch(
        `http://localhost:5000/api/hr/payslips/${matchingPayslip._id}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch payslip details');
      }

      const fullPayslip = await detailsResponse.json();
      setPayslip(fullPayslip);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payslip');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!payslip || !token) return;

    try {
      setDownloading(true);
      await downloadEmployeePayslip(payslip._id, token);
    } catch (err: any) {
      alert(err.message || 'Failed to download payslip');
    } finally {
      setDownloading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const getMonthName = (monthNum: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1] || '';
  };

  // Prepare chart data - moved before early returns to avoid conditional hook calls
  const earningsChartData = payslip ? {
    labels: payslip.earnings.map((e) => e.name),
    datasets: [
      {
        data: payslip.earnings.map((e) => e.amount),
        backgroundColor: [
          '#667eea', '#764ba2', '#f093fb', '#4facfe',
          '#43e97b', '#fa709a', '#fee140', '#30cfd0'
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  } : null;

  const deductionsChartData = payslip ? {
    labels: payslip.deductions.map((d) => d.name),
    datasets: [
      {
        data: payslip.deductions.map((d) => d.amount),
        backgroundColor: [
          '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6',
          '#6366f1', '#14b8a6', '#84cc16'
        ],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  } : null;

  const comparisonChartData = payslip ? {
    labels: ['Gross Earnings', 'Total Deductions', 'Net Pay'],
    datasets: [
      {
        label: 'Amount (₹)',
        data: [payslip.grossEarnings, payslip.totalDeductions, payslip.netPay],
        backgroundColor: ['#10b981', '#ef4444', '#3b82f6'],
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.label}: ₹${context.parsed.toLocaleString('en-IN')}`;
          },
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return '₹' + value.toLocaleString('en-IN');
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="payslip-detail-page">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading payslip details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payslip-detail-page">
        <div className="error-container">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchPayslip}>Retry</button>
            <button onClick={() => navigate('/hr/employee-payslips')}>Back to List</button>
          </div>
        </div>
      </div>
    );
  }

  if (!payslip || !employee) {
    return null;
  }

  return (
    <div className="payslip-detail-page">
      <div className="payslip-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/hr/employee-payslips')}>
            ← Back to List
          </button>
          <div className="header-info">
            <h1>Payslip Details</h1>
            <p className="subtitle">
              {employee.firstName} {employee.lastName} ({employee.employeeId}) - {getMonthName(month)} {year}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="download-btn" onClick={handleDownloadPDF} disabled={downloading}>
            {downloading ? '⏳ Downloading...' : '📥 Download PDF'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="payslip-content">
        {/* Employee Info Card */}
        <div className="info-card employee-info">
          <h2>Employee Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Employee ID:</label>
              <span>{employee.employeeId}</span>
            </div>
            <div className="info-item">
              <label>Name:</label>
              <span>{employee.firstName} {employee.lastName}</span>
            </div>
            <div className="info-item">
              <label>Designation:</label>
              <span>{employee.designation}</span>
            </div>
            <div className="info-item">
              <label>Department:</label>
              <span>{employee.department || '-'}</span>
            </div>
            <div className="info-item">
              <label>Payslip Period:</label>
              <span>{getMonthName(month)} {year}</span>
            </div>
            <div className="info-item">
              <label>Generated On:</label>
              <span>{new Date(payslip.generatedOn).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Attendance Summary Card */}
        <div className="info-card attendance-summary">
          <h2>Attendance Summary</h2>
          <div className="attendance-stats">
            <div className="stat-item">
              <div className="stat-value">{payslip.payrollInfo.totalWorkingDays}</div>
              <div className="stat-label">Total Working Days</div>
            </div>
            <div className="stat-item">
              <div className="stat-value success">{payslip.payrollInfo.daysPaid}</div>
              <div className="stat-label">Days Paid</div>
            </div>
            <div className="stat-item">
              <div className="stat-value warning">{payslip.payrollInfo.lopDays}</div>
              <div className="stat-label">LOP Days</div>
            </div>
            <div className="stat-item">
              <div className="stat-value info">
                {((payslip.payrollInfo.daysPaid / payslip.payrollInfo.totalWorkingDays) * 100).toFixed(1)}%
              </div>
              <div className="stat-label">Attendance %</div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card gross">
            <div className="card-icon">💰</div>
            <div className="card-content">
              <p className="card-label">Gross Earnings</p>
              <p className="card-value">₹{payslip.grossEarnings.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="summary-card deductions">
            <div className="card-icon">➖</div>
            <div className="card-content">
              <p className="card-label">Total Deductions</p>
              <p className="card-value">₹{payslip.totalDeductions.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="summary-card net">
            <div className="card-icon">✅</div>
            <div className="card-content">
              <p className="card-label">Net Pay</p>
              <p className="card-value">₹{payslip.netPay.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="chart-card">
            <h2>Earnings Breakdown</h2>
            <div className="chart-container">
              {earningsChartData && <Pie data={earningsChartData} options={chartOptions} />}
            </div>
            <div className="breakdown-list">
              {payslip.earnings.map((earning, idx) => (
                <div key={idx} className="breakdown-item">
                  <span className="item-name">
                    {earning.name}
                    <span className="item-type">{earning.type}</span>
                  </span>
                  <span className="item-amount">₹{earning.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <h2>Deductions Breakdown</h2>
            <div className="chart-container">
              {deductionsChartData && <Pie data={deductionsChartData} options={chartOptions} />}
            </div>
            <div className="breakdown-list">
              {payslip.deductions.map((deduction, idx) => (
                <div key={idx} className="breakdown-item">
                  <span className="item-name">
                    {deduction.name}
                    <span className="item-type">{deduction.type}</span>
                  </span>
                  <span className="item-amount">₹{deduction.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card full-width">
            <h2>Salary Comparison</h2>
            <div className="chart-container">
              {comparisonChartData && <Bar data={comparisonChartData} options={barChartOptions} />}
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="info-card payment-status">
          <h2>Payment Status</h2>
          <div className="status-content">
            <div className="status-badge-large">
              <span className={`badge ${payslip.status}`}>{payslip.status.toUpperCase()}</span>
            </div>
            {payslip.paymentDate && (
              <p className="payment-date">
                Payment Date: {new Date(payslip.paymentDate).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipDetailPage;
