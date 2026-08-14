import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  RefreshCw,
  CreditCard,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  PackageCheck,
  Calendar,
  Phone,
  Mail,
  LifeBuoy
} from 'lucide-react';
import type { Order, User } from '../types';
import { formatToman, formatPersianDate } from '../utils/formatters';
import { UserSupportTickets } from './UserSupportTickets';
import { fetchUserOrdersFromFirestore } from '../firebase';

interface CustomerAccountViewProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onLoginSuccess?: (user: User) => void;
  onPayPendingOrder?: (order: Order) => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const CustomerAccountView: React.FC<CustomerAccountViewProps> = ({
  currentUser,
  onOpenAuthModal,
  onLogout,
  onLoginSuccess,
  onPayPendingOrder,
  showToast
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [accountTab, setAccountTab] = useState<'orders' | 'tickets'>('orders');

  // Inline Auth form state for unauthenticated users
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');

  // Fetch strictly only the logged in user's orders
  const fetchPersonalOrders = async () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userOrders = await fetchUserOrdersFromFirestore(currentUser.id, currentUser.phoneNumber);
      setOrders(userOrders || []);
    } catch (e) {
      console.error('Error fetching personal orders:', e);
      setErrorMessage('ارتباط با پایگاه داده برقرار نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalOrders();
  }, [currentUser]);

  const handleInlineLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!name.trim() || !phone.trim()) {
      const msg = 'لطفاً نام و شماره تماس را وارد کنید';
      setAuthError(msg);
      if (showToast) showToast(msg, 'error');
      return;
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      name: name.trim(),
      phoneNumber: phone.trim(),
      email: email.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('omex_current_user', JSON.stringify(newUser));
    const succMsg = 'ورود با موفقیت انجام شد';
    if (showToast) showToast(succMsg, 'success');

    if (onLoginSuccess) {
      onLoginSuccess(newUser);
    }
  };

  const getShippingBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'DELIVERED':
        return (
          <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تکمیل و تحویل شد
          </span>
        );
      case 'SHIPPED_IRAN':
      case 'SHIPPED':
        return (
          <span className="bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 animate-bounce" />
            ارسال شده به ایران
          </span>
        );
      case 'DUBAI_WAREHOUSE':
        return (
          <span className="bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" />
            در انبار دبی
          </span>
        );
      case 'PURCHASED':
      case 'PROCESSING':
        return (
          <span className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            خریداری شده در دبی
          </span>
        );
      case 'PENDING_BUY':
      default:
        return (
          <span className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            در انتظار خرید از دبی
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md">
            پرداخت شده
          </span>
        );
      case 'FAILED':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md">
            پرداخت ناموفق
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md">
            در انتظار پرداخت
          </span>
        );
    }
  };

  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);

  // Filter personal orders locally if user types in search
  const filteredPersonalOrders = (orders || []).filter((order) => {
    if (!order) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (order.trackingCode || '').toLowerCase().includes(q) ||
      (order.productTitle || '').toLowerCase().includes(q) ||
      (order.storeName && order.storeName.toLowerCase().includes(q))
    );
  });

  const activeShipmentsCount = (orders || []).filter(
    (o) => o && (o.shippingStatus === 'PROCESSING' || o.shippingStatus === 'SHIPPED')
  ).length;

  const paidOrdersCount = (orders || []).filter((o) => o && o.paymentStatus === 'PAID').length;

  const getTrackingStepIndex = (shippingStatus?: string, paymentStatus?: string) => {
    const s = (shippingStatus || '').toUpperCase();
    const p = (paymentStatus || '').toUpperCase();

    // Stage 4: تحویل به مشتری
    if (s === 'COMPLETED' || s === 'DELIVERED' || s === 'DELIVERED_CUSTOMER') {
      return 4;
    }
    // Stage 3: ارسال شده
    if (s === 'SHIPPED_IRAN' || s === 'SHIPPED' || s === 'IN_TRANSIT') {
      return 3;
    }
    // Stage 2: تایید سفارش / در حال پردازش و تهیه
    if (s === 'CONFIRMED' || s === 'PROCESSING' || s === 'PURCHASED' || s === 'DUBAI_WAREHOUSE' || s === 'PENDING_BUY') {
      return 2;
    }
    // Stage 1: پرداخت موفق
    if (p === 'PAID' || s === 'PAID') {
      return 1;
    }
    return 1;
  };

  // ----------------------------------------------------
  // UNAUTHENTICATED USER STATE: Required Form Login Gate
  // ----------------------------------------------------
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-6 bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 shadow-xl text-slate-800 space-y-6 font-['Vazirmatn',sans-serif]">
        <div className="w-16 h-16 rounded-2xl bg-[#111111] text-white flex items-center justify-center mx-auto shadow-md">
          <UserIcon className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2 text-center">
          <span className="bg-slate-100 text-slate-900 border border-slate-200 text-[11px] font-extrabold px-3 py-1 rounded-full inline-block">
            ورود به داشبورد کاربری
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-900">
            ورود و مشاهده سفارشات
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            جهت پیگیری مرسوله‌ها و دسترسی به سوابق خرید، اطلاعات زیر را وارد نمایید.
          </p>
        </div>

        {authError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleInlineLogin} className="space-y-4 text-xs">
          {/* Field 1: Name (Required) */}
          <div>
            <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
              نام و نام خانوادگی <span className="text-rose-600">* (الزامی)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: علیرضا حسینی"
                className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-bold p-3.5 pr-9 rounded-xl focus:outline-none transition"
              />
              <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-4" />
            </div>
          </div>

          {/* Field 2: Phone (Required) */}
          <div>
            <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
              شماره تماس <span className="text-rose-600">* (الزامی)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09121234567"
                className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-bold p-3.5 pr-9 rounded-xl focus:outline-none text-left dir-ltr transition"
                dir="ltr"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-4" />
            </div>
          </div>

          {/* Field 3: Email (Optional) */}
          <div>
            <label className="font-extrabold text-slate-900 block mb-1.5 text-right">
              ایمیل <span className="text-slate-400 font-semibold">(اختیاری)</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-[#F8FAFC] border border-slate-300 focus:border-[#111111] focus:bg-white text-slate-900 text-xs font-medium p-3.5 pr-9 rounded-xl focus:outline-none text-left dir-ltr transition"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-4" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#111111] hover:bg-black text-white font-black text-sm py-4 rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>ورود / ثبت‌نام در سامانه</span>
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGGED-IN CUSTOMER DASHBOARD (#user-dashboard)
  // ----------------------------------------------------
  return (
    <div id="user-dashboard" className="space-y-6 pb-8 font-['Vazirmatn',sans-serif] animate-fade-in">
      {/* Customer Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#111111] text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {currentUser.name ? currentUser.name.charAt(0) : 'ک'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-base md:text-lg text-slate-900">{currentUser.name}</h2>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  مشتری تایید شده
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span className="font-bold dir-ltr">{currentUser.phoneNumber}</span>
                </span>
                {currentUser.email && (
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 self-end sm:self-center cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج از حساب</span>
          </button>
        </div>

        {/* Quick Personal Metrics */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">کل سفارشات شما</span>
            <span className="text-base md:text-lg font-black text-slate-900">{orders.length}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">مرسوله‌های در مسیر</span>
            <span className="text-base md:text-lg font-black text-sky-700">{activeShipmentsCount}</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-500 font-bold block mb-1">پرداخت‌های موفق</span>
            <span className="text-base md:text-lg font-black text-emerald-700">{paidOrdersCount}</span>
          </div>
        </div>
      </div>

      {/* Account Dashboard Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setAccountTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
            accountTab === 'orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سفارشات من</span>
          <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAccountTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs md:text-sm transition cursor-pointer ${
            accountTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          <LifeBuoy className="w-4 h-4 text-emerald-400" />
          <span>تیکت‌های پشتیبانی</span>
        </button>
      </div>

      {accountTab === 'tickets' ? (
        <UserSupportTickets currentUser={currentUser} showToast={showToast} />
      ) : (
        <>
          {/* Orders Section Header & Local Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-black" />
            <span>پیگیری سفارشات و سوابق خرید من</span>
          </h3>

          <button
            onClick={fetchPersonalOrders}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-medium transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی</span>
          </button>
        </div>

        {/* Search within personal orders */}
        {orders.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در سفارشات شما (کد پیگیری OMX-... یا نام محصول)..."
              className="w-full bg-slate-50 border border-slate-300 focus:border-black text-slate-900 text-xs md:text-sm pr-9 pl-3 py-2.5 rounded-xl focus:outline-none focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          </div>
        )}
      </div>

      {/* Personal Orders List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-black" />
          <p className="text-xs font-medium">در حال دریافت لیست سفارشات شما...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-semibold">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      ) : filteredPersonalOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-2xs">
          <PackageCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-base">هیچ سفارشی یافت نشد</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'هیچ سفارشی متناسب با عبارت جستجو شده در حساب شما یافت نشد.'
              : 'هنوز هیچ سفارشی برای حساب شما ثبت نشده است. از صفحه اصلی، لینک محصول دبی خود را وارد کنید!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPersonalOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-4 md:p-5 transition shadow-2xs space-y-4"
            >
              {/* Order Header: Tracking code & Shipping Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">کد پیگیری:</span>
                  <span className="font-mono font-black text-sm text-black bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 dir-ltr">
                    {order.trackingCode}
                  </span>
                  {getPaymentBadge(order.paymentStatus)}
                </div>

                <div className="flex items-center gap-2">
                  {getShippingBadge(order.shippingStatus)}
                </div>
              </div>

              {/* Order Content */}
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {order.productImage && (
                    <img
                      src={order.productImage}
                      alt={order.productTitle}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 bg-slate-50 shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-[10px] text-slate-500 font-extrabold block">
                      فروشگاه: {order.storeName || 'دبی'}
                    </span>
                    <h4 className="font-black text-sm text-slate-900 leading-snug">{order.productTitle}</h4>

                    <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                      <div>
                        تحویل‌گیرنده: <span className="text-slate-900 font-semibold">{order.customerName}</span> ({order.phoneNumber})
                      </div>
                      <div className="line-clamp-1">آدرس: {order.deliveryAddress}</div>
                    </div>
                  </div>
                </div>

                {/* Pricing & Actions */}
                <div className="text-right sm:text-left shrink-0 w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 flex flex-col items-end gap-1.5">
                  <div className="text-[11px] text-slate-500 font-medium">مبلغ کل سفارش:</div>
                  <div className="text-lg font-black text-emerald-700">{formatToman(order.calculatedToman)}</div>

                  <div className="text-[10px] text-slate-400">
                    تاریخ ثبت: {formatPersianDate(order.createdAt)}
                  </div>

                  <div className="flex items-center gap-2 mt-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedTrackingOrder(order)}
                      className="bg-black hover:bg-neutral-800 text-white text-xs font-extrabold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>رهگیری ۴ مرحله‌ای</span>
                    </button>

                    {order.paymentStatus !== 'PAID' && onPayPendingOrder && (
                      <button
                        onClick={() => onPayPendingOrder(order)}
                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-3 py-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>پرداخت آنلاین</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 4-Stage Stepper Bar on each order card */}
              {(() => {
                const activeStage = getTrackingStepIndex(order.shippingStatus, order.paymentStatus);
                const stages = [
                  { step: 1, label: 'پرداخت موفق' },
                  { step: 2, label: 'تایید سفارش' },
                  { step: 3, label: 'ارسال شده' },
                  { step: 4, label: 'تحویل به مشتری' }
                ];

                return (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mt-2">
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {stages.map((st) => {
                        const isDone = st.step <= activeStage;
                        const isCurrent = st.step === activeStage;

                        return (
                          <div key={st.step} className="flex flex-col items-center text-center relative">
                            <div
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-black transition mb-1 ${
                                isDone
                                  ? isCurrent
                                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200 animate-pulse'
                                    : 'bg-slate-900 text-white'
                                  : 'bg-white border border-slate-300 text-slate-400'
                              }`}
                            >
                              {isDone && !isCurrent ? '✓' : st.step}
                            </div>
                            <span
                              className={`text-[10px] sm:text-[11px] font-bold truncate max-w-full ${
                                isDone ? (isCurrent ? 'text-emerald-700 font-black' : 'text-slate-900') : 'text-slate-400'
                              }`}
                            >
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {/* TRACKING TIMELINE MODAL */}
      {selectedTrackingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Vazirmatn',sans-serif]">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden space-y-5 p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="bg-[#111111] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block mb-1 border border-[#D31027]/40">
                  سامانه رهگیری ۴ مرحله‌ای SIRIK FIT
                </span>
                <h3 className="font-black text-base text-slate-900">
                  رهگیری مرسوله: <span className="font-mono dir-ltr">{selectedTrackingOrder.trackingCode}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrackingOrder(null)}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Product Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3">
              {selectedTrackingOrder.productImage && (
                <img src={selectedTrackingOrder.productImage} alt="" className="w-12 h-12 object-cover rounded-xl border border-slate-200" />
              )}
              <div className="text-xs">
                <div className="font-black text-slate-900 line-clamp-1">{selectedTrackingOrder.productTitle}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  فروشگاه: {selectedTrackingOrder.storeName || 'دبی'} • قیمت کل: {formatToman(selectedTrackingOrder.calculatedToman)}
                </div>
              </div>
            </div>

            {/* 4-Stage Visual Timeline Steps */}
            <div className="space-y-4 py-2 relative">
              <div className="absolute right-4 top-4 bottom-4 w-0.5 bg-slate-200 z-0"></div>

              {[
                { step: 1, title: 'مرحله ۱: پرداخت موفق (Payment Successful)', desc: 'تراکنش با موفقیت انجام شد و سفارش در سیستم ثبت گردید.' },
                { step: 2, title: 'مرحله ۲: تایید سفارش (Order Confirmed / Processing)', desc: 'سفارش توسط پشتیبانی تایید شد و فرآیند آماده‌سازی و بسته‌بندی در جریان است.' },
                { step: 3, title: 'مرحله ۳: ارسال شده (Shipped / In Transit)', desc: 'مرسوله بارگیری شده و در مسیر حمل کارگو / پست به سمت مقصد قرار گرفت.' },
                { step: 4, title: 'مرحله ۴: تحویل به مشتری (Delivered to Customer)', desc: 'بسته با موفقیت به مشتری گرامی تحویل داده شد.' }
              ].map((item) => {
                const activeIndex = getTrackingStepIndex(selectedTrackingOrder.shippingStatus, selectedTrackingOrder.paymentStatus);
                const isPassed = item.step <= activeIndex;
                const isCurrent = item.step === activeIndex;

                return (
                  <div key={item.step} className="flex items-start gap-4 relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition ${
                        isPassed
                          ? isCurrent
                            ? 'bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100 animate-pulse'
                            : 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-300'
                      }`}
                    >
                      {isPassed && !isCurrent ? '✓' : item.step}
                    </div>
                    <div className="text-xs space-y-0.5 pt-1">
                      <div className={`font-black ${isPassed ? 'text-slate-900' : 'text-slate-400'}`}>
                        {item.title}
                        {isCurrent && (
                          <span className="mr-2 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                            وضعیت کنونی
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px] font-medium">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Additional info footer */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-3 text-xs space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>کد رهگیری اختصاصی کارگو:</span>
                <span className="font-mono font-bold text-slate-900 dir-ltr">OMX-CARGO-{selectedTrackingOrder.trackingCode}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>زمان تخمینی تحویل:</span>
                <span className="font-bold text-slate-900">۵ الی ۷ روز کاری از زمان ثبت</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://t.me/SIRIK_FIT_Support?text=${encodeURIComponent(`سلام، پیگیری سفارش کد ${selectedTrackingOrder.trackingCode}`)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-black py-3 rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>پشتیبانی تلگرام این سفارش</span>
              </a>
              <button
                onClick={() => setSelectedTrackingOrder(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-3 rounded-2xl transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
