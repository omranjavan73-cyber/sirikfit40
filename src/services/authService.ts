/**
 * Unified Client Authentication Service (100% Iranian & Global IP Compatible)
 * Operates purely over server-side session endpoints (/api/auth/*)
 * Zero browser SDK calls to identitytoolkit.googleapis.com
 */

import { User } from '../types';

export interface SendOtpResponse {
  ok?: boolean;
  success: boolean;
  message?: string;
  error?: string;
  expiresIn?: number;
  remainingSeconds?: number;
}

export interface VerifyOtpResponse {
  ok?: boolean;
  success: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface GenericAuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

const ADMIN_AUTH_KEY = 'omex_admin_auth';
const ADMIN_TOKEN_KEY = 'omex_admin_token';
const CURRENT_USER_KEY = 'omex_current_user';

/**
 * 1. Admin Login via Server Endpoint
 */
export async function loginAdminApi(password: string): Promise<AdminLoginResponse> {
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      const token = data.token || 'omex_admin_session_' + Date.now();
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_AUTH_KEY, 'true');
        localStorage.setItem(ADMIN_TOKEN_KEY, token);
      }
      return { success: true, token };
    }
    return { success: false, error: data.error || 'کلمه عبور وارد شده نادرست است.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطای اتصال به سرور در تایید کلمه عبور.' };
  }
}

/**
 * 2. Admin Logout
 */
export function logoutAdminSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

/**
 * 3. Send Customer / Admin OTP SMS
 */
export async function sendOtp(mobile: string, name?: string): Promise<SendOtpResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: cleanMobile,
        fullName: name ? name.trim() : undefined,
        name: name ? name.trim() : undefined
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return {
        success: true,
        message: data.message || 'کد تایید با پیامک ارسال شد.',
        expiresIn: data.expiresIn || 120
      };
    }
    return {
      success: false,
      error: data.error || data.message || 'خطا در ارسال کد تایید.',
      remainingSeconds: data.remainingSeconds
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در برقراری ارتباط با سامانه پیامکی.' };
  }
}

/**
 * 4. Verify Customer / Admin OTP SMS and Obtain Server Session
 */
export async function verifyOtp(
  mobile: string,
  code: string,
  userDetails?: { name?: string; fullName?: string; email?: string }
): Promise<VerifyOtpResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: cleanMobile,
        code: code.trim(),
        otp: code.trim(),
        ...userDetails
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      const user = data.user || {
        phone: cleanMobile,
        name: userDetails?.fullName || userDetails?.name || 'مشتری گرامی'
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      }
      return {
        success: true,
        message: data.message || 'ورود با موفقیت انجام شد.',
        user,
        token: data.token
      };
    }
    return {
      success: false,
      error: data.error || data.message || 'کد تایید نامعتبر یا منقضی شده است.'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در اعتبارسنجی کد تایید.' };
  }
}

/**
 * 5. Request Admin Password OTP via Email
 */
export async function requestAdminPasswordOtp(email: string): Promise<GenericAuthResponse> {
  try {
    const res = await fetch('/api/admin/request-password-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'خطا در ارسال کد تایید.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطای اتصال به سرور جهت ارسال کد تایید.' };
  }
}

/**
 * 6. Reset Admin Password with OTP
 */
export async function resetAdminPasswordWithOtp(otpCode: string, newPassword: string): Promise<GenericAuthResponse> {
  try {
    const res = await fetch('/api/admin/reset-password-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpCode: otpCode.trim(), newPassword: newPassword.trim() })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || 'کد تایید نامعتبر یا منقضی شده است.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطای اتصال به سرور جهت بازنشانی کلمه عبور.' };
  }
}

/**
 * 7. Change Admin Password Directly
 */
export async function changeAdminPasswordApi(currentPassword: string, newPassword: string): Promise<GenericAuthResponse> {
  try {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'کلمه عبور فعلی نادرست است.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطای اتصال به سرور.' };
  }
}

/**
 * 8. User Session Persistence Helpers
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export default {
  loginAdminApi,
  logoutAdminSession,
  sendOtp,
  verifyOtp,
  requestAdminPasswordOtp,
  resetAdminPasswordWithOtp,
  changeAdminPasswordApi,
  getStoredUser,
  setStoredUser
};
