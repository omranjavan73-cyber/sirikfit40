import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ShoppingBag,
  Home,
  Receipt,
  Copy,
  Check,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import {
  verifyZibalPayment,
  verifyBitpayPayment,
  verifyPaymentTransaction,
  ZibalVerifyResponse,
  BitpayVerifyResponse,
  getZibalStatusDescription,
  getBitpayStatusDescription
} from '../services/paymentService';
import { formatToman, toPersianDigits } from '../utils/formatters';

export const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract query parameters from Zibal or BitPay redirect:
  // Zibal: /payment/callback?trackId=12345678&success=1&status=2&orderId=ord-1001
  // BitPay: /payment/callback?trans_id=98765&id_get=12345&factorId=ord-1001
  const transIdParam =
    searchParams.get('trans_id') ||
    searchParams.get('transId') ||
    searchParams.get('transID') ||
    '';
  const idGetParam =
    searchParams.get('id_get') ||
    searchParams.get('idGet') ||
    searchParams.get('id') ||
    '';
  const trackId =
    searchParams.get('trackId') ||
    searchParams.get('trackid') ||
    searchParams.get('authority') ||
    idGetParam ||
    '';
  const successParam = searchParams.get('success');
  const statusParam = searchParams.get('status');
  const orderIdParam =
    searchParams.get('orderId') ||
    searchParams.get('factorId') ||
    searchParams.get('order_id') ||
    '';

  const isBitpay = Boolean(transIdParam && (idGetParam || trackId));

  const [isLoading, setIsLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<ZibalVerifyResponse | BitpayVerifyResponse | null>(null);
  const [activeGatewayName, setActiveGatewayName] = useState<'zibal' | 'bitpay'>(isBitpay ? 'bitpay' : 'zibal');
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedTrack, setCopiedTrack] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleVerification() {
      // 1. BitPay Verification Flow
      if (transIdParam && (idGetParam || trackId)) {
        setActiveGatewayName('bitpay');
        try {
          const res = await verifyPaymentTransaction({
            gateway: 'bitpay',
            trans_id: transIdParam,
            id_get: idGetParam || trackId,
            trackId: idGetParam || trackId,
            extraParams: { trans_id: transIdParam, id_get: idGetParam || trackId }
          });
          if (isMounted) {
            setVerifyResult(res);
            setIsLoading(false);
          }
        } catch (err: any) {
          if (isMounted) {
            setVerifyResult({
              success: false,
              result: -2,
              message: err?.message || 'خطا در اعتبارسنجی تراکنش بیت‌پی.'
            });
            setIsLoading(false);
          }
        }
        return;
      }

      // 2. Zibal Verification Flow
      if (!trackId) {
        if (isMounted) {
          setVerifyResult({
            success: false,
            result: 203,
            message: 'کد پیگیری تراکنش در آدرس بازگشت یافت نشد یا تراکنش نامعتبر است.'
          });
          setIsLoading(false);
        }
        return;
      }

      setActiveGatewayName('zibal');

      // If gateway explicitly flagged failed in URL params (e.g. success=0 or status=3)
      if (successParam === '0') {
        try {
          const res = await verifyPaymentTransaction({
            gateway: 'zibal',
            trackId: trackId
          });
          if (isMounted) {
            setVerifyResult(res);
            setIsLoading(false);
          }
        } catch (_err) {
          if (isMounted) {
            setVerifyResult({
              success: false,
              result: 202,
              message: 'پرداخت در درگاه بانکی انجام نشد یا توسط کاربر لغو گردید.'
            });
            setIsLoading(false);
          }
        }
        return;
      }

      try {
        const res = await verifyPaymentTransaction({
          gateway: 'zibal',
          trackId: trackId
        });
        if (isMounted) {
          setVerifyResult(res);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setVerifyResult({
            success: false,
            result: -2,
            message: err?.message || 'خطا در برقراری ارتباط با سرور و تایید تراکنش.'
          });
          setIsLoading(false);
        }
      }
    }

    handleVerification();

    return () => {
      isMounted = false;
    };
  }, [trackId, transIdParam, idGetParam, successParam, statusParam]);

  const handleCopy = (text: string, type: 'ref' | 'track') => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    if (type === 'ref') {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } else {
      setCopiedTrack(true);
      setTimeout(() => setCopiedTrack(false), 2000);
    }
  };

  const isSuccess =
    verifyResult?.success ||
    verifyResult?.result === 1 ||
    verifyResult?.result === 100 ||
    verifyResult?.result === 201;

  const displayRefNumber = (verifyResult as any)?.transId || verifyResult?.refNumber || transIdParam;
  const displayTrackId = (verifyResult as any)?.idGet || trackId || idGetParam;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 py-8 font-['Vazirmatn',sans-serif] dir-rtl selection:bg-[#7C3AED]/30">
      {/* Background Decorative Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#7C3AED]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-4 py-1.5 rounded-full mb-3 backdrop-blur-md shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-300">
              {activeGatewayName === 'bitpay'
                ? 'درگاه پرداخت رسمی بیت‌پی (شاپرک و بین‌المللی)'
                : 'درگاه پرداخت رسمی شاپرک (زیبال)'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">فروشگاه اینترنتی سیریک فیت</h1>
        </div>

        {/* State 1: Verification In Progress */}
        {isLoading && (
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-700 border-t-[#7C3AED] animate-spin" />
              <RotateCw className="w-8 h-8 text-[#7C3AED] animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white mb-2">در حال تایید و اعتبارسنجی پرداخت...</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              لطفاً چند لحظه شکیبا باشید. اطلاعات تراکنش در حال ثبت در سامانه مرکزی پرداخت و سیریک فیت می‌باشد.
            </p>
            {displayTrackId && (
              <div className="mt-5 inline-block bg-slate-900/60 border border-slate-700 px-3 py-1 rounded-xl text-[11px] text-slate-400 font-mono">
                شناسه تراکنش: {displayTrackId}
              </div>
            )}
          </div>
        )}

        {/* State 2: Successful Payment */}
        {!isLoading && isSuccess && (
          <div className="bg-slate-800/90 border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-fade-in">
            {/* Success Top Banner */}
            <div className="bg-gradient-to-b from-emerald-500/20 to-transparent p-6 text-center border-b border-emerald-500/20">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">پرداخت با موفقیت انجام شد</h2>
              <p className="text-xs text-emerald-400 font-medium">
                {verifyResult?.result === 201
                  ? 'تراکنش قبلاً تایید و ثبت شده است.'
                  : activeGatewayName === 'bitpay'
                  ? 'تراکنش با موفقیت توسط شبکه بیت‌پی تایید گردید.'
                  : 'سفارش شما با موفقیت در سامانه ثبت گردید.'}
              </p>
            </div>

            {/* Receipt Details Card */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 space-y-3 text-xs">
                {/* Gateway Provider */}
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">درگاه پرداخت:</span>
                  <span className="font-extrabold text-slate-200">
                    {activeGatewayName === 'bitpay' ? 'بیت‌پی (BitPay)' : 'زیبال (Zibal)'}
                  </span>
                </div>

                {/* Ref Number / Trans ID */}
                {displayRefNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">کد رهگیری بانکی (RefID / TransID):</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-emerald-400 text-sm dir-ltr">
                        {String(displayRefNumber)}
                      </span>
                      <button
                        onClick={() => handleCopy(String(displayRefNumber), 'ref')}
                        className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                        title="کپی کد پیگیری"
                      >
                        {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Track ID / ID Get */}
                {displayTrackId && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">
                      {activeGatewayName === 'bitpay' ? 'شناسه فاکتور بیت‌پی (ID Get):' : 'شماره تراکنش زیبال (Track ID):'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200 dir-ltr">{displayTrackId}</span>
                      <button
                        onClick={() => handleCopy(displayTrackId, 'track')}
                        className="text-slate-400 hover:text-white p-1 rounded transition cursor-pointer"
                        title="کپی شماره تراکنش"
                      >
                        {copiedTrack ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Order ID */}
                {(verifyResult?.orderId || orderIdParam) && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">شناسه سفارش:</span>
                    <span className="font-mono font-bold text-slate-200 dir-ltr">
                      {verifyResult?.orderId || orderIdParam}
                    </span>
                  </div>
                )}

                {/* Paid Amount */}
                {verifyResult?.amount && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">مبلغ پرداخت شده:</span>
                    <span className="font-black text-emerald-400 text-sm">
                      {formatToman(Math.round(verifyResult.amount / 10))}
                    </span>
                  </div>
                )}

                {/* Card Number Mask */}
                {verifyResult?.cardNumber && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">شماره کارت پرداخت‌کننده:</span>
                    <span className="font-mono font-medium text-slate-300 dir-ltr">
                      {verifyResult.cardNumber}
                    </span>
                  </div>
                )}

                {/* Paid At Timestamp */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">تاریخ و زمان پرداخت:</span>
                  <span className="text-slate-300">
                    {verifyResult?.paidAt
                      ? new Date(verifyResult.paidAt).toLocaleString('fa-IR')
                      : new Date().toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>

              {/* Information Notice */}
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-300 leading-relaxed flex items-start gap-2">
                <PackageCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>
                  سفارش شما در فرآیند تامین و ترخیص از دبی قرار گرفت. پیامک و جزئیات پیگیری برای شماره شما ارسال خواهد شد.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    navigate('/');
                    // Small timeout to allow tab switch if needed
                    setTimeout(() => {
                      const accountBtn = document.querySelector('[data-tab="account"]') as HTMLElement;
                      if (accountBtn) accountBtn.click();
                    }, 200);
                  }}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/25 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>پیگیری سفارشات من</span>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>بازگشت به فروشگاه</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Failed or Canceled Payment */}
        {!isLoading && !isSuccess && (
          <div className="bg-slate-800/90 border border-rose-500/30 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl animate-fade-in">
            {/* Failed Top Banner */}
            <div className="bg-gradient-to-b from-rose-500/20 to-transparent p-6 text-center border-b border-rose-500/20">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
                <XCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-white mb-1">پرداخت ناموفق بود</h2>
              <p className="text-xs text-rose-400 font-medium">
                {verifyResult?.message ||
                  (activeGatewayName === 'bitpay'
                    ? getBitpayStatusDescription(verifyResult?.result || -1)
                    : getZibalStatusDescription(verifyResult?.result || -1))}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-900/70 border border-slate-700/60 rounded-2xl p-4 space-y-2.5 text-xs">
                {displayTrackId && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">شماره پیگیری / فاکتور:</span>
                    <span className="font-mono font-bold text-slate-300 dir-ltr">{displayTrackId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">وضعیت خطا:</span>
                  <span className="text-rose-400 font-medium">
                    {verifyResult?.result ? `کد خطا ${toPersianDigits(verifyResult.result)}` : 'لغو یا عدم تایید بانک'}
                  </span>
                </div>
              </div>

              {/* Troubleshooting Notice */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-2xl text-[11px] text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  اگر مبلغی از حساب شما کسر شده است، ظرف حداکثر ۷۲ ساعت آینده توسط شبکه بانکی به صورت خودکار بازگشت داده خواهد شد.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-extrabold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-[#7C3AED]/25 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>تلاش مجدد برای خرید</span>
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>صفحه اصلی فروشگاه</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback;
