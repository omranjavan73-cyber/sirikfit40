import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { getAdminPasswordFromFirestore } from '../firebase';
import {
  loginAdminApi,
  logoutAdminSession,
  requestAdminPasswordOtp,
  resetAdminPasswordWithOtp,
  changeAdminPasswordApi,
  getStoredUser,
  setStoredUser
} from '../services/authService';

interface AuthContextType {
  isAdminAuthenticated: boolean;
  adminToken: string | null;
  currentUser: User | null;
  loginAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  requestPasswordOtp: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPasswordOtp: (otpCode: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  changeAdminPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginCustomer: (user: User) => void;
  logoutCustomer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omex_admin_auth') === 'true';
    }
    return false;
  });

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omex_admin_token');
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => getStoredUser());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isAdminAuthenticated) {
        localStorage.setItem('omex_admin_auth', 'true');
        if (adminToken) localStorage.setItem('omex_admin_token', adminToken);
      } else {
        localStorage.removeItem('omex_admin_auth');
        localStorage.removeItem('omex_admin_token');
      }
    }
  }, [isAdminAuthenticated, adminToken]);

  const loginAdmin = async (password: string): Promise<{ success: boolean; error?: string }> => {
    const res = await loginAdminApi(password);
    if (res.success) {
      setIsAdminAuthenticated(true);
      if (res.token) setAdminToken(res.token);
      return { success: true };
    }

    // Offline / Direct fallback check
    try {
      const firestorePass = await getAdminPasswordFromFirestore();
      if (firestorePass && password.trim() === firestorePass) {
        const token = 'omex_admin_session_' + Date.now();
        setIsAdminAuthenticated(true);
        setAdminToken(token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('omex_admin_auth', 'true');
          localStorage.setItem('omex_admin_token', token);
        }
        return { success: true };
      }
    } catch (_e) {}

    return { success: false, error: res.error || 'کلمه عبور وارد شده نادرست است.' };
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminToken(null);
    logoutAdminSession();
  };

  const requestPasswordOtp = async (email: string) => {
    return await requestAdminPasswordOtp(email);
  };

  const resetPasswordOtp = async (otpCode: string, newPassword: string) => {
    return await resetAdminPasswordWithOtp(otpCode, newPassword);
  };

  const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
    return await changeAdminPasswordApi(currentPassword, newPassword);
  };

  const loginCustomer = (user: User) => {
    setCurrentUser(user);
    setStoredUser(user);
  };

  const logoutCustomer = () => {
    setCurrentUser(null);
    setStoredUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAdminAuthenticated,
        adminToken,
        currentUser,
        loginAdmin,
        logoutAdmin,
        requestPasswordOtp,
        resetPasswordOtp,
        changeAdminPassword,
        loginCustomer,
        logoutCustomer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
