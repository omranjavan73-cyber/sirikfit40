/**
 * Frontend SMS & OTP Client Service for SMS.ir Integration
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

export interface SendOrderSmsResponse {
  ok?: boolean;
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Sends a 6-digit OTP verification code via SMS.ir
 */
export async function sendOtp(mobile: string, name?: string): Promise<SendOtpResponse> {
  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, name: name ? name.trim() : undefined })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
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
export async function verifyOtp(mobile: string, code: string, userDetails?: { name?: string; email?: string }): Promise<VerifyOtpResponse> {
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, code, ...userDetails })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
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
 * Sends order registration / success SMS notification via SMS.ir Template 595534
 */
export async function sendOrderSuccessSms(mobile: string, customerName: string, orderId: string): Promise<SendOrderSmsResponse> {
  try {
    const res = await fetch('/api/sms/send-order-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, name: customerName, orderId })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'پیامک وضعیت سفارش ارسال شد.' };
    }
    return { success: false, error: data.error || data.message || 'خطا در ارسال پیامک سفارش.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'خطا در ارسال پیامک وضعیت سفارش.' };
  }
}
