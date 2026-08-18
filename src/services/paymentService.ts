import { safeFetchJson } from '../utils/apiHelper';

export interface InitiatePaymentParams {
  amount: number; // in Toman or Rial
  orderId?: string;
  mobile?: string;
  phoneNumber?: string;
  description?: string;
  callbackUrl?: string;
  customerName?: string;
  name?: string;
  email?: string;
  productTitle?: string;
  deliveryAddress?: string;
  [key: string]: any;
}

export interface ZibalRequestResponse {
  success: boolean;
  result: number;
  trackId?: number | string;
  paymentUrl?: string;
  message?: string;
  error?: string;
}

export interface ZibalVerifyResponse {
  success: boolean;
  result: number;
  refNumber?: string | number;
  paidAt?: string;
  amount?: number;
  cardNumber?: string;
  orderId?: string;
  order?: any;
  message?: string;
  error?: string;
}

export interface BitpayRequestResponse {
  success: boolean;
  result: number;
  idGet?: string | number;
  trackId?: string | number;
  paymentUrl?: string;
  orderId?: string;
  message?: string;
  error?: string;
}

export interface BitpayVerifyResponse {
  success: boolean;
  result: number;
  refNumber?: string | number;
  transId?: string | number;
  idGet?: string | number;
  paidAt?: string;
  amount?: number;
  cardNumber?: string;
  orderId?: string;
  order?: any;
  message?: string;
  error?: string;
}

/**
 * Returns user-friendly Persian explanation for Zibal gateway result codes
 */
export function getZibalStatusDescription(result: number): string {
  switch (result) {
    case 100:
      return 'تراکنش با موفقیت انجام و تایید شد.';
    case 102:
      return 'مرچنت یافت نشد (کد پذیرنده نامعتبر است).';
    case 103:
      return 'مرچنت غیرفعال است.';
    case 104:
      return 'مرچنت نامعتبر است.';
    case 105:
      return 'مبلغ باید بیشتر از ۱,۰۰۰ ریال باشد.';
    case 106:
      return 'آدرس بازگشت (callbackUrl) نامعتبر است.';
    case 113:
      return 'مبلغ تراکنش از سقف مجاز بیشتر است.';
    case 201:
      return 'تراکنش قبلا تایید شده است.';
    case 202:
      return 'سفارش پرداخت نشده یا توسط کاربر لغو شده است.';
    case 203:
      return 'کد پیگیری (trackId) نامعتبر است.';
    case -1:
      return 'در انتظار پرداخت کاربر در درگاه بانکی.';
    case -2:
      return 'خطای داخلی سرور درگاه پرداخت زیبال.';
    default:
      return `وضعیت تراکنش: کد ${result}`;
  }
}

/**
 * Returns user-friendly Persian explanation for BitPay gateway result codes
 */
export function getBitpayStatusDescription(result: number | string): string {
  const code = Number(result);
  switch (code) {
    case 1:
      return 'پرداخت با موفقیت انجام و توسط شبکه بیت‌پی تایید شد.';
    case -1:
      return 'کد API ارسالی با اطلاعات درگاه بیت‌پی همخوانی ندارد.';
    case -2:
      return 'مبلغ ارسالی نامعتبر است (حداقل مبلغ مجاز ۱,۰۰۰ ریال است).';
    case -3:
      return 'آدرس بازگشت (redirect url) نامعتبر است.';
    case -4:
      return 'چنین تراکنشی در سیستم بیت‌پی یافت نشد یا قبلاً تایید شده است.';
    case -11:
      return 'تراکنش تکراری است یا قبلاً در سیستم ثبت شده است.';
    default:
      if (code > 0) return 'درگاه پرداخت بیت‌پی آماده اتصال است.';
      return `خطا در پردازش درگاه بیت‌پی (کد ${result})`;
  }
}

/**
 * Initiates payment via Zibal Payment Gateway and redirects to gateway URL
 */
export async function initiateZibalPayment(orderData: InitiatePaymentParams): Promise<ZibalRequestResponse> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultCallback = `${currentOrigin}/payment/callback`;

  // Calculate amount in Toman & Rial
  const rawAmount = orderData.calculatedToman || orderData.amount || orderData.totalToman || 0;
  const orderId = orderData.id || orderData.orderId || `ord-${Date.now()}`;
  const mobile = orderData.phoneNumber || orderData.mobile || '';
  const description = orderData.description || `سفارش سیریک فیت - کد ${orderId}`;
  const callbackUrl = orderData.callbackUrl || defaultCallback;

  const payload = {
    ...orderData,
    orderId,
    amount: rawAmount,
    mobile,
    description,
    callbackUrl
  };

  // Try primary API endpoints
  const endpoints = [
    '/api/payment/requestPayment',
    '/api/payment/zibal/request',
    '/requestPayment'
  ];

  let lastError = 'خطا در ارتباط با سرور درگاه پرداخت زیبال';
  let responseData: ZibalRequestResponse | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data && (res.data.paymentUrl || res.data.trackId)) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData || !responseData.paymentUrl) {
    throw new Error(responseData?.message || lastError || 'خطا در ایجاد نشست پرداخت زیبال');
  }

  // Persist pending payment state in localStorage for fast retrieval
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sirikfit_last_pending_order', JSON.stringify({
        orderId,
        gateway: 'zibal',
        trackId: responseData.trackId,
        paymentUrl: responseData.paymentUrl,
        timestamp: Date.now()
      }));
    } catch (_e) {}

    // Redirect user to Zibal IPG
    window.location.href = responseData.paymentUrl;
  }

  return responseData;
}

/**
 * Initiates payment via BitPay Gateway and redirects to gateway URL
 */
export async function initiateBitpayPayment(orderData: InitiatePaymentParams): Promise<BitpayRequestResponse> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultCallback = `${currentOrigin}/payment/callback`;

  const rawAmount = orderData.calculatedToman || orderData.amount || orderData.totalToman || 0;
  const orderId = orderData.id || orderData.orderId || `ord-${Date.now()}`;
  const mobile = orderData.phoneNumber || orderData.mobile || '';
  const name = orderData.customerName || orderData.name || 'کاربر سیریک فیت';
  const email = orderData.email || '';
  const description = orderData.description || `سفارش سیریک فیت - کد ${orderId}`;
  const callbackUrl = orderData.callbackUrl || defaultCallback;

  const payload = {
    ...orderData,
    orderId,
    amount: rawAmount,
    mobile,
    phoneNumber: mobile,
    name,
    customerName: name,
    email,
    description,
    callbackUrl
  };

  const endpoints = [
    '/api/payment/requestBitpayPayment',
    '/api/payment/bitpay/request',
    '/requestBitpayPayment'
  ];

  let lastError = 'خطا در ارتباط با سرور درگاه بیت‌پی';
  let responseData: BitpayRequestResponse | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data && (res.data.paymentUrl || res.data.idGet || res.data.trackId)) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData || !responseData.paymentUrl) {
    throw new Error(responseData?.message || lastError || 'خطا در ایجاد نشست پرداخت بیت‌پی');
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('sirikfit_last_pending_order', JSON.stringify({
        orderId,
        gateway: 'bitpay',
        idGet: responseData.idGet || responseData.trackId,
        trackId: responseData.idGet || responseData.trackId,
        paymentUrl: responseData.paymentUrl,
        timestamp: Date.now()
      }));
    } catch (_e) {}

    // Redirect user to BitPay IPG
    window.location.href = responseData.paymentUrl;
  }

  return responseData;
}

/**
 * Verifies a Zibal transaction by trackId
 */
export async function verifyZibalPayment(trackId: string | number): Promise<ZibalVerifyResponse> {
  const endpoints = [
    '/api/payment/verifyPayment',
    '/api/payment/zibal/verify',
    '/verifyPayment'
  ];

  let lastError = 'خطا در اعتبارسنجی تراکنش از سرور';
  let responseData: ZibalVerifyResponse | null = null;

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: String(trackId) })
      });

      if (res.ok && res.data) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData) {
    return {
      success: false,
      result: -2,
      message: lastError,
      error: lastError
    };
  }

  return responseData;
}

/**
 * Verifies a BitPay transaction by trans_id and id_get
 */
export async function verifyBitpayPayment(trans_id: string | number, id_get: string | number): Promise<BitpayVerifyResponse> {
  const endpoints = [
    '/api/payment/verifyBitpayPayment',
    '/api/payment/bitpay/verify',
    '/verifyBitpayPayment'
  ];

  let lastError = 'خطا در اعتبارسنجی تراکنش بیت‌پی از سرور';
  let responseData: BitpayVerifyResponse | null = null;

  const payload = {
    trans_id: String(trans_id || ''),
    transId: String(trans_id || ''),
    id_get: String(id_get || ''),
    idGet: String(id_get || ''),
    trackId: String(id_get || '')
  };

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData) {
    return {
      success: false,
      result: -2,
      message: lastError,
      error: lastError
    };
  }

  return responseData;
}

/**
 * Unified Cloud Function / Server payment creator: createPaymentRequest
 */
export async function createPaymentRequest(
  params: InitiatePaymentParams & { gateway?: 'zibal' | 'bitpay' }
): Promise<ZibalRequestResponse | BitpayRequestResponse> {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const defaultCallback = `${currentOrigin}/payment/callback`;

  const payload = {
    ...params,
    callbackUrl: params.callbackUrl || defaultCallback
  };

  const endpoints = [
    '/api/payment/createPaymentRequest',
    '/createPaymentRequest',
    '/api/payment/create',
    params.gateway === 'bitpay' ? '/api/payment/requestBitpayPayment' : '/api/payment/requestPayment'
  ];

  let lastError = 'خطا در ایجاد نشست پرداخت';
  let responseData: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data && (res.data.success || res.data.paymentUrl)) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData) {
    if (params.gateway === 'bitpay') {
      return initiateBitpayPayment(params);
    }
    return initiateZibalPayment(params);
  }

  return responseData;
}

/**
 * Unified Cloud Function / Server payment verifier: verifyPaymentTransaction
 */
export async function verifyPaymentTransaction(params: {
  trackId?: string | number;
  gateway?: 'zibal' | 'bitpay';
  extraParams?: { trans_id?: string | number; id_get?: string | number };
  trans_id?: string | number;
  id_get?: string | number;
}): Promise<any> {
  const endpoints = [
    '/api/payment/verifyPaymentTransaction',
    '/verifyPaymentTransaction',
    '/api/payment/verify',
    params.gateway === 'bitpay' || params.trans_id ? '/api/payment/verifyBitpayPayment' : '/api/payment/verifyPayment'
  ];

  let lastError = 'خطا در اعتبارسنجی تراکنش';
  let responseData: any = null;

  for (const endpoint of endpoints) {
    try {
      const res = await safeFetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (res.ok && res.data) {
        responseData = res.data;
        break;
      } else if (res.data && res.data.message) {
        lastError = res.data.message;
      }
    } catch (err: any) {
      lastError = err?.message || lastError;
    }
  }

  if (!responseData) {
    if (params.gateway === 'bitpay' || params.trans_id) {
      return verifyBitpayPayment(params.trans_id || params.extraParams?.trans_id || '', params.id_get || params.trackId || '');
    }
    return verifyZibalPayment(params.trackId || params.id_get || '');
  }

  return responseData;
}

