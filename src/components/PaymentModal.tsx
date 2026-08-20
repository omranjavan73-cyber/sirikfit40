import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  X,
  ExternalLink,
  Zap,
  Check
} from 'lucide-react';
import { Order } from '../types';
import { formatToman, toPersianDigits } from '../utils/formatters';

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
  onPaymentSuccess: _onPaymentSuccess
}) => {
  const [gatewayConfig, setGatewayConfig] = useState<any>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionTimer, setSessionTimer] = useState(600); // 10 minutes

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingConfig(true);
    fetch('/api/payment/config')
      .then((res) => res.json())
      .then((data) => {
        setGatewayConfig(data);
      })
      .catch((err) => {
        console.error('Failed to load gateway config:', err);
      })
      .finally(() => setIsLoadingConfig(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSessionTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Direct Live Zibal Gateway Initiation
  const handleInitiateOnlinePayment = async () => {
    setErrorMessage('');
    setIsRedirecting(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderData: order,
          callbackUrl: window.location.origin + '/api/payment/callback'
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.redirectUrl) {
        // Redirect directly to official Zibal Shaparak payment gateway
        window.location.href = data.redirectUrl;
      } else {
        setErrorMessage(
          data.error ||
            'خطا در دریافت لینک پرداخت از درگاه زیبال. لطفاً لحظاتی بعد مجدداً تلاش فرمایید.'
        );
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('Payment create error:', err);
      setErrorMessage('خطای اتصال به سرور درگاه پرداخت. لطفاً اتصال اینترنت خود را بررسی فرمایید.');
      setIsRedirecting(false);
    }
  };

  const minutes = Math.floor(sessionTimer / 60);
  const seconds = sessionTimer % 60;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Vazirmatn',sans-serif] dir-rtl">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Gateway Header Banner */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-black">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-2">
                <span>درگاه پرداخت امن زیبال</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  شاپرک
                </span>
              </div>
              <div className="text-[11px] text-slate-400">اتصال مستقیم به شبکه جامع پرداخت کشور</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left font-mono text-xs text-amber-300 bg-white/10 px-3 py-1 rounded-xl border border-white/10 font-bold dir-ltr">
              {toPersianDigits(minutes)}:{seconds < 10 ? '۰' : ''}{toPersianDigits(seconds)}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payment Selection & Details */}
        <div className="p-6 space-y-5">
          {/* Order & Merchant Info Banner */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">پذیرنده رسمی:</span>
              <span className="font-extrabold text-slate-900">فروشگاه آنلاین سیریک فیت</span>
            </div>
            <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">شناسه سفارش:</span>
              <span className="font-mono font-bold text-slate-800 dir-ltr">{order.trackingCode || order.id}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">مبلغ کل پرداختی:</span>
              <span className="font-black text-rose-600 text-base">{formatToman(order.calculatedToman)}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold leading-relaxed flex items-start gap-2">
              <span className="shrink-0 text-rose-500 font-black">⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Security & Zibal Information Card */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2.5 text-xs">
            <div className="flex items-center gap-2 font-black text-emerald-900">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>پرداخت سریع و امن با تمامی کارت‌های بانکی شتاب</span>
            </div>
            <p className="text-emerald-800 text-[11px] leading-relaxed">
              با کلیک بر روی دکمه پرداخت، به درگاه اینترنتی زیبال متصل به شاپرک منتقل می‌شوید. پس از ورود اطلاعات کارت و تکمیل تراکنش، سفارش شما به طور خودکار تایید و ثبت نهایی خواهد شد.
            </p>
            {gatewayConfig?.isSandbox && (
              <div className="pt-2 border-t border-emerald-200/70 text-[10px] text-amber-800 font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>درگاه در حالت آزمایشی (Sandbox) قرار دارد و از مرچنت تستی استفاده می‌کند.</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleInitiateOnlinePayment}
            disabled={isRedirecting || isLoadingConfig}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-extrabold text-sm py-4 rounded-2xl transition shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isRedirecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال اتصال امن به درگاه شاپرک...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>انتقال به درگاه پرداخت اینترنتی</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 font-bold pt-1">
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> پروتکل امن SSL
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> تاییدیه شاپرک
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-500" /> درگاه رسمی زیبال
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
