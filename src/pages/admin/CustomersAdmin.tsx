import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Award,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Phone,
  Calendar,
  Tag,
  Star,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShoppingCart
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../utils/formatters';
import { AbandonedCartsTab } from '../../components/admin/AbandonedCartsTab';

export interface CustomerLtvSummary {
  phone: string;
  fullName: string;
  totalSpendToman: number;
  orderCount: number;
  averageOrderValueToman: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  isVip: boolean;
  preferredBrands: string[];
  preferredCategories: string[];
}

export const CustomersAdmin: React.FC<{ initialTab?: 'ltv' | 'abandonedCarts' }> = ({ initialTab = 'ltv' }) => {
  const [activeTab, setActiveTab] = useState<'ltv' | 'abandonedCarts'>(initialTab);
  const [customers, setCustomers] = useState<CustomerLtvSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [vipOnly, setVipOnly] = useState<boolean>(false);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/analytics/overview');
      const json = await res.json();
      if (json.success && json.data?.topCustomers) {
        setCustomers(json.data.topCustomers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ltv') {
      fetchCustomers();
    }
  }, [activeTab]);

  const totalUniqueCustomers = customers.length;
  const vipCustomersCount = customers.filter(c => c.isVip).length;
  const totalCustomerSpend = customers.reduce((sum, c) => sum + c.totalSpendToman, 0);
  const averageCustomerLtv = totalUniqueCustomers > 0 ? Math.round(totalCustomerSpend / totalUniqueCustomers) : 0;

  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      (c.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      (c.preferredBrands || []).some(b => b.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesVip = !vipOnly || c.isVip;
    return matchesSearch && matchesVip;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Sub-tab Switcher Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                مدیریت جامع مشتریان
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                هوش مشتریان، تحلیل ارزش چرخه عمر (LTV) و بازیابی سبدهای خرید رهاشده
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ltv')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'ltv'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>هوش مشتریان (LTV)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('abandonedCarts')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'abandonedCarts'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>سبدهای رهاشده</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'abandonedCarts' ? (
        <AbandonedCartsTab />
      ) : (
        <>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={fetchCustomers}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>به‌روزرسانی اطلاعات LTV</span>
            </button>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Customers */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>کل خریداران یکتا</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {toPersianDigits(totalUniqueCustomers)}
            <span className="text-xs font-bold text-slate-400 mr-1">نفر</span>
          </div>
          <div className="text-[11px] font-bold text-indigo-600">
            پایگاه مشتریان فعال
          </div>
        </div>

        {/* VIP Customers */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-amber-50/10">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>مشتریان VIP وفادار</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-900">
            {toPersianDigits(vipCustomersCount)}
            <span className="text-xs font-bold text-amber-500 mr-1">نفر</span>
          </div>
          <div className="text-[11px] font-bold text-amber-600">
            خرید بالای ۱۰ م.ت یا ۳+ سفارش
          </div>
        </div>

        {/* Average Customer Value */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-emerald-50/10">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>میانگین ارزش هر مشتری (LTV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-900">
            {formatToman(averageCustomerLtv)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            متوسط کل خرید در طول زمان
          </div>
        </div>

        {/* Total Spend Aggregate */}
        <div className="bg-white border border-purple-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-purple-50/10">
          <div className="flex items-center justify-between text-purple-700 text-xs font-bold">
            <span>مجموع ارزش کل مشتریان</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-900">
            {formatToman(totalCustomerSpend)}
          </div>
          <div className="text-[11px] font-bold text-purple-600">
            سرمایه در گردش ثبت شده
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام مشتری، شماره موبایل، برند..."
            className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => setVipOnly(!vipOnly)}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer border ${
            vipOnly
              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>فقط مشتریان VIP</span>
          {vipOnly && <CheckCircle2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-purple-600 animate-spin" />
            <span className="text-xs font-bold text-slate-500">در حال بارگذاری اطلاعات مشتریان...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">مشتری با این مشخصات یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">مشتری</th>
                  <th className="py-3.5 px-4">وضعیت مشتری</th>
                  <th className="py-3.5 px-4">مجموع خرید (LTV)</th>
                  <th className="py-3.5 px-4">تعداد سفارشات</th>
                  <th className="py-3.5 px-4">میانگین هر سفارش</th>
                  <th className="py-3.5 px-4">برندهای مورد علاقه</th>
                  <th className="py-3.5 px-4">آخرین خرید</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredCustomers.map((cust, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <span>{cust.fullName}</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 flex items-center gap-1 dir-ltr">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* VIP Badge */}
                    <td className="py-4 px-4">
                      {cust.isVip ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>مشتری VIP</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">عادی</span>
                      )}
                    </td>

                    {/* Total Spend */}
                    <td className="py-4 px-4">
                      <div className="font-black text-sm text-slate-900">
                        {formatToman(cust.totalSpendToman)}
                      </div>
                    </td>

                    {/* Order Count */}
                    <td className="py-4 px-4">
                      <span className="font-black text-slate-900">
                        {toPersianDigits(cust.orderCount)}
                        <span className="text-[10px] text-slate-400 mr-1">سفارش</span>
                      </span>
                    </td>

                    {/* AOV */}
                    <td className="py-4 px-4">
                      <span className="font-bold text-indigo-700">
                        {formatToman(cust.averageOrderValueToman)}
                      </span>
                    </td>

                    {/* Preferred Brands */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(cust.preferredBrands || []).length === 0 ? (
                          <span className="text-slate-400 text-[11px]">-</span>
                        ) : (
                          cust.preferredBrands.map((b, bIdx) => (
                            <span key={bIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {b}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Last Order Date */}
                    <td className="py-4 px-4 text-slate-600">
                      <div className="flex items-center gap-1 text-[11px] font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(cust.lastOrderDate)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default CustomersAdmin;
