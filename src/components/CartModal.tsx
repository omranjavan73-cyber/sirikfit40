import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, X, Trash2, Plus, Minus, ArrowRight, CheckCircle2, AlertCircle, Tag, ShieldCheck } from 'lucide-react';
import type { FinancialSettings, CartItem, CmsConfig, Order, User } from '../types';
import { formatToman, toPersianDigits, getEffectiveAedRate, isValidIranianMobile, cleanIranianMobile, isValidPostalCode, cleanPostalCode } from '../utils/formatters';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { validateDiscountCode, incrementDiscountUsage, type ValidationResult } from '../utils/discountHelper';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart?: () => void;
  onStartShopping?: () => void;
  onOrderCreated?: (order: Order) => void;
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  currentUser?: User | null;
}

export const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onStartShopping,
  onOrderCreated,
  settings,
  cms,
  currentUser
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || '');
  const [postalCode, setPostalCode] = useState<string>(currentUser?.postalCode || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(currentUser?.address || '');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !customerName) setCustomerName(currentUser.name);
      if (currentUser.phoneNumber && !phoneNumber) setPhoneNumber(currentUser.phoneNumber);
      if (currentUser.postalCode && !postalCode) setPostalCode(currentUser.postalCode);
      if (currentUser.address && !deliveryAddress) setDeliveryAddress(currentUser.address);
    }
  }, [currentUser]);

  // Discount code states
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<ValidationResult | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const safeCartItems = Array.isArray(cartItems) ? cartItems.filter(Boolean) : [];

  if (!isOpen) return null;

  const totalItemsCount = safeCartItems.reduce((sum, item) => sum + (item?.quantity || 1), 0);
  const activeAedRate = getEffectiveAedRate(settings, cms) || settings?.aedRate || 55000;

  const getItemUnitToman = (item: CartItem): number => {
    if (!item) return 0;
    if (item.priceToman && item.priceToman > 0) return item.priceToman;
    if (item.calculatedTomanOverride && item.calculatedTomanOverride > 0) return item.calculatedTomanOverride;
    if (item.calculatedToman && item.calculatedToman > 0) return item.calculatedToman;
    const margin = Number((item as any)?.profitMargin ?? (item as any)?.marginPercent ?? settings?.profitMargin ?? 20);
    const cargo = ((item.weightKg || 0.5) * (settings?.cargoRatePerKg || 35)) * activeAedRate;
    return Math.floor((((item.priceAed || 0) * activeAedRate * (1 + margin / 100)) + cargo) / 1000) * 1000;
  };

  const cartTotalToman = safeCartItems.length > 0
    ? safeCartItems.reduce((sum, item) => sum + (getItemUnitToman(item) * (item?.quantity || 1)), 0)
    : 0;
  const cartTotalAed = safeCartItems.length > 0
    ? safeCartItems.reduce((sum, item) => sum + ((item?.priceAed || 0) * (item?.quantity || 1)), 0)
    : 0;
  const cartTotalWeightKg = safeCartItems.length > 0
    ? safeCartItems.reduce((sum, item) => sum + ((item?.weightKg || 0.5) * (item?.quantity || 1)), 0)
    : 0;

  const pricingResult = calculateOrderPricing(
    cartTotalAed,
    totalItemsCount,
    activeAedRate,
    cms?.pricingRules,
    cartTotalWeightKg,
    settings?.cargoRatePerKg || 35
  );

  const discountAmountToman = (appliedDiscount && appliedDiscount.isValid) ? appliedDiscount.discountAmountToman : 0;
  const effectiveTotalToman = Math.max(0, cartTotalToman - discountAmountToman);

  // Sync abandoned cart when valid phone is entered and cart has items
  useEffect(() => {
    if (phoneNumber && isValidIranianMobile(phoneNumber) && safeCartItems.length > 0) {
      const cleanPhone = cleanIranianMobile(phoneNumber);
      const timer = setTimeout(() => {
        fetch('/api/abandoned-cart/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            fullName: customerName,
            items: safeCartItems.map(i => ({
              title: i.title,
              priceToman: getItemUnitToman(i),
              priceAed: i.priceAed || 0,
              quantity: i.quantity || 1,
              image: i.image || '',
              variant: i.selectedSize || i.selectedFlavor || ''
            })),
            totalAmountToman: effectiveTotalToman
          })
        }).catch(() => {});
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phoneNumber, customerName, safeCartItems.length, effectiveTotalToman]);

  // Dynamic Minimum Order Limit strictly bound to settings (settings/pricing)
  const minLimitEnabled = (settings?.minOrderLimitEnabled !== undefined)
    ? Boolean(settings.minOrderLimitEnabled)
    : (cms?.pricingRules?.minOrderLimitEnabled !== undefined
        ? Boolean(cms?.pricingRules?.minOrderLimitEnabled)
        : true);

  const minOrderAmountToman = minLimitEnabled
    ? Math.max(0, Number(settings?.minOrderAmountToman ?? cms?.pricingRules?.minOrderAmountToman ?? (settings as any)?.minOrderToman ?? 0))
    : 0;

  const currentCartTotal = Number(effectiveTotalToman || cartTotalToman || 0);
  const isBelowMinOrder = minOrderAmountToman > 0 && currentCartTotal < minOrderAmountToman;

  const handleApplyPromoCode = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const res = await validateDiscountCode(promoInput, cartTotalToman, undefined, cartItems);
      if (res.isValid) {
        setAppliedDiscount(res);
        setPromoMessage({ text: res.message, type: 'success' });
      } else {
        setAppliedDiscount(null);
        setPromoMessage({ text: res.message, type: 'error' });
      }
    } catch (_e) {
      setPromoMessage({ text: 'خطا در بررسی کد تخفیف.', type: 'error' });
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedDiscount(null);
    setPromoInput('');
    setPromoMessage(null);
  };

  const handleSubmitOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isBelowMinOrder && minOrderAmountToman > 0) {
      setErrorMessage(`حداقل مبلغ سفارش برای ثبت نهایی، ${toPersianDigits(formatToman(minOrderAmountToman))} تومان میباشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.`);
      return;
    }

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.');
      return;
    }
    if (!isValidIranianMobile(phoneNumber)) {
      setErrorMessage('لطفاً شماره موبایل معتبر ۱۱ رقمی (مثلاً ۰۹۱۲۱۲۳۴۵۶۷) وارد کنید.');
      return;
    }
    if (!isValidPostalCode(postalCode)) {
      setErrorMessage('لطفاً کد پستی معتبر ۱۰ رقمی (بدون خط تیره) وارد کنید.');
      return;
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      setErrorMessage('لطفاً آدرس دقیق تحویل در ایران را وارد کنید.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const orderId = `SF-${Date.now().toString().slice(-6)}`;
      const orderProductTitle = safeCartItems.map((i) => `${toPersianDigits(i.quantity || 1)} × ${i.title || ''}`).join(' | ');
      const orderProductUrl = safeCartItems[0]?.url || 'https://www.drnutrition.com';
      const orderProductImage = safeCartItems[0]?.image || '';
      const orderStoreName = safeCartItems[0]?.storeName || 'فروشگاه دبی';

      const mappedItems = safeCartItems.map(item => ({
        id: item.id || item.url || `item-${Date.now()}`,
        title: item.title,
        variant: item.selectedOption || item.selectedFlavor || item.selectedSize || "اصلی",
        quantity: item.quantity || 1,
        priceToman: Number(getItemUnitToman(item)),
        priceAED: Number(item.priceAed || 0),
        imageUrl: item.image || (item as any).imageUrl || "",
        sourceUrl: item.url || (item as any).sourceUrl || "" // Direct UAE retailer link
      }));

      const orderPayload = {
        id: orderId,
        orderId: orderId,
        orderNumber: orderId,
        trackingCode: orderId,
        userId: currentUser?.id || undefined,
        customer: {
          fullName: customerName.trim(),
          phone: cleanIranianMobile(phoneNumber),
          postalCode: cleanPostalCode(postalCode), // Mandatory 10-digit Postal Code
          fullAddress: deliveryAddress.trim(),
          notes: notes ? notes.trim() : ""
        },
        customerName: customerName.trim(),
        phoneNumber: cleanIranianMobile(phoneNumber),
        postalCode: cleanPostalCode(postalCode),
        deliveryAddress: deliveryAddress.trim(),
        notes: notes ? notes.trim() : "",
        productTitle: orderProductTitle,
        productUrl: orderProductUrl,
        productImage: orderProductImage,
        storeName: orderStoreName,
        priceAed: cartTotalAed,
        weightKg: cartTotalWeightKg,
        items: mappedItems,
        totalAmountToman: Number(effectiveTotalToman),
        calculatedToman: Number(effectiveTotalToman),
        totalToman: Number(effectiveTotalToman),
        discountCode: appliedDiscount?.discountCodeObj?.code,
        discountAmountToman: discountAmountToman > 0 ? discountAmountToman : undefined,
        paymentStatus: "PENDING_PAYMENT",
        orderStatus: "PENDING_UAE_PURCHASE", // Step 1: در انتظار خرید از دبی
        shippingStatus: "PENDING_UAE_PURCHASE",
        gateway: "ZIBAL",
        paymentGateway: "ZIBAL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 1. Commit draft to Firestore
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db, sanitizePayloadForFirestore } = await import('../firebase');
        await setDoc(doc(db, "orders", orderId), sanitizePayloadForFirestore(orderPayload), { merge: true });
      } catch (dbErr) {
        console.warn('Firestore pre-payment persistence notice:', dbErr);
      }

      // Also cache locally
      if (typeof window !== 'undefined') {
        try {
          const existingStr = localStorage.getItem('sirikfit_orders') || '[]';
          const existing: any[] = JSON.parse(existingStr);
          existing.unshift(orderPayload);
          localStorage.setItem('sirikfit_orders', JSON.stringify(existing));
        } catch (_e) {}
      }

      if (appliedDiscount?.discountCodeObj?.id) {
        incrementDiscountUsage(appliedDiscount.discountCodeObj.id);
      }
      
      // Mark abandoned cart as recovered
      fetch('/api/abandoned-cart/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanIranianMobile(phoneNumber) })
      }).catch(() => {});

      if (onClearCart) onClearCart();

      // 2. Call backend createPayment and redirect
      const callbackUrl = `${window.location.origin}/payment-result?orderId=${orderId}`;
      const paymentRes = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          orderData: orderPayload,
          amountToman: effectiveTotalToman,
          amount: effectiveTotalToman,
          callbackUrl: callbackUrl
        })
      });

      const paymentData = await paymentRes.json();
      const targetUrl = paymentData.paymentUrl || paymentData.redirectUrl || paymentData.url;
      if (paymentRes.ok && paymentData.success && targetUrl) {
        window.location.href = targetUrl;
        return;
      } else {
        setErrorMessage(paymentData.error || 'خطا در دریافت لینک درگاه بانکی زیبال.');
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      console.error('Error submitting order:', e);
      setErrorMessage('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartShopping = () => {
    onClose();
    if (onStartShopping) {
      onStartShopping();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn dir-rtl font-['Vazirmatn',sans-serif]">
      <div 
        className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-slate-800" />
            <h2 className="font-black text-sm sm:text-base text-slate-900">
              سبد خرید شما
            </h2>
            {safeCartItems.length > 0 && (
              <span className="bg-[#111111] text-white text-[10px] font-black px-2 py-0.5 rounded-full dir-ltr">
                {toPersianDigits(totalItemsCount)} کالا
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* 1. CLEAN EMPTY CART STATE */}
        {/* ------------------------------------------------------------------ */}
        {safeCartItems.length === 0 ? (
          <div className="py-8 px-4 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-inner">
              <ShoppingCart className="w-10 h-10 text-slate-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                سبد خرید شما در حال حاضر خالی است
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
                محصولات مورد نظر خود را از صفحه اصلی یا انبار ایران انتخاب کرده و به سبد خرید اضافه کنید.
              </p>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={handleStartShopping}
                className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-xs py-3.5 px-5 rounded-[16px] transition cursor-pointer border-none shadow-sm flex items-center justify-center gap-2"
              >
                <span>مشاهده محصولات و شروع خرید</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ------------------------------------------------------------------ */
          /* 2. ACTIVE CART WITH ITEMS & CHECKOUT */
          /* ------------------------------------------------------------------ */
          <div className="space-y-4">
            {/* List of Cart Items */}
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {safeCartItems.map((item) => {
                const unitPrice = getItemUnitToman(item);
                const subtotal = unitPrice * (item.quantity || 1);

                return (
                  <div
                    key={item.cartItemId || item.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl"
                  >
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=200'}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-slate-200 shrink-0"
                    />

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      {(item.selectedFlavor || item.selectedSize || item.selectedOption) && (
                        <span className="inline-block text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {item.selectedFlavor || item.selectedSize || item.selectedOption}
                        </span>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-black text-xs text-slate-900">
                          {formatToman(subtotal)}
                        </span>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId || item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-slate-900 w-4 text-center dir-ltr">
                            {toPersianDigits(item.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.cartItemId || item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.cartItemId || item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Promo Code Box */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
                <span>کد تخفیف:</span>
              </div>
              {appliedDiscount && appliedDiscount.isValid ? (
                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                  <span className="font-extrabold text-emerald-800">
                    کد {appliedDiscount.discountCodeObj?.code} اعمال شد (-{formatToman(discountAmountToman)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromoCode}
                    className="text-rose-600 hover:underline font-bold text-[11px]"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="کد تخفیف (مثال: OFF10)"
                    className="flex-1 p-2 border border-slate-200 rounded-xl text-xs font-bold bg-white uppercase text-left dir-ltr"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={isApplyingPromo || !promoInput.trim()}
                    className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl"
                  >
                    {isApplyingPromo ? '...' : 'اعمال'}
                  </button>
                </div>
              )}
              {promoMessage && !appliedDiscount && (
                <p className="text-[11px] text-rose-600 font-bold">{promoMessage.text}</p>
              )}
            </div>

            {/* Total Price Summary */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>مجموع قیمت کالاها:</span>
                <span className="font-bold text-slate-900">{formatToman(cartTotalToman)}</span>
              </div>
              {discountAmountToman > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                  <span>تخفیف:</span>
                  <span>-{formatToman(discountAmountToman)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="font-black text-xs text-slate-900">مبلغ نهایی قابل پرداخت:</span>
                <span className="font-black text-base text-[#D31027]">{formatToman(effectiveTotalToman)}</span>
              </div>
            </div>

            {/* 1-Line Authenticity Verification Badge */}
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-emerald-800 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>✓ تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال</span>
            </div>

            {/* Minimum Order Warning Box */}
            {isBelowMinOrder && minOrderAmountToman > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-center gap-2 text-xs md:text-sm my-3 dir-rtl text-right">
                <span>⚠️ حداقل مبلغ سفارش برای ثبت نهایی، {minOrderAmountToman.toLocaleString('fa-IR')} تومان میباشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.</span>
              </div>
            )}

            {/* Step 1 CTA or Step 2 Checkout Form */}
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isBelowMinOrder && minOrderAmountToman > 0}
                className={`w-full font-extrabold text-xs py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-sm ${
                  isBelowMinOrder && minOrderAmountToman > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#111111] hover:bg-black text-white cursor-pointer'
                }`}
              >
                <span>ادامه فرآیند ثبت و پرداخت سفارش</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <form onSubmit={handleSubmitOrder} className="space-y-3 pt-1 border-t border-slate-100">
                <h4 className="font-black text-xs text-slate-900">اطلاعات تحویل‌گیرنده:</h4>
                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-1.5 border border-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="نام و نام خانوادگی تحویل‌گیرنده *"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-right"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="شماره موبایل (۱۱ رقم) *"
                    maxLength={11}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-left dir-ltr font-mono"
                    dir="ltr"
                    required
                  />
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="کد پستی (۱۰ رقم) *"
                    maxLength={10}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-left dir-ltr font-mono"
                    dir="ltr"
                    required
                  />
                </div>
                <textarea
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="آدرس دقیق تحویل در ایران *"
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold resize-none text-right"
                  required
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="توضیحات تکمیلی (اختیاری)"
                  rows={1}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold resize-none text-right"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 rounded-xl transition cursor-pointer"
                  >
                    بازگشت
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (isBelowMinOrder && minOrderAmountToman > 0)}
                    className={`flex-1 font-black text-xs py-3 rounded-xl transition ${
                      isBelowMinOrder && minOrderAmountToman > 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-[#D31027] hover:bg-rose-700 text-white cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>در حال انتقال به درگاه بانکی شاپرک...</span>
                      </span>
                    ) : (
                      'تأیید و پرداخت نهایی'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
