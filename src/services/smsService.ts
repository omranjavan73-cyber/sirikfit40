/**
 * Frontend SMS & OTP Client Service for SMS.ir Integration
 * Approved Templates:
 * - 256428: Customer & Admin OTP Authentication (کد ورود شما به سیریک فیت: #CODE#)
 * - 664247: Password Recovery OTP (کد بازیابی رمز عبور شما: #CODE#)
 * - 595534: Order Success Confirmation (#NAME# عزیز، سفارش شما با موفقیت ثبت شد. شناسه سفارش: #ORDER_ID#)
 */

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
  user?: any;
  token?: string;
}

export interface ResetPasswordResponse {
  ok?: boolean;
  success: boolean;
  message?: string;
  error?: string;
}

export interface SendOrderSmsResponse {
  ok?: boolean;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * 1. Customer & Admin OTP Login - Sends a 6-digit OTP code via SMS.ir (Template 256428)
 */
export async function sendOtp(mobile: string, name?: string): Promise<SendOtpResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, fullName: name ? name.trim() : undefined, name: name ? name.trim() : undefined })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return { success: true, message: data.message || 'کد تایید پیامک شد.', expiresIn: data.expiresIn || 120 };
    }
    return {
      success: false,
      error: data.error || data.message || 'خطا در ارسال کد تایید.',
      remainingSeconds: data.remainingSeconds
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در ارتباط با سرور پیامک.' };
  }
}

/**
 * Verifies the 6-digit OTP code entered by the user
 */
export async function verifyOtp(mobile: string, code: string, userDetails?: { name?: string; fullName?: string; email?: string }): Promise<VerifyOtpResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, code, otp: code, ...userDetails })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return {
        success: true,
        message: data.message || 'ورود با موفقیت انجام شد.',
        user: data.user,
        token: data.token
      };
    }
    return { success: false, error: data.error || data.message || 'کد تایید نامعتبر یا منقضی شده است.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در اعتبارسنجی کد تایید.' };
  }
}

/**
 * 2. Password Recovery OTP - Sends a 6-digit reset code via SMS.ir (Template 664247)
 */
export async function sendForgotPasswordOtp(mobile: string): Promise<SendOtpResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/forgot-password-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return { success: true, message: data.message || 'کد بازیابی رمز عبور با پیامک ارسال شد.', expiresIn: data.expiresIn || 120 };
    }
    return {
      success: false,
      error: data.error || data.message || 'خطا در ارسال کد بازیابی رمز عبور.'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در ارتباط با سامانه پیامکی.' };
  }
}

/**
 * Resets the password using the 6-digit SMS OTP code (Template 664247 verification)
 */
export async function resetPasswordWithOtp(mobile: string, code: string, newPassword: string): Promise<ResetPasswordResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, code, otp: code, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return { success: true, message: data.message || 'رمز عبور با موفقیت به‌روزرسانی شد.' };
    }
    return { success: false, error: data.error || data.message || 'کد تایید نامعتبر یا منقضی شده است.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در بازنشانی رمز عبور.' };
  }
}

/**
 * 3. Order Confirmation Post-Payment - Sends order success SMS notification via SMS.ir (Template 595534)
 */
export async function sendOrderSuccessSms(mobile: string, customerName: string, orderId: string): Promise<SendOrderSmsResponse> {
  try {
    const cleanMobile = mobile.replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
    const res = await fetch('/api/sms/send-order-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: cleanMobile, name: customerName, orderId })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success || data.ok)) {
      return { success: true, message: data.message || 'پیامک تایید سفارش ارسال شد.' };
    }
    return { success: false, error: data.error || data.message || 'خطا در ارسال پیامک سفارش.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در ارسال پیامک وضعیت سفارش.' };
  }
}
