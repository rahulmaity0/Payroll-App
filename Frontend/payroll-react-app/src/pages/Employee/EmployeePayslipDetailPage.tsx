import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import employeeApi, { Payslip } from '../../services/employeeApi';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import '../PayslipDetailPage.css'; // Reuse HR payslip detail CSS

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const EmployeePayslipDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: payslipId } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!token || !payslipId) {
      navigate('/login');
      return;
    }
    fetchPayslip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payslipId]);

  const fetchPayslip = async () => {
    if (!token || !payslipId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await employeeApi.getPayslipDetails(payslipId, token);
      setPayslip(data);
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
      await employeeApi.downloadPayslipPDF(payslip._id, token);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return monthNames[month - 1] || '';
  };

  // Chart data preparation
  const earningsChartData = payslip ? {
    labels: payslip.earnings.map((e) => e.name),
    datasets: [{
      data: payslip.earnings.map((e) => e.amount),
      backgroundColor: [
        '#667eea', '#764ba2', '#f093fb', '#4facfe',
        '#43e97b', '#fa709a', '#fee140', '#30cfd0'
      ],
    }],
  } : null;

  const deductionsChartData = payslip && payslip.deductions.length > 0 ? {
    labels: payslip.deductions.map((d) => d.name),
    datasets: [{
      data: payslip.deductions.map((d) => d.amount),
      backgroundColor: [
        '#f093fb', '#667eea', '#fa709a', '#fee140',
        '#30cfd0', '#764ba2', '#4facfe', '#43e97b'
      ],
    }],
  } : null;

  const comparisonChartData = payslip ? {
    labels: ['Gross Earnings', 'Total Deductions', 'Net Pay'],
    datasets: [{
      label: 'Amount (₹)',
      data: [payslip.grossEarnings, payslip.totalDeductions, payslip.netPay],
      backgroundColor: ['#667eea', '#f093fb', '#43e97b'],
    }],
  } : null;

  if (loading) {
    return (
      <div className="payslip-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading payslip details...</p>
        </div>
      </div>
    );
  }

  if (error || !payslip) {
    return (
      <div className="payslip-detail-page">
        <div className="error-container">
          <h2>❌ Error</h2>
          <p>{error || 'Payslip not found'}</p>
          <div className="error-actions">
            <button onClick={fetchPayslip}>Retry</button>
            <button onClick={() => navigate('/employee/payslips')}>Back to Payslips</button>
          </div>
        </div>
      </div>
    );
  }

  const attendancePercent = ((payslip.payrollInfo.daysPaid / payslip.payrollInfo.totalWorkingDays) * 100).toFixed(1);

  return (
    <div className="payslip-detail-page">
      <div className="payslip-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/employee/payslips')}>
            ← Back to Payslips
          </button>
          <div className="header-info">
            <h1>Payslip Details</h1>
            <p>{getMonthName(payslip.month)} {payslip.year}</p>
          </div>
        </div>
        <button className="download-pdf-btn" onClick={handleDownloadPDF} disabled={downloading}>
          {downloading ? 'Downloading...' : '📥 Download PDF'}
        </button>
      </div>

      <div className="payslip-content">
        {/* Attendance Summary */}
        <div className="info-card">
          <h2>Attendance Summary</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Working Days</label>
              <span className="value">{payslip.payrollInfo.totalWorkingDays}</span>
            </div>
            <div className="info-item">
              <label>Days Paid</label>
              <span className="value">{payslip.payrollInfo.daysPaid}</span>
            </div>
            <div className="info-item">
              <label>LOP Days</label>
              <span className="value" style={{ color: payslip.payrollInfo.lopDays > 0 ? '#ef4444' : 'inherit' }}>
                {payslip.payrollInfo.lopDays}
              </span>
            </div>
            <div className="info-item">
              <label>Attendance %</label>
              <span className="value" style={{ color: '#10b981' }}>{attendancePercent}%</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card earnings-card">
            <div className="card-label">Gross Earnings</div>
            <div className="card-value">{formatCurrency(payslip.grossEarnings)}</div>
          </div>
          <div className="summary-card deductions-card">
            <div className="card-label">Total Deductions</div>
            <div className="card-value">{formatCurrency(payslip.totalDeductions)}</div>
          </div>
          <div className="summary-card netpay-card">
            <div className="card-label">Net Pay</div>
            <div className="card-value">{formatCurrency(payslip.netPay)}</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Earnings Breakdown</h3>
            {earningsChartData && (
              <div className="chart-wrapper">
                <Pie data={earningsChartData} options={{ maintainAspectRatio: true, responsive: true }} />
              </div>
            )}
          </div>

          {deductionsChartData && (
            <div className="chart-card">
              <h3>Deductions Breakdown</h3>
              <div className="chart-wrapper">
                <Pie data={deductionsChartData} options={{ maintainAspectRatio: true, responsive: true }} />
              </div>
            </div>
          )}

          <div className="chart-card full-width">
            <h3>Salary Comparison</h3>
            {comparisonChartData && (
              <div className="chart-wrapper">
                <Bar data={comparisonChartData} options={{ maintainAspectRatio: true, responsive: true }} />
              </div>
            )}
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="breakdown-grid">
          <div className="info-card">
            <h2>Earnings Details</h2>
            <table className="details-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Type</th>
                  <th className="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payslip.earnings.map((earning, index) => (
                  <tr key={index}>
                    <td>{earning.name}</td>
                    <td><span className="type-badge earning-type">{earning.type}</span></td>
                    <td className="amount-col">{formatCurrency(earning.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td colSpan={2}><strong>Total Earnings</strong></td>
                  <td className="amount-col"><strong>{formatCurrency(payslip.grossEarnings)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="info-card">
            <h2>Deductions Details</h2>
            <table className="details-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Type</th>
                  <th className="amount-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payslip.deductions.length > 0 ? (
                  <>
                    {payslip.deductions.map((deduction, index) => (
                      <tr key={index}>
                        <td>{deduction.name}</td>
                        <td><span className="type-badge deduction-type">{deduction.type}</span></td>
                        <td className="amount-col" style={{ color: '#ef4444' }}>{formatCurrency(deduction.amount)}</td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td colSpan={2}><strong>Total Deductions</strong></td>
                      <td className="amount-col" style={{ color: '#ef4444' }}><strong>{formatCurrency(payslip.totalDeductions)}</strong></td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>No deductions</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayslipDetailPage;
