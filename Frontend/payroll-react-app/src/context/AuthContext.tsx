import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  role: 'employee' | 'hr' | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setRole: (role: 'employee' | 'hr' | null) => void;
  clearToken: () => void;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => {
    return localStorage.getItem('jwtToken');
  });

  const [role, setRoleState] = useState<'employee' | 'hr' | null>(() => {
    const storedRole = localStorage.getItem('userRole');
    return (storedRole === 'employee' || storedRole === 'hr') ? storedRole : null;
  });

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('jwtToken', newToken);
    } else {
      localStorage.removeItem('jwtToken');
    }
  };

  const setRole = (newRole: 'employee' | 'hr' | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('userRole', newRole);
    } else {
      localStorage.removeItem('userRole');
    }
  };

  const clearToken = () => {
    setToken(null);
    setRole(null);
  };

  const getAuthHeader = (): Record<string, string> => {
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
      };
    }
    return {};
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, role, isAuthenticated, setToken, setRole, clearToken, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
