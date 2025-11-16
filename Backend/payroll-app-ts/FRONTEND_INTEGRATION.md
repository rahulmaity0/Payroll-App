# Frontend Integration Guide - Payroll System API

**Last Updated:** November 16, 2025

This guide provides complete examples for integrating the Payroll API with your frontend application.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Flow](#authentication-flow)
3. [API Client Setup](#api-client-setup)
4. [Complete Examples](#complete-examples)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## Quick Start

### Base URL
```
http://localhost:5000/api
```

### Required Dependencies

```bash
# Using npm
npm install axios

# Using yarn
yarn add axios
```

---

## Authentication Flow

### 1. User Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. POST /auth/login
       │    { email, password }
       ▼
┌─────────────┐
│   Backend   │
└──────┬──────┘
       │
       │ 2. Returns { token, role, ... }
       ▼
┌─────────────┐
│ localStorage│  Store token & role
└──────┬──────┘
       │
       │ 3. All subsequent requests
       │    Authorization: Bearer <token>
       ▼
┌─────────────┐
│   Backend   │  Validates token & role
└─────────────┘
```

### 2. Role-Based Access

| Role | Can Access |
|------|------------|
| `employee` | Own profile, own payslips, own attendance |
| `hr` | All employee data, salary management, attendance upload, payroll generation |

---

## API Client Setup

### Option 1: Axios with Interceptors (Recommended)

Create `src/utils/api.js`:

```javascript
import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 seconds
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 - Unauthorized (token expired/invalid)
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    
    // Handle 403 - Forbidden (insufficient permissions)
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### Option 2: Fetch API Wrapper

Create `src/utils/fetchApi.js`:

```javascript
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
};

export const fetchApi = {
  get: (endpoint) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders()
    }).then(handleResponse),

  post: (endpoint, data) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  put: (endpoint, data) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    }).then(handleResponse),

  delete: (endpoint) =>
    fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    }).then(handleResponse)
};
```

---

## Complete Examples

### 1. Authentication Service

Create `src/services/authService.js`:

```javascript
import api from '../utils/api';

class AuthService {
  // Register HR user
  async registerHR(userData) {
    try {
      const { data } = await api.post('/auth/register-hr', {
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
      
      // Store auth data
      this.setAuthData(data);
      
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Login
  async login(email, password) {
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password
      });
      
      // Store auth data
      this.setAuthData(data);
      
      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');
    window.location.href = '/login';
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }

  // Get current user role
  getUserRole() {
    return localStorage.getItem('userRole');
  }

  // Get current user data
  getUserData() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  // Private methods
  setAuthData(data) {
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userData', JSON.stringify({
      id: data._id,
      email: data.email,
      role: data.role,
      employeeId: data.employeeId
    }));
  }

  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.message || 'Request failed');
    }
    return new Error('Network error');
  }
}

export default new AuthService();
```

### 2. User/Profile Service

Create `src/services/userService.js`:

```javascript
import api from '../utils/api';

class UserService {
  // Get my profile
  async getMyProfile() {
    const { data } = await api.get('/users/profile');
    return data;
  }

  // Update my profile
  async updateMyProfile(updates) {
    const { data } = await api.put('/users/profile', updates);
    return data;
  }

  // Change password
  async changePassword(oldPassword, newPassword) {
    const { data } = await api.put('/users/password', {
      oldPassword,
      newPassword
    });
    return data;
  }
}

export default new UserService();
```

### 3. Employee Service

Create `src/services/employeeService.js`:

```javascript
import api from '../utils/api';

class EmployeeService {
  // Get my payslips
  async getMyPayslips(year) {
    const params = year ? { year } : {};
    const { data } = await api.get('/employee/payslips', { params });
    return data;
  }

  // Download payslip PDF
  async downloadPayslip(payslipId) {
    const response = await api.get(`/employee/payslips/${payslipId}/download`, {
      responseType: 'blob'
    });
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payslip-${payslipId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // Get my attendance
  async getMyAttendance(year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const { data } = await api.get('/employee/attendance', { params });
    return data;
  }

  // Download attendance CSV
  async downloadAttendanceCSV(year, month) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await api.get('/employee/attendance/download', {
      params,
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance-${year}-${month}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

export default new EmployeeService();
```

### 4. HR Service

Create `src/services/hrService.js`:

```javascript
import api from '../utils/api';

class HRService {
  // Onboard new employee
  async onboardEmployee(employeeData) {
    const { data } = await api.post('/hr/onboard', employeeData);
    return data;
  }

  // Get all employees
  async getAllEmployees() {
    const { data } = await api.get('/hr/employees');
    return data;
  }

  // Get employee by ID
  async getEmployeeById(employeeId) {
    const { data } = await api.get(`/hr/employees/${employeeId}`);
    return data;
  }

  // Update employee profile
  async updateEmployee(employeeId, updates) {
    const { data } = await api.put(`/hr/employees/${employeeId}`, updates);
    return data;
  }

  // Get employee salary
  async getEmployeeSalary(employeeId) {
    const { data } = await api.get(`/hr/employees/${employeeId}/salary`);
    return data;
  }

  // Update employee salary
  async updateEmployeeSalary(employeeId, salaryData) {
    const { data } = await api.put(`/hr/employees/${employeeId}/salary`, salaryData);
    return data;
  }

  // Get employee attendance
  async getEmployeeAttendance(employeeId) {
    const { data } = await api.get(`/hr/employees/${employeeId}/attendance`);
    return data;
  }

  // Create attendance record
  async createAttendance(attendanceData) {
    const { data } = await api.post('/hr/attendance', attendanceData);
    return data;
  }

  // Update attendance record
  async updateAttendance(attendanceId, updates) {
    const { data } = await api.put(`/hr/attendance/${attendanceId}`, updates);
    return data;
  }

  // Upload attendance CSV
  async uploadAttendanceCSV(file, options = {}) {
    const formData = new FormData();
    formData.append('payrollFile', file);
    
    const params = new URLSearchParams({
      mode: options.mode || 'monthly',
      action: options.action || 'preview',
      dedupeStrategy: options.dedupeStrategy || 'skip',
      ...(options.year && { year: options.year }),
      ...(options.month && { month: options.month })
    });
    
    const { data } = await api.post(
      `/hr/attendance/upload?${params.toString()}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return data;
  }

  // Generate payslips
  async generatePayslips(month, year) {
    const { data } = await api.post('/hr/payroll/generate', {
      month,
      year
    });
    return data;
  }

  // Download employee payslip
  async downloadEmployeePayslip(payslipId) {
    const response = await api.get(`/hr/payslips/${payslipId}/download`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payslip-${payslipId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // Reset user password
  async resetUserPassword(userId, newPassword) {
    const { data } = await api.put(`/hr/users/${userId}/reset-password`, {
      newPassword
    });
    return data;
  }
}

export default new HRService();
```

---

## React Component Examples

### Login Component

```jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(email, password);
      
      // Redirect based on role
      if (data.role === 'hr') {
        navigate('/hr/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
```

### Protected Route Component

```jsx
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children, requiredRole }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userRole = authService.getUserRole();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Usage in App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Employee Routes */}
        <Route path="/employee/*" element={
          <ProtectedRoute requiredRole="employee">
            <EmployeeLayout />
          </ProtectedRoute>
        } />
        
        {/* HR Routes */}
        <Route path="/hr/*" element={
          <ProtectedRoute requiredRole="hr">
            <HRLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

### Employee Onboarding Form (HR)

```jsx
import React, { useState } from 'react';
import hrService from '../services/hrService';

const OnboardEmployee = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    designation: '',
    joiningDate: '',
    annualCTC: '',
    department: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await hrService.onboardEmployee({
        ...formData,
        annualCTC: parseFloat(formData.annualCTC)
      });
      
      setSuccess(
        `Employee ${result.data.employee.firstName} onboarded successfully! ` +
        `Employee ID: ${result.data.employee.employeeId}. ` +
        `Default password: "password"`
      );
      
      // Reset form
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        designation: '',
        joiningDate: '',
        annualCTC: '',
        department: ''
      });
    } catch (err) {
      setError(err.message || 'Failed to onboard employee');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="onboard-container">
      <h2>Onboard New Employee</h2>
      
      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Designation *</label>
          <input
            type="text"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Department</label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Joining Date *</label>
            <input
              type="date"
              name="joiningDate"
              value={formData.joiningDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Annual CTC (₹) *</label>
            <input
              type="number"
              name="annualCTC"
              value={formData.annualCTC}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Onboarding...' : 'Onboard Employee'}
        </button>
      </form>
    </div>
  );
};

export default OnboardEmployee;
```

### Upload Attendance CSV (HR)

```jsx
import React, { useState } from 'react';
import hrService from '../services/hrService';

const UploadAttendance = () => {
  const [file, setFile] = useState(null);
  const [options, setOptions] = useState({
    mode: 'monthly',
    action: 'preview',
    dedupeStrategy: 'skip'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await hrService.uploadAttendanceCSV(file, options);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Attendance CSV</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Mode</label>
          <select
            value={options.mode}
            onChange={(e) => setOptions({ ...options, mode: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
          </select>
        </div>

        <div className="form-group">
          <label>Action</label>
          <select
            value={options.action}
            onChange={(e) => setOptions({ ...options, action: e.target.value })}
          >
            <option value="preview">Preview (no changes)</option>
            <option value="append">Append (add new)</option>
            <option value="overwrite">Overwrite (replace)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Duplicate Strategy</label>
          <select
            value={options.dedupeStrategy}
            onChange={(e) => setOptions({ ...options, dedupeStrategy: e.target.value })}
          >
            <option value="skip">Skip duplicates</option>
            <option value="update">Update duplicates</option>
            <option value="error">Error on duplicates</option>
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}
      
      {result && (
        <div className="result">
          <h3>Upload Result</h3>
          <p>Mode: {result.mode}</p>
          <p>Action: {result.action}</p>
          <p>Processed: {result.recordsProcessed}</p>
          <p>Success: {result.successCount}</p>
          <p>Failed: {result.failureCount}</p>
          {result.errors && result.errors.length > 0 && (
            <div className="errors">
              <h4>Errors:</h4>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadAttendance;
```

---

## Error Handling

### Global Error Handler

```javascript
// src/utils/errorHandler.js

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    const message = error.response.data?.message || 'An error occurred';
    
    switch (status) {
      case 400:
        return `Invalid request: ${message}`;
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return message;
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your internet connection.';
  } else {
    // Error setting up request
    return error.message || 'An unexpected error occurred.';
  }
};

// Usage
try {
  await api.post('/hr/onboard', data);
} catch (error) {
  const errorMessage = handleApiError(error);
  setError(errorMessage);
}
```

---

## Best Practices

### 1. Token Management

```javascript
// Refresh token before expiry (if implemented)
const setupTokenRefresh = () => {
  setInterval(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Check if token expires soon and refresh
      // This depends on your backend implementation
    }
  }, 15 * 60 * 1000); // Check every 15 minutes
};
```

### 2. Loading States

```jsx
const [loadingStates, setLoadingStates] = useState({
  profile: false,
  payslips: false,
  attendance: false
});

const setLoading = (key, value) => {
  setLoadingStates(prev => ({ ...prev, [key]: value }));
};

// Usage
setLoading('profile', true);
await userService.getMyProfile();
setLoading('profile', false);
```

### 3. Form Validation

```javascript
const validateEmployeeForm = (formData) => {
  const errors = {};
  
  if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = 'Valid email is required';
  }
  
  if (!formData.firstName || formData.firstName.trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }
  
  if (!formData.annualCTC || formData.annualCTC < 0) {
    errors.annualCTC = 'Valid CTC is required';
  }
  
  return errors;
};
```

### 4. Environment Variables

Create `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

Usage:

```javascript
const API_URL = process.env.REACT_APP_API_URL;
const isDevelopment = process.env.REACT_APP_ENV === 'development';
```

---

## Testing Examples

### Unit Test (Jest)

```javascript
import authService from '../services/authService';
import api from '../utils/api';

jest.mock('../utils/api');

describe('AuthService', () => {
  it('should login successfully', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        role: 'employee',
        email: 'test@example.com'
      }
    };
    
    api.post.mockResolvedValue(mockResponse);
    
    const result = await authService.login('test@example.com', 'password');
    
    expect(result.token).toBe('mock-token');
    expect(localStorage.getItem('authToken')).toBe('mock-token');
  });
});
```

---

## Troubleshooting

### Common Issues

1. **CORS Errors**
   ```javascript
   // Ensure backend has CORS enabled
   // In your backend index.ts:
   import cors from 'cors';
   app.use(cors({
     origin: 'http://localhost:3000',
     credentials: true
   }));
   ```

2. **Token Not Persisting**
   ```javascript
   // Check if localStorage is available
   if (typeof Storage !== 'undefined') {
     localStorage.setItem('authToken', token);
   } else {
     console.error('LocalStorage not supported');
   }
   ```

3. **File Upload Fails**
   ```javascript
   // Ensure correct headers
   const formData = new FormData();
   formData.append('payrollFile', file);
   
   await api.post('/hr/attendance/upload', formData, {
     headers: {
       'Content-Type': 'multipart/form-data'
     }
   });
   ```

---

**For API endpoint details, see:** `API_DOCUMENTATION_V2.md`

**For model schemas, see:** `MODELS_DOCUMENTATION.md`
