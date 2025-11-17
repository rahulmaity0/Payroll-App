import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import employeeApi, { Payslip } from '../../services/employeeApi';
import './EmployeePayslipsPage.css';

const EmployeePayslipsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadPayslips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const loadPayslips = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await employeeApi.getMyPayslips(token, selectedYear);
      setPayslips(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load payslips');
      console.error('Error loading payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (payslipId: string) => {
    if (!token) return;
    setDownloadingId(payslipId);
    setError('');
    try {
      await employeeApi.downloadPayslipPDF(payslipId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to download payslip');
      console.error('Error downloading payslip:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewDetails = (payslipId: string) => {
    navigate(`/employee/payslips/${payslipId}`);
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="employee-payslips-container">
        <div className="loading-spinner">Loading payslips...</div>
      </div>
    );
  }

  return (
    <div className="employee-payslips-container">
      <div className="payslips-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/employee/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>My Payslips</h1>
        </div>
        <div className="year-filter">
          <label>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="payslips-content">
        {payslips.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h2>No Payslips Found</h2>
            <p>No payslips available for the year {selectedYear}</p>
          </div>
        ) : (
          <div className="payslips-grid">
            {payslips.map((payslip) => (
              <div key={payslip._id} className="payslip-card">
                <div className="payslip-card-header">
                  <h3>{getMonthName(payslip.month)} {payslip.year}</h3>
                  <span className={`status-badge ${payslip.status}`}>
                    {payslip.status}
                  </span>
                </div>

                <div className="payslip-summary">
                  <div className="summary-row">
                    <span>Working Days:</span>
                    <span>{payslip.payrollInfo.totalWorkingDays}</span>
                  </div>
                  <div className="summary-row">
                    <span>Days Paid:</span>
                    <span>{payslip.payrollInfo.daysPaid}</span>
                  </div>
                  {payslip.payrollInfo.lopDays > 0 && (
                    <div className="summary-row lop">
                      <span>LOP Days:</span>
                      <span>{payslip.payrollInfo.lopDays}</span>
                    </div>
                  )}
                </div>

                <div className="payslip-amounts">
                  <div className="amount-row">
                    <span>Gross Earnings:</span>
                    <span>{formatCurrency(payslip.grossEarnings)}</span>
                  </div>
                  <div className="amount-row">
                    <span>Deductions:</span>
                    <span className="deduction">-{formatCurrency(payslip.totalDeductions)}</span>
                  </div>
                  <div className="amount-row net-pay">
                    <span>Net Pay:</span>
                    <span>{formatCurrency(payslip.netPay)}</span>
                  </div>
                </div>

                <div className="payslip-actions">
                  <button
                    className="view-btn"
                    onClick={() => handleViewDetails(payslip._id)}
                  >
                    View Details
                  </button>
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(payslip._id)}
                    disabled={downloadingId === payslip._id}
                  >
                    {downloadingId === payslip._id ? 'Downloading...' : 'Download PDF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePayslipsPage;
