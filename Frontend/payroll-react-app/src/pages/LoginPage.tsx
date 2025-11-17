import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../apiConfig';
import './LoginPage.css';

interface LoginSuccessData {
  token?: string;
  _id?: string;
  email?: string;
  role?: 'employee' | 'hr';
  employeeId?: string;
  message?: string;
  [key: string]: any;
}

interface LoginPageProps {
  onLoginSuccess?: (data: LoginSuccessData) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setToken, setRole } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError && validateEmail(value)) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError && value.length >= 6) {
      setPasswordError('');
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset errors
    setError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate form
    let hasError = false;
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }
    
    if (hasError) return;
    
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data: LoginSuccessData = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid credentials');
      } else {
        console.log('Login successful', data);

        if (data.token) {
          setToken(data.token);
          console.log('JWT token stored successfully');
        }

        // Store role in auth context
        if (data.role) {
          setRole(data.role);
        }

        if (onLoginSuccess) {
          onLoginSuccess(data);
        }

        // Route based on user role
        if (data.role === 'employee') {
          navigate('/employee-dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Login request timed out. Please check your connection and try again.');
      } else {
        setError('Something went wrong. Try again.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">💼</div>
          <h1>Payroll System</h1>
          <p className="subtitle">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="label">Email Address</label>
            <input
              id="email"
              type="email"
              className={`input ${emailError ? 'input-error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={loading}
              autoComplete="email"
            />
            {emailError && <span className="error-text">{emailError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="label">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className={`input ${passwordError ? 'input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && <span className="error-text">{passwordError}</span>}
          </div>

          {error && (
            <div className="error-alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text">Secure login powered by JWT authentication</p>
        </div>
      </div>
    </div>
  );
}
