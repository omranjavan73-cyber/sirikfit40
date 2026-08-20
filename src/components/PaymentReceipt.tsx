import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Package,
  Calendar,
  CreditCard,
  Hash,
  User,
  MapPin,
  Phone,
  Printer,
  Home,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../utils/formatters';
import type { Order, CmsConfig } from '../types';

interface PaymentReceiptProps {
  cms?: CmsConfig | null;
  onNavigateHome: () => void;
  onNavigateAccount: () => void;
  onRetryPayment?: (order: Order) => void;
}

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  cms,
  onNavigateHome,
  onNavigateAccount,
  onRetryPayment
}) => {
  const [params, setParams] = useState<{
    status: string;
    orderId: string;
    trackingCode: string;
    trackId: string;
    refNumber: string;
    amount: string;
    message: string;
    gateway: string;
  }>({
    status: '',
    orderId: '',
    trackingCode: '',
    trackId: '',
    refNumber: '',
    amount: '',
    message: '',
    gateway: ''
  });

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  useEffect(() => {
    try {
      const urlSearchParams = new URLSearchParams(window.location.search);
      const statusParam = (urlSearchParams.get('status') || '').toLowerCase();
      const orderIdParam = urlSearchParams.get('orderId') || '';
      const trackingCodeParam = urlSearchParams.get('trackingCode') || '';
      const trackIdParam = urlSearchParams.get('trackId') || '';
      const refNumberParam = urlSearchParams.get('refNumber') || urlSearchParams.get('refId') || '';
      const amountParam = urlSearchParams.get('amount') || '';
      const messageParam = urlSearchParams.get('message') || '';
      const gatewayParam = urlSearchParams.get('gateway') || 'زیبال';

      setParams({
        status: statusParam,
        orderId: orderIdParam,
        trackingCode: trackingCodeParam,
        trackId: trackIdParam,
        refNumber: refNumberParam,
        amount: amountParam,
        message: messageParam,
        gateway: gatewayParam
      });

      // If successful payment, clear cart in localStorage
      if (statusParam === 'success' || statusParam === 'ok' || statusParam === 'paid') {
        try {
          localStorage.removeItem('omex_cart_items');
          localStorage.removeItem('sirikfit_cart_items');
          window.dispatchEvent(new Event('cartUpdated'));
        } catch (_e) {}
      }

      // Fetch order details if orderId or trackingCode is present
      if (orderIdParam || trackingCodeParam) {
        setIsLoadingOrder(true);
        const query = trackingCodeParam
          ? `/api/orders?trackingCode=${encodeURIComponent(trackingCodeParam)}`
          : `/api/orders`;
        fetch(query)
          .then((res) => res.json())
          .then((data: Order[]) => {
            if (Array.isArray(data)) {
              const found = data.find(
                (o) =>
                  (orderIdParam && o.id === orderIdParam) ||
                  (trackingCodeParam && o.trackingCode === trackingCodeParam)
              );
              if (found) {
                setOrder(found);
              } else if (data.length > 0 && trackingCodeParam) {
                setOrder(data[0]);
              }
            }
          })
          .catch((err) => console.warn('Could not fetch order for receipt:', err))
          .finally(() => setIsLoadingOrder(false));
      }
    } catch (e) {
      console.error('Error reading receipt parameters:', e);
    }
  }, []);

  const isSuccess =
    params.status === 'success' ||
    params.status === 'ok' ||
    params.status === 'paid' ||
    (order && order.paymentStatus === 'PAID');

  const formattedAmount = order?.calculatedToman
    ? formatToman(order.calculatedToman)
    : params.amount && !isNaN(Number(params.amount))
    ? formatToman(Number(params.amount))
    : '';

  const displayTrackingCode =
    order?.trackingCode || params.trackingCode || (order?.id ? String(order.id) : '—');
  const displayRefId =
    order?.paymentRefId || params.refNumber || params.trackId || 'تایید مستقیم بانکی';

  const handlePrint = () => {
    window.print();
  };

  const handleContactSupport = () => {
    const phone = (cms?.homeContent?.whatsappPhone || '09121234567').replace(/\D/g, '');
    const message = encodeURIComponent(
      `سلام و درود، درباره سفارش کد ${displayTrackingCode} در فروشگاه اینترنتی سیریک فیت سوال داشتم.`
    );
    window.open(`https://wa.me/98${phone.startsWith('0') ? phone.slice(1) : phone}?text=${message}`, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-4 sm:py-8 px-4 font-['Vazirmatn',sans-serif] dir-rtl text-slate-800 animate-fadeIn">
      {/* Brand Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-white border border-slate-200/80 px-4 py-2 rounded-2xl shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            SF
          </div>
          <div className="text-right">
            <h1 className="font-black text-sm text-slate-900 leading-tight">
              فروشگاه اینترنتی سیریک فیت
            </h1>
            <p className="text-[10px] text-slate-500 font-bold">
              تخصصی‌ترین مرجع مکمل‌های ورزشی و سلامت اورجینال
            </p>
          </div>
        </div>
      </div>

      {/* Main Status Container */}
      <div className="bg-white border border-slate-200 rounded-[28px] shadow-xl overflow-hidden">
        {/* Top Status Header */}
        <div
          className={`p-6 sm:p-8 text-center border-b ${
            isSuccess
              ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-100'
              : 'bg-gradient-to-b from-rose-50 to-white border-rose-100'
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${
              isSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-rose-500 text-white shadow-rose-500/20'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-11 h-11" />
            ) : (
              <XCircle className="w-11 h-11" />
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
            {isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت ناموفق بود'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            {isSuccess
              ? 'تراکنش شما توسط شاپرک تایید گردید و سفارش در سیستم فروشگاه اینترنتی سیریک فیت به ثبت رسید.'
              : params.message
              ? decodeURIComponent(params.message)
              : 'تراکنش پرداخت توسط درگاه بانکی تایید نشد یا توسط کاربر لغو گردید.'}
          </p>

          {isSuccess && formattedAmount && (
            <div className="mt-4 inline-flex items-center gap-2 bg-emerald-100/70 border border-emerald-200 px-4 py-2 rounded-xl text-emerald-900">
              <span className="text-xs font-bold">مبلغ تسویه شده:</span>
              <span className="text-base sm:text-lg font-black">{formattedAmount}</span>
            </div>
          )}
        </div>

        {/* Receipt Details Body */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Transaction Metadata Grid */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
              <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                <Hash className="w-4 h-4 text-slate-400" />
                <span>کد پیگیری سفارش:</span>
              </span>
              <span className="font-black text-slate-900 text-sm font-mono dir-ltr bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {displayTrackingCode}
              </span>
            </div>

            {isSuccess && (
              <>
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span>شماره ارجاع بانکی (RefID):</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900 dir-ltr bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    {toPersianDigits(displayRefId)}
                  </span>
                </div>

                {params.trackId && (
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-slate-500 font-bold">شناسه تراکنش درگاه:</span>
                    <span className="font-mono font-bold text-slate-700 dir-ltr">
                      {toPersianDigits(params.trackId)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>تاریخ و ساعت تراکنش:</span>
                  </span>
                  <span className="font-bold text-slate-800">
                    {new Date().toLocaleDateString('fa-IR')} - ساعت{' '}
                    {new Date().toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </>
            )}

            {order?.customerName && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>نام تحویل‌گیرنده:</span>
                </span>
                <span className="font-black text-slate-900">{order.customerName}</span>
              </div>
            )}

            {order?.phoneNumber && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>شماره تماس:</span>
                </span>
                <span className="font-bold text-slate-800 dir-ltr font-mono">
                  {toPersianDigits(order.phoneNumber)}
                </span>
              </div>
            )}

            {order?.deliveryAddress && (
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 pt-1">
                <span className="text-slate-500 flex items-center gap-1.5 font-bold shrink-0">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>آدرس مقصد:</span>
                </span>
                <span className="font-medium text-slate-800 text-left sm:text-right leading-relaxed max-w-sm">
                  {order.deliveryAddress}
                </span>
              </div>
            )}
          </div>

          {/* Purchased Items Summary */}
          {order?.productTitle && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 border-b border-slate-100 pb-2">
                <Package className="w-4 h-4 text-slate-700" />
                <span>اقلام سفارش داده شده:</span>
              </div>
              <div className="flex items-start gap-3">
                {order.productImage && (
                  <img
                    src={order.productImage}
                    alt={order.productTitle}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 object-contain rounded-xl bg-slate-50 p-1 border border-slate-200 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <h4 className="font-extrabold text-xs text-slate-900 leading-relaxed">
                    {order.productTitle}
                  </h4>
                  {order.selectedOption && (
                    <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {order.selectedOption}
                    </span>
                  )}
                  <div className="text-[11px] text-slate-500">
                    مبدا تامین:{' '}
                    <span className="font-bold text-slate-700">
                      {order.storeName || 'خرید مستقیم از دبی'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guarantee & Shipping Notice */}
          {isSuccess ? (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span>مراحل بعدی پردازش سفارش در سیریک فیت:</span>
              </div>
              <ul className="text-[11px] text-emerald-800 font-medium space-y-1.5 pr-5 list-disc leading-relaxed">
                <li>
                  کارشناسان فروشگاه اینترنتی سیریک فیت سفارش شما را تایید کرده و فرآیند سورسینگ و بسته‌بندی کالا را آغاز نموده‌اند.
                </li>
                <li>
                  کد رهگیری پست پیشتاز / کارگو به محض تحویل به واحد حمل برای شما در پنل کاربری ثبت خواهد شد.
                </li>
                <li>
                  در صورت نیاز به هرگونه راهنمایی، واحد پشتیبانی اختصاصی همواره پاسخگوی شماست.
                </li>
              </ul>
            </div>
          ) : (
            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-rose-900">
                <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                <span>راهنمای رفع مشکل پرداخت:</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                اگر مبلغی از حساب شما کسر شده است، طبق قوانین بانک مرکزی ظرف حداکثر ۷۲ ساعت آینده به حساب شما برگشت داده خواهد شد. شما می‌توانید هم‌اکنون مجدداً تلاش نمایید یا از طریق کارت به کارت اقدام فرمایید.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {isSuccess ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onNavigateAccount}
                  className="w-full bg-[#111111] hover:bg-black text-white font-black text-xs py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Package className="w-4 h-4" />
                  <span>پیگیری سفارش در پنل کاربری</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-slate-300"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ رسید فاکتور</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {order && onRetryPayment && (
                  <button
                    type="button"
                    onClick={() => onRetryPayment(order)}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>تلاش مجدد برای پرداخت آنلاین</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleContactSupport}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 px-4 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>پشتیبانی واتساپ و تماس</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onNavigateHome}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
            >
              <Home className="w-4 h-4" />
              <span>بازگشت به صفحه اصلی فروشگاه</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
