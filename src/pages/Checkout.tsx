import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { toPersianDigits, formatToman, isValidIranianMobile } from '../utils/formatters';
import { saveOrder, normalizeCustomerPhone } from '../services/orderService';
import type { CartItem, Order, User } from '../types';

export interface CheckoutProps {
  items: CartItem[];
  currentUser?: User | null;
  totalPriceToman: number;
  onOrderCreated?: (order: Order) => void;
  onBackToCart?: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

/**
 * Dedicated Checkout Page:
 * Normalizes customer phone numbers to 11-digit format (09121234567)
 * and binds orders to the customerPhone field in Firestore 'orders' collection.
 */
export const Checkout: React.FC<CheckoutProps> = ({
  items,
  currentUser,
  totalPriceToman,
  onOrderCreated,
  onBackToCart,
  showToast
}) => {
  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد نمایید.');
      return;
    }
    if (!isValidIranianMobile(phoneNumber)) {
      setErrorMessage('لطفاً شماره موبایل معتبر ۱۱ رقمی (مثلاً ۰۹۱۲۱۲۳۴۵۶۷) وارد نمایید.');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setErrorMessage('لطفاً آدرس دقیق پستی تحویل در ایران را وارد نمایید.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const normalizedPhone = normalizeCustomerPhone(phoneNumber);
      const trackingCode = `SF-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      const mappedItems = items.map((item, idx) => ({
        id: item.id || `item-${idx}-${Date.now()}`,
        title: item.title,
        variant: item.selectedOption || 'اصلی',
        quantity: item.quantity || 1,
        priceToman: item.calculatedToman || Math.round(totalPriceToman / items.length),
        priceAED: item.priceAed || 0,
        imageUrl: item.image || '',
        sourceUrl: item.url || ''
      }));

      const orderPayload: Partial<Order> = {
        id: trackingCode,
        orderId: trackingCode,
        orderNumber: trackingCode,
        trackingCode,
        userId: currentUser?.id,
        customerName: customerName.trim(),
        phoneNumber: normalizedPhone,
        customerPhone: normalizedPhone,
        deliveryAddress: address.trim(),
        postalCode: postalCode.trim(),
        notes: notes.trim(),
        customer: {
          fullName: customerName.trim(),
          phone: normalizedPhone,
          postalCode: postalCode.trim(),
          fullAddress: address.trim(),
          notes: notes.trim()
        },
        productTitle: items.map(i => `${toPersianDigits(i.quantity)}× ${i.title}`).join(' | '),
        productUrl: items[0]?.url || '',
        productImage: items[0]?.image || '',
        storeName: items[0]?.storeName || 'دبی',
        priceAed: items.reduce((sum, i) => sum + (i.priceAed || 0) * (i.quantity || 1), 0),
        weightKg: items.reduce((sum, i) => sum + (i.weightKg || 0.5) * (i.quantity || 1), 0),
        calculatedToman: totalPriceToman,
        totalAmountToman: totalPriceToman,
        totalPrice: totalPriceToman,
        items: mappedItems,
        paymentStatus: 'PENDING_PAYMENT',
        orderStatus: 'PENDING_UAE_PURCHASE',
        shippingStatus: 'PENDING_UAE_PURCHASE',
        gateway: 'ZIBAL',
        paymentGateway: 'ZIBAL',
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const createdId = await saveOrder(orderPayload);
      const createdOrder: Order = { ...orderPayload, id: createdId } as Order;

      if (showToast) showToast('س his سفارش با موفقیت ثبت شد و به حساب شما متصل گردید.', 'success');
      if (onOrderCreated) onOrderCreated(createdOrder);
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ثبت سفارش.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {onBackToCart && (
        <button
          type="button"
          onClick={onBackToCart}
          className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 mb-4 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به سبد خرید</span>
        </button>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-slate-900 dark:text-white" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              تکمیل مشخصات تحویل و پرداخت
            </h2>
          </div>
          <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full">
            اتصال خودکار به حساب کاربری
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Order Items Review */}
        <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-slate-500 block">اقلام سفارش ({toPersianDigits(items.length)} قلم):</span>
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 dark:border-zinc-700/40 last:border-0">
              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[280px]">
                {toPersianDigits(it.quantity)} × {it.title} {it.selectedOption ? `(${it.selectedOption})` : ''}
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                {formatToman(it.calculatedToman || 0)}
              </span>
            </div>
          ))}
          <div className="pt-2 flex items-center justify-between font-black text-sm text-slate-900 dark:text-white border-t border-slate-200 dark:border-zinc-700">
            <span>مبلغ نهایی سفارش:</span>
            <span className="text-[#E11D48] text-base">{formatToman(totalPriceToman)}</span>
          </div>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-white mb-1.5">
              نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: محمد امینی"
              className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-900 dark:text-white mb-1.5">
                شماره موبایل تحویل‌گیرنده (۱۱ رقم) <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09121234567"
                maxLength={11}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 font-mono text-left dir-ltr"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                سفارش به صورت خودکار به پروفایل این شماره موبایل متصل می‌شود
              </span>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-900 dark:text-white mb-1.5">
                کد پستی ۱۰ رقمی (اختیاری)
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="1234567890"
                maxLength={10}
                className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 font-mono text-left dir-ltr"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-white mb-1.5">
              آدرس دقیق پستی در ایران <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="استان، شهر، خیابان اصلی، کوچه، پلاک، زنگ یا واحد..."
              className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-900 dark:text-white mb-1.5">
              توضیحات و نکات سفارش (اختیاری)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="نکات هماهنگی پیک، زمان تحویل و..."
              className="w-full p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-950 hover:bg-black text-white text-sm font-black rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>{isSubmitting ? 'در حال ثبت سفارش...' : 'تایید نهایی و پرداخت سفارش ←'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
