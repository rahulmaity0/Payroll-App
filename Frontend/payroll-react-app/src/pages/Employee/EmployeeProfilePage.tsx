import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import employeeApi, { EmployeeProfile } from '../../services/employeeApi';
import './EmployeeProfilePage.css';

const EmployeeProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { token, clearToken } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<EmployeeProfile>>({});

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await employeeApi.getMyProfileWithSalary(token);
      setProfile(data);
      setFormData({
        personalEmail: data.personalEmail,
        phone: data.phone,
        dob: data.dob,
        address: data.address,
        bankDetails: data.bankDetails,
        taxInfo: data.taxInfo,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const updated = await employeeApi.updateMyProfile(token, formData);
      setProfile(updated);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        personalEmail: profile.personalEmail,
        phone: profile.phone,
        dob: profile.dob,
        address: profile.address,
        bankDetails: profile.bankDetails,
        taxInfo: profile.taxInfo,
      });
    }
    setIsEditing(false);
    setError('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="employee-profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="employee-profile-container">
        <div className="error-message">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="employee-profile-container">
      <div className="profile-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/employee/dashboard')}>
            ← Back to Dashboard
          </button>
          <h1>My Profile</h1>
        </div>
        <div className="header-actions">
          {!isEditing ? (
            <button className="edit-btn" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button className="cancel-btn" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="profile-content">
        {/* Personal Information Card */}
        <div className="profile-card">
          <h2 className="card-title">Personal Information</h2>
          <div className="card-grid">
            <div className="field-group">
              <label>Employee ID</label>
              <div className="field-value readonly">{profile.employeeId}</div>
            </div>
            <div className="field-group">
              <label>Full Name</label>
              <div className="field-value readonly">
                {profile.firstName} {profile.lastName}
              </div>
            </div>
            <div className="field-group">
              <label>Designation</label>
              <div className="field-value readonly">{profile.designation}</div>
            </div>
            <div className="field-group">
              <label>Department</label>
              <div className="field-value readonly">{profile.department || 'N/A'}</div>
            </div>
            <div className="field-group">
              <label>Joining Date</label>
              <div className="field-value readonly">{formatDate(profile.joiningDate)}</div>
            </div>
            <div className="field-group">
              <label>Status</label>
              <div className="field-value readonly">
                <span className={`status-badge ${profile.isActive ? 'active' : 'inactive'}`}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="profile-card">
          <h2 className="card-title">Contact Information</h2>
          <div className="card-grid">
            <div className="field-group">
              <label>Personal Email</label>
              {isEditing ? (
                <input
                  type="email"
                  className="field-input"
                  value={formData.personalEmail || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, personalEmail: e.target.value })
                  }
                />
              ) : (
                <div className="field-value">{profile.personalEmail}</div>
              )}
            </div>
            <div className="field-group">
              <label>Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  className="field-input"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              ) : (
                <div className="field-value">{profile.phone || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  className="field-input"
                  value={formData.dob ? formData.dob.split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                />
              ) : (
                <div className="field-value">{formatDate(profile.dob)}</div>
              )}
            </div>
          </div>
        </div>

        {/* Address Card */}
        <div className="profile-card">
          <h2 className="card-title">Address</h2>
          <div className="card-grid">
            <div className="field-group full-width">
              <label>Street Address</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.address?.street || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>City</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.address?.city || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.address?.city || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>State</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.address?.state || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.address?.state || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>ZIP Code</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.address?.zip || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, zip: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.address?.zip || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details Card */}
        <div className="profile-card">
          <h2 className="card-title">Bank Details</h2>
          <div className="card-grid">
            <div className="field-group">
              <label>Bank Name</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.bankDetails?.bankName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.bankDetails?.bankName || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>Account Number</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.bankDetails?.accountNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.bankDetails?.accountNumber || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>IFSC Code</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.bankDetails?.ifscCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, ifscCode: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.bankDetails?.ifscCode || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Tax Information Card */}
        <div className="profile-card">
          <h2 className="card-title">Tax Information</h2>
          <div className="card-grid">
            <div className="field-group">
              <label>PAN Number</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.taxInfo?.pan || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxInfo: { ...formData.taxInfo, pan: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.taxInfo?.pan || 'N/A'}</div>
              )}
            </div>
            <div className="field-group">
              <label>UAN Number</label>
              {isEditing ? (
                <input
                  type="text"
                  className="field-input"
                  value={formData.taxInfo?.uan || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      taxInfo: { ...formData.taxInfo, uan: e.target.value },
                    })
                  }
                />
              ) : (
                <div className="field-value">{profile.taxInfo?.uan || 'N/A'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Salary Structure Card (Read-only) */}
        {profile.salary && (
          <div className="profile-card salary-card">
            <h2 className="card-title">Salary Structure (Read-only)</h2>
            <div className="salary-summary">
              <div className="salary-item">
                <span className="label">Annual CTC:</span>
                <span className="value">{formatCurrency(profile.salary.annualCTC)}</span>
              </div>
              <div className="salary-item">
                <span className="label">Monthly CTC:</span>
                <span className="value">
                  {formatCurrency(profile.salary.annualCTC / 12)}
                </span>
              </div>
            </div>

            <div className="salary-breakdown">
              <div className="breakdown-section">
                <h3>Earnings</h3>
                <ul>
                  {profile.salary.earnings.map((earning: { name: string; amount: number }, index: number) => (
                    <li key={index}>
                      <span>{earning.name}</span>
                      <span>{formatCurrency(earning.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="breakdown-section">
                <h3>Deductions</h3>
                <ul>
                  {profile.salary.deductions.map((deduction: { name: string; amount: number; isPercent?: boolean; percentOf?: string }, index: number) => (
                    <li key={index}>
                      <span>
                        {deduction.name}
                        {deduction.isPercent && ` (${deduction.amount}% of ${deduction.percentOf})`}
                      </span>
                      <span>
                        {deduction.isPercent
                          ? `${deduction.amount}%`
                          : formatCurrency(deduction.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {profile.salary.employerContributions &&
                profile.salary.employerContributions.length > 0 && (
                  <div className="breakdown-section">
                    <h3>Employer Contributions</h3>
                    <ul>
                      {profile.salary.employerContributions.map((contribution: { name: string; amount: number; isPercent?: boolean; percentOf?: string }, index: number) => (
                        <li key={index}>
                          <span>
                            {contribution.name}
                            {contribution.isPercent &&
                              ` (${contribution.amount}% of ${contribution.percentOf})`}
                          </span>
                          <span>
                            {contribution.isPercent
                              ? `${contribution.amount}%`
                              : formatCurrency(contribution.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfilePage;
