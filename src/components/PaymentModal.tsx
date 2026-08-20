import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink,
  Lock,
  CreditCard
} from 'lucide-react';
import { Order } from '../types';
import { formatToman, toPersianDigits } from '../utils/formatters';

interface PaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (updatedOrder: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionTimer, setSessionTimer] = useState(600); // 10 minutes

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage('');
    setIsRedirecting(false);
    setSessionTimer(600);
    const interval = setInterval(() => {
      setSessionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // Direct Live Gateway Initiation to Shaparak (Zibal)
  const handleInitiateOnlinePayment = async () => {
    setErrorMessage('');
    setIsRedirecting(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amountToman: order.calculatedToman,
          customerPhone: order.phoneNumber,
          customerName: order.customerName,
          orderData: order,
          callbackUrl: window.location.origin + '/api/payment/callback'
        })
      });

      const data = await res.json();
      const targetUrl = data.url || data.redirectUrl;
      if (res.ok && data.success && targetUrl) {
        // Redirect immediately to official bank gateway / Shaparak
        window.location.href = targetUrl;
      } else {
        setErrorMessage(
          data.error ||
            'خطا در دریافت لینک پرداخت از درگاه شاپرک. لطفاً لحظاتی بعد مجدداً تلاش فرمایید.'
        );
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('Payment create error:', err);
      setErrorMessage('خطای اتصال به سرور پرداخت شاپرک. لطفاً وضعیت اینترنت خود را بررسی نمایید.');
      setIsRedirecting(false);
    }
  };

  const minutes = Math.floor(sessionTimer / 60);
  const seconds = sessionTimer % 60;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif] dir-rtl">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-800 animate-fadeIn">
        {/* Gateway Header Banner */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900">اتصال به درگاه پرداخت شاپرک (زیبال)</div>
              <div className="text-[10px] text-slate-500">اتصال امن به شبکه بانکی و درگاه رسمی پرداخت</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono text-xs text-rose-600 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 font-bold dir-ltr">
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

        {/* Payment Selection & Form */}
        <div className="p-5 md:p-6 space-y-4">
          {/* Merchant & Order Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>پذیرنده:</span>
              <span className="font-extrabold text-slate-900">فروشگاه اینترنتی سیریک فیت</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>کد پیگیری سفارش:</span>
              <span className="font-extrabold text-slate-900 dir-ltr">{order.trackingCode || order.id}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between items-center text-slate-600">
                <span>تحویل‌گیرنده:</span>
                <span className="font-bold text-slate-800">{order.customerName}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-slate-200 pt-2.5 mt-2">
              <span className="font-extrabold text-slate-700">مبلغ قابل پرداخت:</span>
              <span className="font-black text-[#7C3AED] text-base">{formatToman(order.calculatedToman)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Secure Shaparak Banner */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center gap-2 font-black text-emerald-900">
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>پرداخت آنلاین و امن با تمامی کارت‌های عضو شتاب</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              با کلیک بر روی دکمه زیر، مستقیماً به درگاه پرداخت شاپرک هدایت می‌شوید. پس از اتمام تراکنش، فرآیند خرید سفارش شما به صورت فوری در دبی آغاز می‌گردد.
            </p>
          </div>

          {/* Single Primary Action Button */}
          <button
            type="button"
            onClick={handleInitiateOnlinePayment}
            disabled={isRedirecting}
            className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-slate-300 text-white font-black text-sm py-4 rounded-2xl transition shadow-lg shadow-[#7C3AED]/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRedirecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال انتقال به درگاه پرداخت اینترنتی...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>انتقال به درگاه پرداخت اینترنتی</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
