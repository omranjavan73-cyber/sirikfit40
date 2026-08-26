import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  PackageCheck,
  Target,
  PieChart,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Store,
  Users,
  Award
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../utils/formatters';

interface TicketBracket {
  key: 'small' | 'medium' | 'large';
  label: string;
  minToman: number;
  maxToman?: number;
  orderCount: number;
  totalRevenueToman: number;
  percentageCount: number;
  percentageRevenue: number;
}

interface AnalyticsData {
  totalRevenueToman: number;
  totalOrdersCount: number;
  totalPaidOrdersCount: number;
  totalItemsSoldCount: number;
  averageOrderValueToman: number;
  ticketBrackets: TicketBracket[];
  vipCustomersCount: number;
  storeBreakdown: Array<{
    storeName: string;
    orderCount: number;
    revenueToman: number;
    percentageRevenue: number;
  }>;
  recentTrends: {
    dailyRevenue: Array<{ date: string; revenueToman: number; orderCount: number }>;
  };
}

export const AnalyticsAdmin: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeframeDays, setTimeframeDays] = useState<number | undefined>(undefined);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const url = timeframeDays ? `/api/admin/analytics/overview?days=${timeframeDays}` : '/api/admin/analytics/overview';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframeDays]);

  const brackets = data?.ticketBrackets || [
    { key: 'small', label: 'خریدهای خرد (< ۱,۰۰۰,۰۰۰ تومان)', minToman: 0, maxToman: 1000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 },
    { key: 'medium', label: 'خریدهای متوسط (۱,۰۰۰,۰۰۰ تا ۳,۰۰۰,۰۰۰ تومان)', minToman: 1000000, maxToman: 3000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 },
    { key: 'large', label: 'خریدهای درشت (> ۳,۰۰۰,۰۰۰ تومان)', minToman: 3000000, orderCount: 0, totalRevenueToman: 0, percentageCount: 0, percentageRevenue: 0 }
  ];

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Header & Timeframe Selector */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                داشبورد تحلیل هوشمند فروش و رفتار خرید
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                ارزیابی شاخص AOV، توزیع سبد خرید، تفکیک منابع و سلامت زنجیره درآمدی
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { label: 'همه زمان‌ها', val: undefined },
                { label: '۳۰ روز اخیر', val: 30 },
                { label: '۷ روز اخیر', val: 7 },
                { label: 'امروز', val: 1 }
              ].map(t => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTimeframeDays(t.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    timeframeDays === t.val ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              title="به‌روزرسانی آمار"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 4 CORE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: کل فروش */}
        <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200/80 rounded-3xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-black">
            <span>کل فروش بازه زمانی</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatToman(data?.totalRevenueToman || 0)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>درآمد نهایی تسویه شده</span>
          </div>
        </div>

        {/* KPI 2: تعداد سفارش‌ها */}
        <div className="bg-gradient-to-br from-blue-50/50 to-white border border-blue-200/80 rounded-3xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-blue-800 text-xs font-black">
            <span>تعداد کل سفارش‌ها</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {toPersianDigits(data?.totalPaidOrdersCount || 0)}
            <span className="text-xs font-bold text-slate-400 mr-1.5">سفارش موفق</span>
          </div>
          <div className="text-[11px] font-bold text-blue-600">
            از مجموع {toPersianDigits(data?.totalOrdersCount || 0)} سفارش ثبت شده
          </div>
        </div>

        {/* KPI 3: تعداد اقلام فروخته‌شده */}
        <div className="bg-gradient-to-br from-amber-50/50 to-white border border-amber-200/80 rounded-3xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-800 text-xs font-black">
            <span>تعداد کل اقلام فروخته‌شده</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {toPersianDigits(data?.totalItemsSoldCount || 0)}
            <span className="text-xs font-bold text-slate-400 mr-1.5">قلم کالا</span>
          </div>
          <div className="text-[11px] font-bold text-amber-700">
            میانگین {toPersianDigits(((data?.totalItemsSoldCount || 0) / Math.max(1, data?.totalPaidOrdersCount || 1)).toFixed(1))} کالا در هر سفارش
          </div>
        </div>

        {/* KPI 4: میانگین ارزش سفارش (AOV) */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-white border border-indigo-200/80 rounded-3xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-indigo-800 text-xs font-black">
            <span>میانگین ارزش سفارش (AOV)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatToman(data?.averageOrderValueToman || 0)}
          </div>
          <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>متوسط مبلغ خرید هر مشتری</span>
          </div>
        </div>
      </div>

      {/* TICKET SIZE SEGMENTATION WIDGET */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                بخش‌بندی ارزش سفارشات (Ticket Size Distribution)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تحلیل میزان تمرکز درآمد و رفتار خرید مشتریان در ۳ بازه مبلغی
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {toPersianDigits(data?.totalPaidOrdersCount || 0)} سفارش مورد بررسی
          </span>
        </div>

        {/* Unified Segmentation Stacked Bar */}
        <div className="space-y-2">
          <div className="flex h-5 w-full rounded-xl overflow-hidden bg-slate-100 p-0.5 gap-0.5">
            {brackets.map(b => {
              const widthPct = Math.max(0, b.percentageCount);
              const color =
                b.key === 'small' ? 'bg-sky-500' :
                b.key === 'medium' ? 'bg-indigo-600' :
                'bg-emerald-600';

              return widthPct > 0 ? (
                <div
                  key={b.key}
                  style={{ width: `${widthPct}%` }}
                  className={`${color} h-full first:rounded-r-lg last:rounded-l-lg transition-all duration-500 hover:opacity-90 relative group`}
                  title={`${b.label}: ${toPersianDigits(b.orderCount)} سفارش (${toPersianDigits(widthPct)}٪)`}
                />
              ) : null;
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
            <span>۰ تومان</span>
            <span>۱,۰۰۰,۰۰۰ تومان</span>
            <span>۳,۰۰۰,۰۰۰ تومان</span>
            <span>بیش از ۳,۰۰۰,۰۰۰ تومان</span>
          </div>
        </div>

        {/* 3 Ticket Brackets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {brackets.map(b => {
            const badgeColor =
              b.key === 'small' ? 'bg-sky-100 text-sky-800 border-sky-200' :
              b.key === 'medium' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
              'bg-emerald-100 text-emerald-800 border-emerald-200';

            const barColor =
              b.key === 'small' ? 'bg-sky-500' :
              b.key === 'medium' ? 'bg-indigo-600' :
              'bg-emerald-600';

            return (
              <div key={b.key} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${badgeColor}`}>
                    {b.label}
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    {toPersianDigits(b.percentageCount)}٪
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">تعداد سفارش:</span>
                    <span className="font-extrabold text-slate-900">{toPersianDigits(b.orderCount)} عدد</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">مجموع فروش بازه:</span>
                    <span className="font-black text-slate-900">{formatToman(b.totalRevenueToman)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">سهم از کل درآمد:</span>
                    <span className="font-bold text-emerald-600">{toPersianDigits(b.percentageRevenue)}٪</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className={`${barColor} h-full rounded-full transition-all duration-500`} style={{ width: `${b.percentageCount}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RETAILER BREAKDOWN & VIP METRICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retailer / Store Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                تفکیک فروش بر اساس تامین‌کننده (امارات)
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {(data?.storeBreakdown || []).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">اطلاعاتی ثبت نشده است.</p>
            ) : (
              data?.storeBreakdown.map((s, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-900">{s.storeName}</span>
                    <span className="font-black text-slate-900">{formatToman(s.revenueToman)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{toPersianDigits(s.orderCount)} سفارش</span>
                    <span>{toPersianDigits(s.percentageRevenue)}٪ کل فروش</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-teal-600 h-full rounded-full" style={{ width: `${s.percentageRevenue}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Base Overview & VIP Badge Counter */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                سلامت پایگاه مشتریان و خریداران وفادار
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>{toPersianDigits(data?.vipCustomersCount || 0)} مشتری VIP</span>
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-purple-900">
                <span>معیار شناسایی مشتری VIP</span>
                <span>خرید بالای ۱۰ میلیون تومان یا ۳+ سفارش</span>
              </div>
              <p className="text-[11px] text-purple-700 font-medium">
                مشتریان VIP هسته اصلی درآمدزایی و سودآوری فروشگاه هستند و اولویت اختصاص تخفیف‌های ویژه و پشتیبانی سریع را دارند.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-600 block">نرخ سفارش مجدد خریداران</span>
                <span className="text-[11px] text-slate-400">تکرار خرید توسط مشتریان قبلی</span>
              </div>
              <span className="text-lg font-black text-slate-900">
                {toPersianDigits((((data?.vipCustomersCount || 0) / Math.max(1, data?.totalPaidOrdersCount || 1)) * 100).toFixed(0))}٪
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsAdmin;
