import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Send,
  RefreshCw,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  User,
  Phone,
  Package,
  Sparkles,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export interface AbandonedCartItem {
  title: string;
  priceToman: number;
  priceAed?: number;
  quantity: number;
  image?: string;
  variant?: string;
}

export interface AbandonedCart {
  id: string;
  phone: string;
  fullName?: string;
  items: AbandonedCartItem[];
  totalAmountToman: number;
  status: 'active' | 'abandoned' | 'recovered' | 'reminder_sent';
  createdAt: string;
  updatedAt: string;
  lastReminderSentAt?: string;
  reminderCount?: number;
}

export const AbandonedCartsTab: React.FC = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState({
    totalCarts: 0,
    activeCount: 0,
    abandonedCount: 0,
    recoveredCount: 0,
    reminderSentCount: 0,
    totalLostRevenueToman: 0,
    recoveryRatePercent: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'abandoned' | 'reminder_sent' | 'recovered' | 'active'>('all');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);

  const fetchAbandonedCarts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/abandoned-carts');
      const data = await res.json();
      if (data.success && data.data) {
        setCarts(data.data.carts || []);
        if (data.data.stats) setStats(data.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch abandoned carts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAbandonedCarts();
  }, []);

  const handleSendReminder = async (cart: AbandonedCart) => {
    if (!cart.phone) return;
    setSendingId(cart.id);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/abandoned-carts/${cart.id}/send-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ id: cart.id, type: 'success', message: 'پیامک یادآوری با موفقیت ارسال شد.' });
        // Update local state
        setCarts(prev =>
          prev.map(c => (c.id === cart.id ? { ...c, status: 'reminder_sent', lastReminderSentAt: new Date().toISOString(), reminderCount: (c.reminderCount || 0) + 1 } : c))
        );
      } else {
        setFeedback({ id: cart.id, type: 'error', message: data.error || 'خطا در ارسال پیامک.' });
      }
    } catch (err: any) {
      setFeedback({ id: cart.id, type: 'error', message: 'خطای شبکه در ارسال پیامک.' });
    } finally {
      setSendingId(null);
    }
  };

  const filteredCarts = carts.filter(c => {
    const matchesSearch =
      (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      c.items.some(i => (i.title || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AbandonedCart['status']) => {
    switch (status) {
      case 'recovered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>🟢 بازیابی‌شده</span>
          </span>
        );
      case 'reminder_sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>📩 پیامک ارسال شد</span>
          </span>
        );
      case 'abandoned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🔴 رهاشده</span>
          </span>
        );
      case 'active':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>🟡 در حال خرید</span>
          </span>
        );
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
      if (diffMin < 1) return 'همین الان';
      if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه پیش`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${toPersianDigits(diffHours)} ساعت پیش`;
      const diffDays = Math.floor(diffHours / 24);
      return `${toPersianDigits(diffDays)} روز پیش`;
    } catch (_e) {
      return '-';
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Header & Refresh */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                مرکز بازیابی سبدهای خرید رهاشده
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                شناسایی خودکار کاربران خروج‌یافته و ارسال پیامک‌های هوشمند یادآوری با تخفیف
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchAbandonedCarts}
            disabled={isLoading}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>به‌روزرسانی لیست</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Abandoned */}
        <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-rose-50/10">
          <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
            <span>سبدهای رهاشده</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-900">
            {toPersianDigits(stats.abandonedCount + stats.reminderSentCount)}
            <span className="text-xs font-bold text-rose-500 mr-1">سبد</span>
          </div>
          <div className="text-[11px] font-bold text-rose-600">
            مجموع از {toPersianDigits(stats.totalCarts)} سبد فعال
          </div>
        </div>

        {/* Lost Revenue Risk */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-amber-50/10">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>ارزش فروش در معرض خطر</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {formatToman(stats.totalLostRevenueToman)}
          </div>
          <div className="text-[11px] font-bold text-amber-600">
            پتانسیل درآمدی قابل بازیابی
          </div>
        </div>

        {/* Recovered Rate */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-emerald-50/10">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>نرخ بازیابی موفق</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {toPersianDigits(stats.recoveryRatePercent)}٪
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            {toPersianDigits(stats.recoveredCount)} سفارش نهایی شده
          </div>
        </div>

        {/* Reminders Sent */}
        <div className="bg-white border border-blue-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-blue-50/10">
          <div className="flex items-center justify-between text-blue-700 text-xs font-bold">
            <span>پیامک‌های ارسالی</span>
            <Send className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-900">
            {toPersianDigits(stats.reminderSentCount)}
            <span className="text-xs font-bold text-blue-500 mr-1">ارسال</span>
          </div>
          <div className="text-[11px] font-bold text-blue-600">
            پیگیری‌های انجام شده
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام مشتری، شماره موبایل یا محصول..."
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { key: 'all', label: 'همه' },
            { key: 'abandoned', label: 'رهاشده' },
            { key: 'reminder_sent', label: 'پیامک ارسال شده' },
            { key: 'recovered', label: 'بازیابی‌شده' },
            { key: 'active', label: 'در حال خرید' }
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                statusFilter === f.key ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Carts Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-slate-500">در حال بارگذاری سبدهای خرید...</span>
          </div>
        ) : filteredCarts.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">هیچ سبد خریدی با این مشخصات یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">مشتری</th>
                  <th className="py-3.5 px-4">اقلام سبد خرید</th>
                  <th className="py-3.5 px-4">مبلغ کل سبد</th>
                  <th className="py-3.5 px-4">زمان آخرین فعالیت</th>
                  <th className="py-3.5 px-4">وضعیت</th>
                  <th className="py-3.5 px-4 text-center">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredCarts.map(cart => {
                  const isSending = sendingId === cart.id;
                  const itemPreview = cart.items.slice(0, 2);
                  const extraCount = cart.items.length - 2;

                  return (
                    <tr key={cart.id} className="hover:bg-slate-50/80 transition">
                      {/* Customer Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cart.fullName || 'کاربر مهمان'}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 dir-ltr">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{cart.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Items Preview */}
                      <td className="py-4 px-4">
                        <div className="space-y-1.5 max-w-xs">
                          {itemPreview.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {item.image ? (
                                <img src={item.image} alt={item.title} className="w-8 h-8 object-contain rounded-md bg-white border border-slate-200 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-slate-800 truncate">{item.title}</p>
                                <span className="text-[10px] text-slate-400">
                                  {toPersianDigits(item.quantity)} عدد {item.variant ? `(${item.variant})` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <span className="text-[10px] font-bold text-indigo-600 block">
                              + {toPersianDigits(extraCount)} قلم کالای دیگر
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-4">
                        <div className="font-black text-sm text-slate-900">
                          {formatToman(cart.totalAmountToman)}
                        </div>
                      </td>

                      {/* Time Ago */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="text-slate-800 font-bold">{getTimeAgo(cart.updatedAt)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(cart.updatedAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        {getStatusBadge(cart.status)}
                        {cart.lastReminderSentAt && (
                          <div className="text-[9px] text-slate-400 mt-1">
                            آخرین ارسال: {getTimeAgo(cart.lastReminderSentAt)}
                          </div>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-4 text-center">
                        {cart.status === 'recovered' ? (
                          <span className="text-xs font-bold text-emerald-600">سفارش ثبت شد</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendReminder(cart)}
                            disabled={isSending}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow-2xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
                          >
                            {isSending ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>ارسال پیامک یادآوری</span>
                          </button>
                        )}
                        {feedback && feedback.id === cart.id && (
                          <div className={`text-[10px] font-bold mt-1.5 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {feedback.message}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbandonedCartsTab;
