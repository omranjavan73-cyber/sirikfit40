import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { getAdminPasswordFromFirestore } from '../firebase';

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

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('omex_current_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (_e) {}
      }
    }
    return null;
  });

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
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const token = data.token || 'omex_admin_session_' + Date.now();
        setIsAdminAuthenticated(true);
        setAdminToken(token);
        return { success: true };
      }

      // Offline / Direct fallback check
      const firestorePass = await getAdminPasswordFromFirestore();
      if (firestorePass && password.trim() === firestorePass) {
        const token = 'omex_admin_session_' + Date.now();
        setIsAdminAuthenticated(true);
        setAdminToken(token);
        return { success: true };
      }

      return { success: false, error: data.error || 'کلمه عبور وارد شده نادرست است.' };
    } catch (_err) {
      const firestorePass = await getAdminPasswordFromFirestore();
      if (firestorePass && password.trim() === firestorePass) {
        const token = 'omex_admin_session_' + Date.now();
        setIsAdminAuthenticated(true);
        setAdminToken(token);
        return { success: true };
      }
      return { success: false, error: 'خطای سرور در تایید کلمه عبور.' };
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omex_admin_auth');
      localStorage.removeItem('omex_admin_token');
    }
  };

  const requestPasswordOtp = async (email: string) => {
    try {
      const res = await fetch('/api/admin/request-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'خطا در ارسال کد تایید.' };
    } catch (_err) {
      return { success: false, error: 'خطای اتصال به سرور جهت ارسال کد تایید.' };
    }
  };

  const resetPasswordOtp = async (otpCode: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/reset-password-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otpCode.trim(), newPassword: newPassword.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'کد تایید نامعتبر یا منقضی شده است.' };
    } catch (_err) {
      return { success: false, error: 'خطای اتصال به سرور جهت بازنشانی کلمه عبور.' };
    }
  };

  const changeAdminPassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error || 'کلمه عبور فعلی نادرست است.' };
    } catch (_err) {
      return { success: false, error: 'خطای اتصال به سرور.' };
    }
  };

  const loginCustomer = (user: User) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omex_current_user', JSON.stringify(user));
    }
  };

  const logoutCustomer = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omex_current_user');
    }
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
