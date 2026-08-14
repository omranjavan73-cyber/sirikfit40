import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Percent, 
  Coins, 
  Calendar, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  ToggleLeft, 
  ToggleRight, 
  RefreshCw,
  Search,
  Zap,
  TrendingUp
} from 'lucide-react';
import type { DiscountCode } from '../types';
import { 
  fetchDiscountCodesFromFirestore, 
  saveDiscountCodeToFirestore, 
  deleteDiscountCodeFromFirestore 
} from '../utils/discountHelper';
import { formatToman, toPersianDigits } from '../utils/formatters';

interface AdminDiscountsProps {
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export const AdminDiscounts: React.FC<AdminDiscountsProps> = ({ showToast }) => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Code Form State
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<string>('');
  const [minOrderToman, setMinOrderToman] = useState<string>('');
  const [maxDiscountToman, setMaxDiscountToman] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [applicableSection, setApplicableSection] = useState<'ALL' | 'IRAN_WAREHOUSE' | 'OFFERS'>('ALL');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadCodes = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDiscountCodesFromFirestore();
      setDiscountCodes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('لطفاً عنوان کد تخفیف را وارد کنید.');
      return;
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue <= 0) {
      setFormError('لطفاً مقدار تخفیف معتبر وارد کنید.');
      return;
    }

    if (type === 'percent' && numericValue > 100) {
      setFormError('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰٪ باشد.');
      return;
    }

    setIsSubmitting(true);

    const newDiscount: DiscountCode = {
      id: 'dc-' + Date.now(),
      code: cleanCode,
      type,
      value: numericValue,
      minOrderToman: minOrderToman ? parseFloat(minOrderToman) : undefined,
      maxDiscountToman: maxDiscountToman ? parseFloat(maxDiscountToman) : undefined,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : undefined,
      usedCount: 0,
      expiryDate: expiryDate || undefined,
      applicableSection: applicableSection || 'ALL',
      isActive,
      createdAt: Date.now()
    };

    const success = await saveDiscountCodeToFirestore(newDiscount);
    setIsSubmitting(false);

    if (success) {
      if (showToast) showToast('کد تخفیف با موفقیت ایجاد شد.', 'success');
      // Reset form
      setCode('');
      setValue('');
      setMinOrderToman('');
      setMaxDiscountToman('');
      setUsageLimit('');
      setExpiryDate('');
      setApplicableSection('ALL');
      setIsActive(true);
      loadCodes();
    } else {
      setFormError('خطا در ذخیره کد تخفیف.');
    }
  };

  const handleToggleActive = async (discount: DiscountCode) => {
    const updated = { ...discount, isActive: !discount.isActive };
    const success = await saveDiscountCodeToFirestore(updated);
    if (success) {
      setDiscountCodes(prev => prev.map(d => d.id === discount.id ? updated : d));
      if (showToast) showToast(`کد تخفیف ${discount.code} ${updated.isActive ? 'فعال' : 'غیرفعال'} شد.`, 'success');
    }
  };

  const handleDelete = async (discount: DiscountCode) => {
    if (!window.confirm(`آیا از حذف کد تخفیف "${discount.code}" اطمینان دارید؟`)) return;

    const success = await deleteDiscountCodeFromFirestore(discount.id);
    if (success) {
      setDiscountCodes(prev => prev.filter(d => d.id !== discount.id));
      if (showToast) showToast('کد تخفیف با موفقیت حذف شد.', 'success');
    }
  };

  const filteredCodes = discountCodes.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const activeCount = discountCodes.filter(c => c.isActive).length;
  const totalUses = discountCodes.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="space-y-6 font-['Vazirmatn',sans-serif] text-right dir-rtl animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-[24px] p-6 shadow-md border border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg md:text-xl text-white">مدیریت کدهای تخفیف (Promo Codes)</h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              ساخت، غیرفعالسازی، تنظیم سقف سفارش و تعیین تاریخ انقضای کوپن‌های تخفیف
            </p>
          </div>
        </div>

        <button
          onClick={loadCodes}
          disabled={isLoading}
          className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 border border-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>بروزرسانی کدهای تخفیف</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-[20px] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">کل کدهای تعریف‌شده</span>
            <span className="font-black text-xl text-slate-900 block mt-1">{toPersianDigits(discountCodes.length)} کد</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[20px] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">کدهای فعال آماده استفاده</span>
            <span className="font-black text-xl text-emerald-600 block mt-1">{toPersianDigits(activeCount)} کد</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[20px] p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium block">مجموع دفعات استفاده‌شده</span>
            <span className="font-black text-xl text-amber-600 block mt-1">{toPersianDigits(totalUses)} بار</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FORM: CREATE NEW DISCOUNT CODE */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Plus className="w-5 h-5 text-emerald-600" />
          <h3 className="font-extrabold text-sm text-slate-900">ساخت کد تخفیف جدید</h3>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateCode} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {/* 1. Code Title */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                عنوان کد تخفیف (لاتین) <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="مثال: OFF10 یا OMRAN2026"
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-black tracking-wider text-slate-900 focus:outline-none bg-[#F8FAFC] uppercase text-left dir-ltr"
                dir="ltr"
              />
            </div>

            {/* 2. Type Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                نوع تخفیف <span className="text-rose-600">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('percent')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                    type === 'percent'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>درصدی (٪)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('fixed')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                    type === 'fixed'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>مبلغ ثابت (تومان)</span>
                </button>
              </div>
            </div>

            {/* 3. Discount Value */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                مقدار تخفیف {type === 'percent' ? '(درصد)' : '(تومان)'} <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'percent' ? 'مثال: ۱۵ (برای ۱۵٪)' : 'مثال: ۲۰۰000 (تومان)'}
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] text-left dir-ltr"
                dir="ltr"
              />
            </div>

            {/* 4. Minimum Order Criteria */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                حداقل مبلغ سفارش (تومان - اختیاری)
              </label>
              <input
                type="number"
                value={minOrderToman}
                onChange={(e) => setMinOrderToman(e.target.value)}
                placeholder="مثال: ۱۰۰۰000 (تومان)"
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] text-left dir-ltr"
                dir="ltr"
              />
            </div>

            {/* 5. Max Discount Ceiling (for percent) */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                سقف تخفیف درصدی (تومان - اختیاری)
              </label>
              <input
                type="number"
                value={maxDiscountToman}
                onChange={(e) => setMaxDiscountToman(e.target.value)}
                placeholder="مثال: ۵۰۰000 (تومان)"
                disabled={type === 'fixed'}
                className={`w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none text-left dir-ltr ${
                  type === 'fixed' ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-[#F8FAFC]'
                }`}
                dir="ltr"
              />
            </div>

            {/* 6. Usage Limit */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                سقف تعداد استفاده (اختیاری)
              </label>
              <input
                type="number"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="مثال: ۱۰۰ (نفر اول)"
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] text-left dir-ltr"
                dir="ltr"
              />
            </div>

            {/* 7. Expiry Date Picker */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                تاریخ انقضا (اختیاری)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full p-2 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] text-center"
              />
            </div>

            {/* 8. Applicable Scope Selector */}
            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1">
                بخش مجاز برای تخفیف (Scope)
              </label>
              <select
                value={applicableSection}
                onChange={(e) => setApplicableSection(e.target.value as any)}
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC]"
              >
                <option value="ALL">همه بخش‌ها (عمومی)</option>
                <option value="IRAN_WAREHOUSE">فقط انبار ایران</option>
                <option value="OFFERS">فقط پیشنهادها</option>
              </select>
            </div>

            {/* 8. Active Switch */}
            <div className="flex items-center justify-between sm:justify-start gap-3 pt-6">
              <span className="text-xs font-extrabold text-slate-900">وضعیت اولیه:</span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isActive ? <ToggleRight className="w-5 h-5 text-emerald-600" /> : <ToggleLeft className="w-5 h-5" />}
                <span>{isActive ? 'فعال' : 'غیرفعال'}</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-slate-900 hover:bg-black text-white font-black text-xs py-3 px-6 rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 border-none"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmitting ? 'در حال ثبت...' : 'ثبت و ذخیره کد تخفیف جدید'}</span>
          </button>
        </form>
      </div>

      {/* TABLE: DISCOUNT CODES LIST */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-slate-800" />
            <h3 className="font-extrabold text-sm text-slate-900">جدول کدهای تخفیف موجود</h3>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full dir-ltr">
              {toPersianDigits(filteredCodes.length)} کد
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کد تخفیف..."
              className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-900 bg-[#F8FAFC]"
            />
          </div>
        </div>

        {filteredCodes.length === 0 ? (
          <div className="text-center py-10 text-slate-400 space-y-2">
            <Tag className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
            <p className="text-xs font-bold">هیچ کد تخفیفی یافت نشد.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] text-slate-600 font-extrabold border-b border-slate-200">
                  <th className="p-3 rounded-r-xl">عنوان کد</th>
                  <th className="p-3">نوع و میزان تخفیف</th>
                  <th className="p-3">حداقل سفارش / سقف</th>
                  <th className="p-3">دفعات استفاده</th>
                  <th className="p-3">تاریخ انقضا</th>
                  <th className="p-3">وضعیت</th>
                  <th className="p-3 rounded-l-xl text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCodes.map((d) => {
                  const isExpired = d.expiryDate && new Date().toISOString().split('T')[0] > d.expiryDate.split('T')[0];
                  const isLimitReached = d.usageLimit && d.usedCount >= d.usageLimit;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      {/* Code Badge */}
                      <td className="p-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-black text-xs text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg dir-ltr inline-block tracking-wider">
                            {d.code}
                          </span>
                          {d.applicableSection === 'IRAN_WAREHOUSE' && (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                              انبار ایران
                            </span>
                          )}
                          {d.applicableSection === 'OFFERS' && (
                            <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                              پیشنهادها
                            </span>
                          )}
                          {(!d.applicableSection || d.applicableSection === 'ALL') && (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              همه بخش‌ها
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Value */}
                      <td className="p-3 font-bold text-slate-900">
                        {d.type === 'percent' ? (
                          <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-md dir-ltr inline-block">
                            ٪{toPersianDigits(d.value)} تخفیف
                          </span>
                        ) : (
                          <span className="text-slate-900 font-black">
                            {formatToman(d.value)}
                          </span>
                        )}
                      </td>

                      {/* Criteria */}
                      <td className="p-3 text-slate-600">
                        <div>
                          {d.minOrderToman ? `حداقل: ${formatToman(d.minOrderToman)}` : 'بدون حداقل'}
                        </div>
                        {d.maxDiscountToman && (
                          <div className="text-[10px] text-slate-400">
                            سقف: {formatToman(d.maxDiscountToman)}
                          </div>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                          <span>{toPersianDigits(d.usedCount)}</span>
                          <span className="text-slate-400">/</span>
                          <span>{d.usageLimit ? toPersianDigits(d.usageLimit) : '∞'}</span>
                        </div>
                        {d.usageLimit && (
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full ${isLimitReached ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (d.usedCount / d.usageLimit) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="p-3">
                        {d.expiryDate ? (
                          <span className={`font-bold ${isExpired ? 'text-rose-600 line-through' : 'text-slate-700'}`}>
                            {d.expiryDate}
                          </span>
                        ) : (
                          <span className="text-slate-400">نامحدود</span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(d)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                            d.isActive && !isExpired && !isLimitReached
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {d.isActive && !isExpired && !isLimitReached ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>فعال</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-rose-600" />
                              <span>{isExpired ? 'منقضی' : isLimitReached ? 'تکمیل' : 'غیرفعال'}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                          title="حذف کد تخفیف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
