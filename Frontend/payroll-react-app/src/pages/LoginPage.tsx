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
  const { setToken, setRole } = useAuth();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
        <h1>Login</h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
