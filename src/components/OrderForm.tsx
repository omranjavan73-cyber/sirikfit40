import React, { useState, useEffect } from 'react';
import type { FinancialSettings, Order, User } from '../types';
import { formatToman, formatAed, toPersianDigits, getEffectiveAedRate } from '../utils/formatters';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { saveOrderToFirestore } from '../firebase';

interface OrderFormProps {
  product: {
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
    brand?: string;
    badge?: string;
    discountPercent?: number;
    originalPriceAed?: number;
    servings?: string;
    origin?: string;
  };
  settings: FinancialSettings;
  currentUser?: User | null;
  onOrderCreated: (order: Order) => void;
  onCancel?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  product,
  settings,
  currentUser,
  onOrderCreated,
  onCancel
}) => {
  const [qty, setQty] = useState(1);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const [customerName, setCustomerName] = useState(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !customerName) setCustomerName(currentUser.name);
      if (currentUser.phoneNumber && !phoneNumber) setPhoneNumber(currentUser.phoneNumber);
    }
  }, [currentUser]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const effectiveRate = getEffectiveAedRate(settings);
  const pricingResult = calculateOrderPricing(
    product.priceAed * qty,
    qty,
    effectiveRate
  );

  const totalToman = product.calculatedTomanOverride
    ? product.calculatedTomanOverride * qty
    : pricingResult.finalTotalToman;

  const singleToman = product.calculatedTomanOverride
    ? product.calculatedTomanOverride
    : Math.round(pricingResult.finalTotalToman / Math.max(1, qty));

  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const minOrderToman = settings.minOrderAmountToman || 0;
    if (minOrderToman > 0 && totalToman < minOrderToman) {
      setErrorMessage(`حداقل مبلغ سفارش برای ارسال و ثبت نهایی، ${toPersianDigits(formatToman(minOrderToman))} می‌باشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.`);
      return;
    }

    const minOrderLimitAed = settings.minOrderAed || 0;
    if (minOrderToman === 0 && minOrderLimitAed > 0 && (product.priceAed * qty) < minOrderLimitAed) {
      setErrorMessage(`حداقل مبلغ سفارش برای ارسال، ${toPersianDigits(minOrderLimitAed)} درهم می‌باشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('لطفاً نام و نام خانوادگی خود را وارد کنید.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setErrorMessage('لطفاً شماره تماس معتبر وارد کنید.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('لطفاً آدرس دقیق تحویل را وارد کنید.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const trackingCode = `SF-${Date.now().toString().slice(-6)}`;
      const orderPayload: Omit<Order, 'id'> = {
        userId: currentUser?.id,
        trackingCode,
        customerName,
        phoneNumber,
        deliveryAddress,
        notes,
        productTitle: `${qty}× ${product.title}`,
        productUrl: product.url,
        productImage: product.image,
        storeName: product.storeName,
        priceAed: product.priceAed * qty,
        weightKg: (product.weightKg || 0.5) * qty,
        aedRate: effectiveRate,
        cargoRatePerKg: settings.cargoRatePerKg || 35,
        profitMargin: settings.profitMargin || 15,
        calculatedToman: totalToman,
        createdAt: new Date().toISOString(),
        paymentStatus: 'PENDING',
        shippingStatus: 'PENDING_BUY'
      };

      const createdOrderId = await saveOrderToFirestore(orderPayload);
      const createdOrder: Order = { ...orderPayload, id: createdOrderId };
      onOrderCreated(createdOrder);
    } catch (e: any) {
      console.error('Error submitting order:', e);
      setErrorMessage(e?.message || 'خطا در ثبت سفارش.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper badge text for product visual box
  const getProductBadge = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('omega') || t.includes('امگا')) return 'Ω3';
    if (t.includes('c4')) return 'C4';
    if (t.includes('gnc')) return 'GNC';
    if (t.includes('iso')) return 'ISO';
    return 'ON';
  };

  const badgeText = getProductBadge(product.title);

  return (
    <div className="space-y-4 font-['Vazirmatn',sans-serif] animate-fade-in pb-12">
      {/* Top Header Row with Back Button */}
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <h3 className="font-extrabold text-sm text-neutral-900">مشخصات کالا و خرید</h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-900 transition cursor-pointer shadow-2xs"
            title="بازگشت"
          >
            ←
          </button>
        )}
      </div>

      {/* Main Product Card (Exact Match to Screenshot) */}
      <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-2xs">
        {/* Top Soft Blue Box with Centered Pastel Badge Icon */}
        <div className="h-44 bg-gradient-to-b from-[#EFF6FF] via-[#F8FAFC] to-white flex items-center justify-center p-4">
          <div className="w-24 h-24 rounded-2xl bg-[#FEF3C7] text-neutral-900 font-black text-2xl flex items-center justify-center shadow-xs">
            {badgeText}
          </div>
        </div>

        {/* Details Section */}
        <div className="p-4 pt-1 space-y-3.5">
          {/* Discount & Brand Pills (Aligned Right) */}
          <div className="flex items-center justify-end gap-2">
            {(product.discountPercent && product.discountPercent > 0) ? (
              <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-extrabold px-2.5 py-0.5 rounded-md dir-ltr">
                -{product.discountPercent}٪
              </span>
            ) : product.badge ? (
              <span className="bg-[#DCFCE7] text-[#16A34A] text-[11px] font-extrabold px-2.5 py-0.5 rounded-md dir-rtl">
                {product.badge}
              </span>
            ) : null}
            <span className="bg-neutral-100 text-neutral-800 text-[11px] font-extrabold px-3 py-0.5 rounded-md">
              {product.brand || product.storeName || 'GNC'}
            </span>
          </div>

          {/* Product Title */}
          <h2 className="font-black text-base sm:text-lg text-neutral-900 text-center leading-snug dir-rtl">
            {product.title}
          </h2>

          {/* Price Cards Grid (Right: AED Price, Left: Toman Price) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {/* Right Box: AED Price */}
            <div className="bg-[#F8FAFC] rounded-2xl p-3 text-center border border-neutral-100/80">
              <span className="text-[10px] text-neutral-400 font-medium block mb-0.5">قیمت درهم</span>
              <span className="font-extrabold text-sm sm:text-base text-neutral-900 block font-mono">
                {product.priceAed > 0 ? formatAed(product.priceAed) : '—'}
              </span>
              <span className="text-[10px] text-neutral-400 line-through block font-mono">
                {product.originalPriceAed ? `${product.originalPriceAed} درهم` : `${Math.round((product.priceAed || 95) * 1.2)} درهم`}
              </span>
            </div>

            {/* Left Box: Toman Price */}
            <div className="bg-[#F8FAFC] rounded-2xl p-3 text-center border border-neutral-100/80">
              <span className="text-[10px] text-neutral-400 font-medium block mb-0.5">تحویل ایران</span>
              <span className="font-black text-sm sm:text-base text-[#16A34A] block">
                {formatToman(singleToman)}
              </span>
            </div>
          </div>

          {/* Product Specifications Section */}
          <div className="pt-3 border-t border-neutral-100">
            <h4 className="font-extrabold text-xs text-neutral-900 mb-2.5">مشخصات کالا</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F8FAFC] p-3 rounded-xl flex justify-between items-center border border-neutral-100/60">
                <span className="text-neutral-400 text-[11px] font-medium">وزن</span>
                <span className="font-extrabold text-neutral-900">{product.weightKg || 0.18} کیلوگرم</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-xl flex justify-between items-center border border-neutral-100/60">
                <span className="text-neutral-400 text-[11px] font-medium">حجم / سروینگ</span>
                <span className="font-extrabold text-neutral-900">{product.servings || '۶۰ عدد'}</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-xl flex justify-between items-center border border-neutral-100/60">
                <span className="text-neutral-400 text-[11px] font-medium">فروشگاه</span>
                <span className="font-extrabold text-neutral-900">{product.storeName || 'GNC UAE'}</span>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-xl flex justify-between items-center border border-neutral-100/60">
                <span className="text-neutral-400 text-[11px] font-medium">مبدأ</span>
                <span className="font-extrabold text-neutral-900">{product.origin || 'دبی'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quantity & Total Card (Exact Screenshot Match) */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-xs text-neutral-900">تعداد</span>
          <div className="flex items-center gap-3 border border-neutral-200 rounded-xl p-1 bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => setQty(Math.min(20, qty + 1))}
              className="w-7 h-7 rounded-lg bg-white border border-neutral-200 font-extrabold text-sm flex items-center justify-center hover:bg-neutral-100 transition cursor-pointer text-neutral-900"
            >
              +
            </button>
            <span className="font-black text-sm w-4 text-center text-neutral-900">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-7 h-7 rounded-lg bg-white border border-neutral-200 font-extrabold text-sm flex items-center justify-center hover:bg-neutral-100 transition cursor-pointer text-neutral-900"
            >
              -
            </button>
          </div>
        </div>

        <div className="border-t border-neutral-100 pt-2 flex items-center justify-between">
          <span className="text-xs font-bold text-neutral-400">جمع کل</span>
          <span className="font-black text-base text-neutral-900">{formatToman(totalToman)}</span>
        </div>
      </div>

      {/* Dual Solid Black Action Buttons (Exact Screenshot Match) */}
      {!showCheckoutForm ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setShowCheckoutForm(true)}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-xl transition cursor-pointer shadow-2xs text-center"
          >
            خرید فوری
          </button>
          <button
            type="button"
            onClick={() => setShowCheckoutForm(true)}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs sm:text-sm py-3.5 px-4 rounded-xl transition cursor-pointer shadow-2xs text-center"
          >
            افزودن به سبد
          </button>
        </div>
      ) : (
        /* Checkout Delivery Address Form */
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3.5 shadow-md">
          <h4 className="font-black text-sm text-neutral-900 border-b border-neutral-100 pb-2">
            اطلاعات تحویل‌گیرنده در ایران
          </h4>

          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: علیرضا حسینی"
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-black bg-[#F8FAFC]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              شماره تماس جهت هماهنگی پیک <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="09121234567"
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-black bg-[#F8FAFC] text-left dir-ltr"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 mb-1">
              آدرس دقیق تحویل در ایران <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={2}
              placeholder="شهر، خیابان، کوچه، پلاک، واحد..."
              className="w-full p-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-900 focus:outline-none focus:border-black bg-[#F8FAFC] resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full bg-black hover:bg-neutral-800 text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-xl transition cursor-pointer shadow-md text-center mt-2"
          >
            {isSubmitting ? 'در حال ثبت و انتقال به درگاه...' : `پرداخت نهایی (${formatToman(totalToman)})`}
          </button>
        </div>
      )}
    </div>
  );
};
