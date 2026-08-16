import React, { useState, useEffect } from 'react';
import { CreditCard, Lock, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Order } from '../types';
import { formatToman, toPersianDigits } from '../utils/formatters';
import { saveOrderToFirestore } from '../firebase';

interface PaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentSuccess
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cvv2, setCvv2] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('7892');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(120);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);
  const [refId, setRefId] = useState('');

  // Countdown timer for Gateway session
  const [sessionTimer, setSessionTimer] = useState(600); // 10 minutes

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSessionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (otpSent && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, otpTimer]);

  if (!isOpen) return null;

  const handleRequestOtp = () => {
    if (cardNumber.length < 16) {
      setErrorMessage('لطفاً ابتدا شماره کارت ۱۶ رقمی را به طور کامل وارد کنید.');
      return;
    }
    setErrorMessage('');
    setOtpSent(true);
    setOtpTimer(120);
    setOtp('58921'); // Simulate OTP auto-fill
  };

  const handleGenerateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaCode(code);
  };

  const handlePay = async () => {
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setErrorMessage('شماره کارت نامعتبر است.');
      return;
    }
    if (!cvv2 || cvv2.length < 3) {
      setErrorMessage('کد CVV2 را وارد کنید.');
      return;
    }
    if (!expMonth || !expYear) {
      setErrorMessage('تاریخ انقضای کارت را وارد کنید.');
      return;
    }
    if (captchaInput !== captchaCode) {
      setErrorMessage('کد امنیتی صحیح نیست.');
      return;
    }
    if (!otp) {
      setErrorMessage('رمز دوم / پویا را وارد کنید.');
      return;
    }

    setErrorMessage('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/payment/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          cardNumber,
          success: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentDone(true);
        setRefId(data.paymentRefId);
        if (data.order) {
          saveOrderToFirestore(data.order);
          onPaymentSuccess(data.order);
        }
      } else {
        setErrorMessage(data.error || 'پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.');
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('خطا در اتصال به شبکه شاپرک.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const minutes = Math.floor(sessionTimer / 60);
  const seconds = sessionTimer % 60;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-800">
        {/* Gateway Header Banner */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">درگاه پرداخت الکترونیک شاپرک</div>
              <div className="text-[10px] text-slate-500">اتصال امن به شبکه بانکی کشور</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono text-xs text-[#E11D48] bg-white px-2.5 py-1 rounded-lg border border-neutral-200 font-bold">
              {toPersianDigits(minutes)}:{seconds < 10 ? '۰' : ''}{toPersianDigits(seconds)}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {paymentDone ? (
          /* Payment Success Confirmation Receipt */
          <div className="p-6 text-center space-y-4 font-['Vazirmatn',sans-serif]">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-neutral-900 mb-1">پرداخت با موفقیت انجام شد</h3>
              <p className="text-xs text-neutral-600">سفارش شما در سامانه واردات SIRIK FIT ثبت شد.</p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-right text-xs space-y-2.5">
              <div className="flex justify-between items-center text-neutral-600">
                <span>کد پیگیری سفارش:</span>
                <span className="font-extrabold text-black text-sm dir-ltr">{order.trackingCode}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>شماره ارجاع بانک (RefID):</span>
                <span className="font-mono font-bold text-neutral-800 dir-ltr">{refId}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>مبلغ پرداختی:</span>
                <span className="font-extrabold text-emerald-700">{formatToman(order.calculatedToman)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600 border-t border-neutral-200 pt-2">
                <span>نام تحویل‌گیرنده:</span>
                <span className="font-medium text-neutral-900">{order.customerName}</span>
              </div>
            </div>

            <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700 text-[11px] text-right">
              📦 کارشناسان خرید دبی تا چند ساعت آینده فرآیند تامین و ارسال کالا از امارات را آغاز خواهند کرد. اطلاع‌رسانی خودکار به تلگرام و ایمیل ادمین انجام شد.
            </div>

            {/* Notification Dispatch Indicators */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-['Vazirmatn',sans-serif]">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/notify/telegram', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id, orderData: order })
                    });
                    alert('✅ پیام هشدار سفارش مجدداً به تلگرام ادمین ارسال شد.');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✈️ ارسال مجدد به تلگرام</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await fetch('/api/notify/email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: order.id, orderData: order })
                    });
                    alert('✅ فاکتور سفارش مجدداً به ایمیل ادمین ارسال شد.');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>✉️ ارسال مجدد به ایمیل</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-sm py-3 rounded-xl transition shadow-md cursor-pointer mt-2"
            >
              مشاهده در تاریخچه سفارشات
            </button>
          </div>
        ) : (
          /* Payment Form */
          <div className="p-5 md:p-6 space-y-4">
            {/* Merchant Info Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">پذیرنده:</span>
                <span className="font-extrabold text-slate-900">سامانه واردات SIRIK FIT</span>
              </div>
              <div className="text-left">
                <span className="text-slate-500 block text-[10px]">مبلغ قابل پرداخت:</span>
                <span className="font-black text-[#7C3AED] text-sm">{formatToman(order.calculatedToman)}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">شماره کارت ۱۶ رقمی:</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                    placeholder="6037 9918 0000 0000"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#7C3AED] focus:bg-white text-slate-900 text-sm p-2.5 rounded-xl text-left dir-ltr font-mono focus:outline-none"
                    dir="ltr"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">کد CVV2:</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv2}
                    onChange={(e) => setCvv2(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-[#7C3AED] text-slate-900 text-sm p-2.5 rounded-xl text-center font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاریخ انقضا:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="ماه"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-2.5 rounded-xl text-center font-mono focus:outline-none"
                    />
                    <span>/</span>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="سال"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-2.5 rounded-xl text-center font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Captcha */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">کد امنیتی:</label>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="کد تصویر"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-2.5 rounded-xl text-center font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <div className="bg-slate-100 border border-slate-300 text-slate-800 font-mono font-black text-lg px-4 py-1.5 rounded-xl tracking-widest select-none">
                    {captchaCode}
                  </div>
                  <button
                    onClick={handleGenerateCaptcha}
                    type="button"
                    className="text-slate-500 hover:text-slate-800 p-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* OTP Code */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">رمز دوم پویا:</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="رمز دریافت شده"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs p-2.5 rounded-xl text-center font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs px-3 py-2.5 rounded-xl font-bold whitespace-nowrap shrink-0 transition"
                  >
                    {otpSent ? `ارسال مجدد (${otpTimer})` : 'درخواست رمز پویا'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full purple-gradient hover:opacity-95 text-white font-extrabold text-sm py-3.5 rounded-2xl transition shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال انجام تراکنش...</span>
                </>
              ) : (
                <span>پرداخت و ثبت نهایی</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
