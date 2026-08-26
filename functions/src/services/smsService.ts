import axios from 'axios';

const SMS_API_URL = 'https://api.sms.ir/v1/send/verify';

export const smsTemplates = {
  AUTH_OTP: 256428,         // تایید هویت: کد ورود شما به سیریک فیت: #CODE#
  PASSWORD_RESET: 664247,   // بازیابی رمز عبور: کد بازیابی رمز عبور شما: #CODE#
  ORDER_SUCCESS: 595534,    // خرید: #NAME# عزیز، سفارش شما با موفقیت ثبت شد. شناسه سفارش: #ORDER_ID#
  ABANDONED_CART_RECOVERY: 664248 // سبد خرید: #NAME# عزیز، سبد خرید شما منتظر شماست. تکمیل خرید: #LINK#
};

export interface SendSmsParams {
  mobile: string;
  templateId: number;
  parameters: Array<{ name: string; value: string }>;
  apiKeyOverride?: string;
}

export const sendAbandonedCartReminder = async (params: {
  mobile: string;
  fullName?: string;
  discountCode?: string;
  cartUrl?: string;
  apiKeyOverride?: string;
}) => {
  const name = params.fullName || 'کاربر گرامی';
  const link = params.cartUrl || 'https://sirikfit40.web.app';
  
  try {
    return await sendSmsVerify({
      mobile: params.mobile,
      templateId: smsTemplates.ABANDONED_CART_RECOVERY,
      parameters: [
        { name: 'NAME', value: name },
        { name: 'LINK', value: link }
      ],
      apiKeyOverride: params.apiKeyOverride
    });
  } catch (err: any) {
    // If template not registered on SMS.ir, try general fallback or log
    console.warn(`[sendAbandonedCartReminder] Template delivery failed, attempting fallback notification for ${params.mobile}:`, err.message);
    throw err;
  }
};

export const sendSmsVerify = async ({ mobile, templateId, parameters, apiKeyOverride }: SendSmsParams) => {
  const apiKey =
    apiKeyOverride ||
    process.env.SMS_IR_API_KEY ||
    (globalThis as any)?.functions?.config?.()?.smsir?.key ||
    'NxE8MgW74US6JDbMM6Gcd5JvERuacKTZ6rSaqTw1YTRtqcuZ';

  if (!apiKey) {
    console.error('SMS_IR_API_KEY is not defined in environment variables');
    throw new Error('تنظیمات پنل پیامک در سرور یافت نشد.');
  }

  // Format Iranian mobile numbers to standard 09xxxxxxxxx
  let cleanMobile = String(mobile || '').replace(/\s+/g, '').replace('+98', '0').replace(/[^0-9]/g, '');
  if (cleanMobile.startsWith('98')) cleanMobile = '0' + cleanMobile.slice(2);
  if (!cleanMobile.startsWith('0') && cleanMobile.length === 10) cleanMobile = '0' + cleanMobile;

  if (!cleanMobile || !cleanMobile.startsWith('09') || cleanMobile.length !== 11) {
    throw new Error('شماره موبایل گیرنده پیامک نامعتبر است (باید ۱۱ رقم و با 09 شروع شود).');
  }

  const payload = {
    mobile: cleanMobile,
    templateId,
    parameters
  };

  try {
    const response = await axios.post(SMS_API_URL, payload, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && (response.data.status === 1 || response.data.status === 200 || response.data.status === 'success')) {
      return { success: true, data: response.data };
    } else {
      throw new Error(response.data?.message || 'خطا در ارسال پیامک از طریق سامانه');
    }
  } catch (error: any) {
    console.error(`[SMS.ir Delivery Error] Template ${templateId} to ${cleanMobile}:`, error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message || 'ارسال پیامک با خطا مواجه شد');
  }
};
