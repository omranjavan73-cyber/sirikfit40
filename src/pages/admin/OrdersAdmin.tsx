import React, { useState } from 'react';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Target,
  SlidersHorizontal,
  ShoppingCart,
  Search,
  Filter,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { formatToman, toPersianDigits } from '../../utils/formatters';
import type { Order } from '../../types';
import AbandonedCartsTab from '../../components/admin/AbandonedCartsTab';

interface OrdersAdminProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, status: any) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

export const OrdersAdmin: React.FC<OrdersAdminProps> = ({
  orders = [],
  onUpdateOrderStatus,
  onDeleteOrder
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'abandoned' | 'automation'>('orders');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Compute Core Sales KPIs
  const totalOrdersCount = orders.length;
  const paidOrders = orders.filter(o => o.paymentStatus === 'PAID' || o.shippingStatus === 'COMPLETED' || o.shippingStatus === 'DELIVERED');
  const totalPaidOrdersCount = paidOrders.length;
  const totalRevenueToman = paidOrders.reduce((sum, o) => sum + (o.calculatedToman || o.totalAmountToman || 0), 0);
  const totalItemsSoldCount = paidOrders.reduce((sum, o) => {
    const items = Array.isArray(o.items) ? o.items : [];
    return sum + items.reduce((iSum: number, i: any) => iSum + Math.max(1, Number(i.quantity || 1)), 0);
  }, 0);
  const aovToman = totalPaidOrdersCount > 0 ? Math.round(totalRevenueToman / totalPaidOrdersCount) : 0;

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.phoneNumber || '').includes(searchTerm) ||
      (o.productTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'paid' && (o.paymentStatus === 'PAID' || o.shippingStatus === 'COMPLETED')) ||
      (statusFilter === 'pending' && o.paymentStatus !== 'PAID');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif]">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                مدیریت جامع سفارشات و سبدهای رهاشده
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                نظارت بر زنجیره تامین امارات، ارزش سبدها و پیگیری اتوماتیک تسویه‌ها
              </p>
            </div>
          </div>

          {/* Sub-Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>لیست سفارشات</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black">
                {toPersianDigits(orders.length)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('abandoned')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'abandoned' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>سبدهای رهاشده</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 CORE KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Revenue */}
        <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-emerald-50/10">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>کل فروش نهایی</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950">
            {formatToman(totalRevenueToman)}
          </div>
          <div className="text-[11px] font-bold text-emerald-600">
            درآمد حاصل از {toPersianDigits(totalPaidOrdersCount)} سفارش
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>تعداد سفارشات</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {toPersianDigits(totalOrdersCount)}
            <span className="text-xs font-bold text-slate-400 mr-1">سفارش</span>
          </div>
          <div className="text-[11px] font-bold text-indigo-600">
            {toPersianDigits(totalPaidOrdersCount)} سفارش تسویه شده
          </div>
        </div>

        {/* Items Sold */}
        <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-amber-50/10">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>تعداد کل اقلام فروخته‌شده</span>
            <PackageCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950">
            {toPersianDigits(totalItemsSoldCount)}
            <span className="text-xs font-bold text-amber-600 mr-1">عدد</span>
          </div>
          <div className="text-[11px] font-bold text-amber-700">
            مجموع کالاهای تحویلی
          </div>
        </div>

        {/* AOV Card */}
        <div className="bg-white border border-indigo-200/80 rounded-2xl p-4 shadow-2xs space-y-1 bg-indigo-50/10">
          <div className="flex items-center justify-between text-indigo-700 text-xs font-bold">
            <span>میانگین ارزش سفارش (AOV)</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-950">
            {formatToman(aovToman)}
          </div>
          <div className="text-[11px] font-bold text-indigo-600">
            ارزش میانگین هر خرید
          </div>
        </div>
      </div>

      {/* RENDER CONTENT BASED ON TAB */}
      {activeTab === 'abandoned' ? (
        <AbandonedCartsTab />
      ) : (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="جستجوی شماره سفارش، نام یا شماره تماس..."
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه سفارشات
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'paid' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                تسویه شده
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                در انتظار پرداخت
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xs overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-bold">هیچ سفارشی با این مشخصات یافت نشد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">شناسه</th>
                      <th className="py-3.5 px-4">مشتری</th>
                      <th className="py-3.5 px-4">محصولات</th>
                      <th className="py-3.5 px-4">مبلغ کل</th>
                      <th className="py-3.5 px-4">وضعیت پرداخت</th>
                      <th className="py-3.5 px-4">وضعیت ارسال</th>
                      <th className="py-3.5 px-4">تاریخ ثبت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4 font-mono font-bold text-slate-900">{order.id}</td>
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-slate-900">{order.customerName}</div>
                          <div className="font-mono text-[11px] text-slate-400 dir-ltr">{order.phoneNumber}</div>
                        </td>
                        <td className="py-4 px-4 max-w-xs truncate">{order.productTitle}</td>
                        <td className="py-4 px-4 font-black text-slate-900">
                          {formatToman(order.calculatedToman || order.totalAmountToman || 0)}
                        </td>
                        <td className="py-4 px-4">
                          {order.paymentStatus === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> پرداخت شده
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> در انتظار
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-[11px] font-bold text-slate-600">
                          {order.shippingStatus || 'ثبت شده'}
                        </td>
                        <td className="py-4 px-4 text-[11px] text-slate-400 font-mono">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fa-IR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersAdmin;
