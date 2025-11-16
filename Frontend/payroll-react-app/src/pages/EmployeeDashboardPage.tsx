import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import employeeApi, { Payslip, AttendanceRecord, EmployeeProfile } from '../services/employeeApi';
import './EmployeeDashboardPage.css';

const EmployeeDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { clearToken, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'salary' | 'attendance' | 'profile'>('salary');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(undefined);
  const [downloadingPayslipId, setDownloadingPayslipId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    if (activeTab === 'salary') {
      loadPayslips();
    } else if (activeTab === 'attendance') {
      loadAttendance();
    } else if (activeTab === 'profile') {
      loadProfile();
    }
  }, [activeTab, selectedYear, selectedMonth, token]);

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

  const loadAttendance = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await employeeApi.getMyAttendance(token, selectedYear, selectedMonth);
      setAttendance(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance');
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await employeeApi.getMyProfile(token);
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslip = async (payslipId: string) => {
    if (!token) return;
    setDownloadingPayslipId(payslipId);
    setError('');
    try {
      await employeeApi.downloadPayslipPDF(payslipId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to download payslip');
      console.error('Error downloading payslip:', err);
    } finally {
      setDownloadingPayslipId(null);
    }
  };

  const handleLogout = () => {
    clearToken();
    navigate('/login');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long' });
  };

  return (
    <div className="employee-dashboard-container">
      <div className="employee-dashboard-header">
        <h1>Employee Dashboard</h1>
        <div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="employee-dashboard-content">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'salary' ? 'active' : ''}`}
            onClick={() => setActiveTab('salary')}
          >
            💰 Salary & Payslips
          </button>
          <button
            className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            📅 Attendance
          </button>
          <button
            className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 Profile
          </button>
        </div>

        {(activeTab === 'salary' || activeTab === 'attendance') && (
          <div className="filters">
            <div className="filter-group">
              <label>Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {activeTab === 'attendance' && (
              <div className="filter-group">
                <label>Month:</label>
                <select
                  value={selectedMonth || ''}
                  onChange={(e) =>
                    setSelectedMonth(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-message">Loading...</div>
        ) : (
          <>
            {activeTab === 'salary' && (
              <div className="salary-section">
                {payslips.length === 0 ? (
                  <div className="empty-state">
                    <p>No payslips found for {selectedYear}</p>
                  </div>
                ) : (
                  <div className="payslips-grid">
                    {payslips.map((payslip) => (
                      <div key={payslip._id} className="payslip-card">
                        <div className="payslip-header">
                          <h3>
                            {getMonthName(payslip.month)} {payslip.year}
                          </h3>
                          <span className={`status-badge ${payslip.status}`}>
                            {payslip.status}
                          </span>
                        </div>

                        <div className="payslip-summary">
                          <div className="summary-row">
                            <span>Gross Earnings:</span>
                            <strong>{formatCurrency(payslip.grossEarnings)}</strong>
                          </div>
                          <div className="summary-row">
                            <span>Total Deductions:</span>
                            <strong>{formatCurrency(payslip.totalDeductions)}</strong>
                          </div>
                          <div className="summary-row net-pay">
                            <span>Net Pay:</span>
                            <strong>{formatCurrency(payslip.netPay)}</strong>
                          </div>
                        </div>

                        <div className="payslip-details">
                          <div className="details-section">
                            <h4>Earnings</h4>
                            <ul>
                              {payslip.earnings.map((earning, idx) => (
                                <li key={idx}>
                                  <span>{earning.name}</span>
                                  <span>{formatCurrency(earning.amount)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="details-section">
                            <h4>Deductions</h4>
                            <ul>
                              {payslip.deductions.length > 0 ? (
                                payslip.deductions.map((deduction, idx) => (
                                  <li key={idx}>
                                    <span>{deduction.name}</span>
                                    <span>{formatCurrency(deduction.amount)}</span>
                                  </li>
                                ))
                              ) : (
                                <li className="no-data">No deductions</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="payslip-footer">
                          <div className="footer-info">
                            <p>
                              <strong>Payment Date:</strong> {formatDate(payslip.paymentDate)}
                            </p>
                            <p>
                              <strong>Working Days:</strong> {payslip.payrollInfo.daysPaid} /{' '}
                              {payslip.payrollInfo.totalWorkingDays}
                            </p>
                          </div>
                          <button
                            className="download-btn"
                            onClick={() => handleDownloadPayslip(payslip._id)}
                            disabled={downloadingPayslipId === payslip._id}
                          >
                            {downloadingPayslipId === payslip._id ? 'Downloading...' : '📥 Download PDF'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="attendance-section">
                {attendance.length === 0 ? (
                  <div className="empty-state">
                    <p>
                      No attendance records found
                      {selectedMonth ? ` for ${getMonthName(selectedMonth)} ${selectedYear}` : ` for ${selectedYear}`}
                    </p>
                  </div>
                ) : (
                  <div className="attendance-table-container">
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Year</th>
                          <th>Working Days</th>
                          <th>Present</th>
                          <th>Leave (LOP)</th>
                          <th>Overtime Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.map((record) => (
                          <tr key={record._id}>
                            <td>{getMonthName(record.month)}</td>
                            <td>{record.year}</td>
                            <td>{record.totalWorkingDays}</td>
                            <td className="present">{record.daysPresent}</td>
                            <td className="lop">{record.leaveWithoutPay}</td>
                            <td>{record.overtimeHours || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="profile-section">
                {profile ? (
                  <div className="profile-card">
                    <div className="profile-header">
                      <h2>My Profile</h2>
                    </div>

                    <div className="profile-content">
                      <div className="profile-section-group">
                        <h3>Personal Information</h3>
                        <div className="profile-field">
                          <label>Employee ID</label>
                          <div className="field-value">{profile.employeeId}</div>
                        </div>
                        <div className="profile-field">
                          <label>Name</label>
                          <div className="field-value">
                            {profile.firstName} {profile.lastName}
                          </div>
                        </div>
                        <div className="profile-field">
                          <label>Email</label>
                          <div className="field-value">{profile.personalEmail}</div>
                        </div>
                        {profile.phone && (
                          <div className="profile-field">
                            <label>Phone</label>
                            <div className="field-value">{profile.phone}</div>
                          </div>
                        )}
                        {profile.dob && (
                          <div className="profile-field">
                            <label>Date of Birth</label>
                            <div className="field-value">{formatDate(profile.dob)}</div>
                          </div>
                        )}
                      </div>

                      <div className="profile-section-group">
                        <h3>Professional Information</h3>
                        <div className="profile-field">
                          <label>Designation</label>
                          <div className="field-value">{profile.designation}</div>
                        </div>
                        {profile.department && (
                          <div className="profile-field">
                            <label>Department</label>
                            <div className="field-value">{profile.department}</div>
                          </div>
                        )}
                        <div className="profile-field">
                          <label>Joining Date</label>
                          <div className="field-value">{formatDate(profile.joiningDate)}</div>
                        </div>
                        <div className="profile-field">
                          <label>Status</label>
                          <div className="field-value">
                            <span className={`status-badge ${profile.isActive ? 'active' : 'inactive'}`}>
                              {profile.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {profile.address && (
                        <div className="profile-section-group">
                          <h3>Address</h3>
                          <div className="profile-field">
                            <label>Street</label>
                            <div className="field-value">{profile.address.street || 'N/A'}</div>
                          </div>
                          <div className="profile-field">
                            <label>City</label>
                            <div className="field-value">{profile.address.city || 'N/A'}</div>
                          </div>
                          <div className="profile-field">
                            <label>State</label>
                            <div className="field-value">{profile.address.state || 'N/A'}</div>
                          </div>
                          <div className="profile-field">
                            <label>ZIP Code</label>
                            <div className="field-value">{profile.address.zip || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {profile.bankDetails && (
                        <div className="profile-section-group">
                          <h3>Bank Details</h3>
                          <div className="profile-field">
                            <label>Bank Name</label>
                            <div className="field-value">{profile.bankDetails.bankName || 'N/A'}</div>
                          </div>
                          <div className="profile-field">
                            <label>Account Number</label>
                            <div className="field-value">
                              {profile.bankDetails.accountNumber
                                ? `****${profile.bankDetails.accountNumber.slice(-4)}`
                                : 'N/A'}
                            </div>
                          </div>
                          <div className="profile-field">
                            <label>IFSC Code</label>
                            <div className="field-value">{profile.bankDetails.ifscCode || 'N/A'}</div>
                          </div>
                        </div>
                      )}

                      {profile.taxInfo && (
                        <div className="profile-section-group">
                          <h3>Tax Information</h3>
                          <div className="profile-field">
                            <label>PAN</label>
                            <div className="field-value">{profile.taxInfo.pan || 'N/A'}</div>
                          </div>
                          <div className="profile-field">
                            <label>UAN</label>
                            <div className="field-value">{profile.taxInfo.uan || 'N/A'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Failed to load profile information</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;

