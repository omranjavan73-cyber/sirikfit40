import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag, CreditCard, Coins, Weight, AlertCircle, CheckCircle2, ChevronRight, ArrowLeft, Trash2, Plus, Minus, ShoppingCart, Plane, Tag, X } from 'lucide-react';
import type { FinancialSettings, Order, User, CartItem, CmsConfig } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';
import { calculateOrderPricing } from '../utils/pricingEngine';
import { validateDiscountCode, incrementDiscountUsage, type ValidationResult } from '../utils/discountHelper';

interface ProductDetailViewProps {
  product: {
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
    brand?: string;
    discountPercent?: number;
    originalPriceAed?: number;
    servings?: string;
    origin?: string;
    selectedOption?: string;
    options?: string[];
    description?: string;
  };
  cartItems?: CartItem[];
  onUpdateCartQuantity?: (id: string, delta: number) => void;
  onRemoveCartItem?: (id: string) => void;
  onClearCart?: () => void;
  settings: FinancialSettings;
  cms?: CmsConfig | null;
  currentUser?: User | null;
  onBackToMain: () => void;
  onOrderCreated: (order: Order) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  cartItems,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClearCart,
  settings,
  cms,
  currentUser,
  onBackToMain,
  onOrderCreated
}) => {
  // Step 1: Product / Cart detail view. Step 2: Recipient details & order checkout
  const [step, setStep] = useState<1 | 2>(1);
  const [qty, setQty] = useState<number>(1);

  // Recipient Form States
  const [customerName, setCustomerName] = useState<string>(currentUser?.name || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Promo Code States
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<ValidationResult | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState<boolean>(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !customerName) setCustomerName(currentUser.name);
      if (currentUser.phoneNumber && !phoneNumber) setPhoneNumber(currentUser.phoneNumber);
    }
  }, [currentUser]);

  const hasCart = Array.isArray(cartItems) && cartItems.length > 0;

  // Single Product Calculations
  const priceAed = product.priceAed || 280;
  const originalPriceAed = product.originalPriceAed;
  const weightKg = product.weightKg || 0.5;

  const activeAedRate = getEffectiveAedRate(settings, cms);

  const singleToman = product.calculatedTomanOverride
    ? product.calculatedTomanOverride
    : calculateFinalToman(
        priceAed,
        weightKg,
        settings.cargoRatePerKg,
        settings.profitMargin,
        activeAedRate
      );

  // Aggregate Cart Calculations
  const cartTotalAed = hasCart
    ? cartItems.reduce((sum, item) => sum + item.priceAed * item.quantity, 0)
    : priceAed * qty;

  const cartTotalWeightKg = hasCart
    ? Math.round(cartItems.reduce((sum, item) => sum + item.weightKg * item.quantity, 0) * 100) / 100
    : Math.round(weightKg * qty * 100) / 100;

  const totalItemCount = hasCart
    ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
    : qty;

  // Dynamic Bulk Order Pricing Engine
  const pricingResult = calculateOrderPricing(
    cartTotalAed,
    totalItemCount,
    activeAedRate,
    cms?.pricingRules,
    cartTotalWeightKg,
    settings.cargoRatePerKg
  );

  const cartTotalToman = (!hasCart && product.calculatedTomanOverride)
    ? product.calculatedTomanOverride * qty
    : pricingResult.finalTotalToman;

  // Effective Total with Discount Code Applied
  const discountAmountToman = (appliedDiscount && appliedDiscount.isValid) ? appliedDiscount.discountAmountToman : 0;
  const effectiveTotalToman = Math.max(0, cartTotalToman - discountAmountToman);

  const baseGoodsToman = Math.round(cartTotalAed * activeAedRate);
  const cargoShippingToman = Math.round(pricingResult.shippingCostAed * activeAedRate);
  const commissionToman = Math.round(pricingResult.commissionAmountAed * activeAedRate);

  // User Savings from Volume Tier Commission and Combined Shipping Cap
  const baselineAed = cartTotalAed + (cartTotalAed * 0.20) + (totalItemCount * 20);
  const baselineToman = Math.round(baselineAed * activeAedRate);
  const savingsToman = Math.max(0, baselineToman - cartTotalToman);

  const getItemUnitToman = (item: CartItem) => {
    if (cartTotalAed > 0 && item.priceAed > 0) {
      const share = (item.priceAed * item.quantity) / cartTotalAed;
      return Math.round((cartTotalToman * share) / item.quantity);
    }
    if (item.calculatedToman) return item.calculatedToman;
    return calculateFinalToman(item.priceAed, item.weightKg, settings.cargoRatePerKg, settings.profitMargin, activeAedRate);
  };

  const handleProceedToStep2 = () => {
    setErrorMessage('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyPromoCode = async () => {
    if (!promoInput.trim()) return;
    setIsApplyingPromo(true);
    setPromoMessage(null);
    try {
      const itemsList = hasCart ? cartItems : undefined;
      const singleProd = !hasCart ? product : undefined;
      const res = await validateDiscountCode(promoInput, cartTotalToman, undefined, itemsList, singleProd);
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

    const minOrderLimit = settings.minOrderAed || 200;
    if (cartTotalAed < minOrderLimit) {
      setErrorMessage(`حداقل مبلغ سفارش برای ارسال، ${toPersianDigits(minOrderLimit)} درهم میباشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.');
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setErrorMessage('لطفاً شماره تماس معتبر (مثلاً ۰۹۱۲۱۲۳۴۵۶۷) وارد کنید.');
      return;
    }
    if (!deliveryAddress.trim()) {
      setErrorMessage('لطفاً آدرس دقیق تحویل در ایران را وارد کنید.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const orderProductTitle = hasCart
        ? cartItems.map((i) => `${toPersianDigits(i.quantity)} × ${i.title}`).join(' | ')
        : `${toPersianDigits(qty)} × ${product.title}`;

      const orderProductUrl = hasCart ? cartItems[0]?.url || product.url : product.url;
      const orderProductImage = hasCart ? cartItems[0]?.image || product.image : product.image;
      const orderStoreName = hasCart ? cartItems[0]?.storeName || product.storeName : product.storeName;

      const orderSelectedOption = hasCart
        ? cartItems.map((i) => i.selectedOption ? `${i.title} (${i.selectedOption})` : null).filter(Boolean).join(' | ')
        : product.selectedOption;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
          deliveryAddress: deliveryAddress.trim(),
          notes: notes.trim(),
          productTitle: orderProductTitle,
          productUrl: orderProductUrl,
          productImage: orderProductImage,
          storeName: orderStoreName || 'فروشگاه دبی',
          priceAed: cartTotalAed,
          weightKg: cartTotalWeightKg,
          calculatedToman: effectiveTotalToman,
          selectedOption: orderSelectedOption || undefined,
          discountCode: appliedDiscount?.discountCodeObj?.code,
          discountAmountToman: discountAmountToman > 0 ? discountAmountToman : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.order) {
        if (appliedDiscount?.discountCodeObj?.id) {
          incrementDiscountUsage(appliedDiscount.discountCodeObj.id);
        }
        if (hasCart && onClearCart) {
          onClearCart();
        }
        onOrderCreated(data.order);
      } else {
        setErrorMessage(data.error || 'خطا در ثبت سفارش.');
      }
    } catch (e) {
      console.error('Error submitting order:', e);
      setErrorMessage('خطا در برقراری ارتباط با سرور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // EMPTY CART VIEW
  if (cartItems && cartItems.length === 0) {
    return (
      <div id="detail" className="space-y-4 font-['Vazirmatn',sans-serif] max-w-lg mx-auto pb-20 animate-fade-in text-center">
        <div className="bg-white border border-slate-200/90 rounded-[24px] p-8 shadow-2xs space-y-4 my-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">سبد خرید شما خالی است</h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
            می‌توانید لینک کالا از فروشگاه‌های دبی را استخراج کنید یا از بخش پیشنهادهای ویژه محصول مورد نظر را به سبد اضافه نمایید.
          </p>
          <button
            onClick={onBackToMain}
            className="w-full bg-[#111111] hover:bg-black text-white font-extrabold text-xs py-3.5 px-5 rounded-[14px] transition cursor-pointer border-none shadow-xs flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به صفحه اصلی و برآورد قیمت</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="detail" className="space-y-4 font-['Vazirmatn',sans-serif] max-w-lg mx-auto pb-20 animate-fade-in">
      
      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: CART ITEMS OR SINGLE PRODUCT VIEW */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-4">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-[20px] p-3.5 shadow-2xs">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 className="font-black text-sm md:text-base text-slate-900">
                {hasCart ? 'سبد خرید شما' : 'مشخصات کالا'}
              </h2>
              <span className="bg-[#111111] text-white text-[10px] font-black px-2 py-0.5 rounded-full dir-ltr">
                {toPersianDigits(totalItemCount)} کالا
              </span>
            </div>
            <button
              onClick={onBackToMain}
              className="text-xs font-extrabold text-slate-600 hover:text-black flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <span>افزودن کالای دیگر</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* MULTI-ITEM CART LIST */}
          {hasCart ? (
            <div className="space-y-3">
              {cartItems.map((item) => {
                const itemUnitToman = getItemUnitToman(item);
                const itemSubtotal = itemUnitToman * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-[20px] p-4 shadow-2xs space-y-3 relative transition hover:border-slate-300"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=400'}
                        alt={item.title}
                        className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl border border-slate-200 bg-slate-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">
                            {item.storeName || 'فروشگاه دبی'}
                          </span>
                          {/* TRASH / DELETE BUTTON */}
                          <button
                            onClick={() => onRemoveCartItem && onRemoveCartItem(item.id)}
                            className="text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 shrink-0"
                            title="حذف از سبد خرید"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">حذف</span>
                          </button>
                        </div>
                        <h3 className="font-extrabold text-xs md:text-sm text-slate-900 leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        {item.selectedOption && (
                          <div className="text-[10px] font-bold text-slate-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                            گزینه: <span className="font-extrabold text-amber-900">{item.selectedOption}</span>
                          </div>
                        )}
                        {(item.selectedFlavor || item.selectedSize) && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.selectedFlavor && (
                              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                طعم: <span className="font-extrabold">{item.selectedFlavor}</span>
                              </span>
                            )}
                            {item.selectedSize && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                سایز: <span className="font-extrabold">{item.selectedSize}</span>
                              </span>
                            )}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-medium dir-ltr">
                          قیمت واحد: <span className="font-bold text-slate-800">{formatToman(itemUnitToman)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quantity Modifiers & Item Subtotal */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center cursor-pointer transition shadow-2xs border border-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-black text-sm text-slate-900 w-6 text-center dir-ltr">
                          {toPersianDigits(item.quantity)}
                        </span>
                        <button
                          onClick={() => onUpdateCartQuantity && onUpdateCartQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-900 font-black flex items-center justify-center cursor-pointer transition shadow-2xs border border-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-medium block text-right">جمع کالا:</span>
                        <span className="font-black text-slate-900 text-sm md:text-base text-left block">
                          {formatToman(itemSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* SINGLE PRODUCT VIEW FALLBACK */
            <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs space-y-4">
              <div className="flex justify-center pt-2">
                <div className="img-wrap relative w-36 h-36 bg-[#FEF6E4] rounded-[22px] flex items-center justify-center overflow-hidden p-0 shadow-2xs">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover object-center block rounded-[22px]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="font-black text-3xl md:text-4xl text-[#111111] tracking-tighter">
                      ON
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {originalPriceAed && originalPriceAed > priceAed && (
                  <span className="bg-rose-100 text-rose-700 text-xs font-black px-2.5 py-0.5 rounded-full dir-ltr">
                    -{toPersianDigits(Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100))}٪
                  </span>
                )}
                {product.brand && (
                  <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-0.5 rounded-full">
                    {product.brand}
                  </span>
                )}
              </div>

              <h1 className="text-center font-black text-base md:text-lg text-slate-900 leading-snug">
                {product.title}
              </h1>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#F0FDF4] border border-emerald-100 rounded-[18px] p-3 text-center space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">تحویل ایران</span>
                  <span className="font-black text-emerald-600 text-sm md:text-base block">
                    {formatToman(singleToman)}
                  </span>
                </div>

                <div className="bg-[#F8FAFC] border border-slate-200 rounded-[18px] p-3 text-center space-y-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold block">قیمت درهم</span>
                  <span className="font-black text-slate-900 text-sm md:text-base block dir-ltr">
                    {formatAed(priceAed)}
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] border border-slate-200 rounded-[18px] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQty(Math.min(20, qty + 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-sm flex items-center justify-center transition cursor-pointer text-slate-900"
                  >
                    +
                  </button>
                  <span className="font-black text-sm w-6 text-center text-slate-900 dir-ltr">{toPersianDigits(qty)}</span>
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-black text-sm flex items-center justify-center transition cursor-pointer text-slate-900"
                  >
                    -
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-900">تعداد کالا</span>
              </div>

              {/* STRUCTURED TECHNICAL SPECIFICATIONS TABLE (جدول مشخصات فنی) */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-right">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-sky-600" />
                  <span>جدول مشخصات فنی کالا (Technical Specifications)</span>
                </h3>
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-4 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-bold block">برند (Brand):</span>
                      <span className="font-black text-slate-800 block">{product.brand || product.storeName || 'معتبر دبی'}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-bold block">دسته‌بندی (Category):</span>
                      <span className="font-black text-slate-800 block">{product.category || 'مکمل‌های ورزشی'}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-bold block">وزن / سروینگ (Weight / Servings):</span>
                      <span className="font-black text-slate-800 block dir-ltr text-right">{toPersianDigits(product.weightKg || 0.8)} کیلوگرم</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-0.5">
                      <span className="text-[11px] text-slate-400 font-bold block">اصالت کالا (Authenticity):</span>
                      <span className="font-black text-emerald-700 block">۱۰۰٪ اورجینال (100% Authentic)</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-0.5 col-span-2">
                      <span className="text-[11px] text-slate-400 font-bold block">ترکیبات کلیدی (Key Ingredients):</span>
                      <span className="font-bold text-slate-700 block dir-ltr text-right">
                        {product.title.toLowerCase().includes('protein') || product.title.toLowerCase().includes('وی')
                          ? 'Whey Protein Isolate, BCAA, Glutamine, Essential Amino Acids'
                          : product.title.toLowerCase().includes('multi') || product.title.toLowerCase().includes('مولتی')
                          ? 'Vitamin C, B-Complex, Vitamin D3, Zinc, Magnesium'
                          : product.title.toLowerCase().includes('c4') || product.title.toLowerCase().includes('پمپ')
                          ? 'Citrulline Malate, Beta-Alanine, Caffeine Anhydrous, Tyrosine'
                          : 'Active Ingredients, Minerals, Vitamins & Essential Nutrients'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PERSIAN CAPTION & FUNCTIONAL BENEFITS BOX */}
              <div className="space-y-2 text-right">
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>توضیحات و کاربردهای اصلی محصول</span>
                </h3>
                <div className="bg-slate-50 p-4 rounded-2xl text-slate-700 text-xs sm:text-sm leading-relaxed border border-slate-200">
                  {(() => {
                    const desc = product.description && product.description.trim();
                    if (desc && desc.length > 20) {
                      const lines = desc.split(/\r?\n|•|- |\* |;/).map(l => l.trim()).filter(Boolean);
                      if (lines.length > 1) {
                        return (
                          <div className="space-y-2">
                            {lines.map((line, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-medium">
                                <span className="text-emerald-600 font-black shrink-0 mt-0.5">✔</span>
                                <span className="leading-relaxed">{line}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return <p className="font-medium text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">{desc}</p>;
                    }

                    const t = product.title.toLowerCase();
                    let functionalBenefits = [
                      'تضمین ۱۰۰٪ اصالت کالا، پلمپ کارخانه‌ای و ارسال سریع از دبی',
                      'کیفیت گرید A جهانی با استاندارد کنترل کیفیت بین‌المللی',
                      'حفظ حداکثر اثربخشی با شرایط نگهداری و بسته‌بندی استاندارد'
                    ];

                    if (t.includes('protein') || t.includes('وی') || t.includes('whey') || t.includes('iso')) {
                      functionalBenefits = [
                        'افزایش حجم عضلانی خشک و ترمیم سریع بافت‌های عضلانی پس از تمرینات سنگین',
                        'هضم و جذب فوق‌العاده سریع با ارزش بیولوژیکی بالا (Whey Isolate/Concentrate)',
                        'تامین اسیدهای آمینه ضروری (BCAA & Glutamine) برای جلوگیری از فرآیند کاتابولیسم'
                      ];
                    } else if (t.includes('creatine') || t.includes('کراتین')) {
                      functionalBenefits = [
                        'افزایش قدرت، توان انفجاری و ذخایر ATP در سلول‌های عضلانی',
                        'بهبود عملکرد و استقامت بدنی در تمرینات پرفشار و سنگین ورزشی',
                        'تسریع روند ریکاوری و افزایش حجم سلولی مفید عضلات'
                      ];
                    } else if (t.includes('multi') || t.includes('مولتی') || t.includes('vitamin') || t.includes('ویتامین')) {
                      functionalBenefits = [
                        'تامین ۱۰۰٪ نیاز روزانه بدن به ویتامین‌ها و ملاح معدنی کلیدی',
                        'تقویت سیستم ایمنی بدن، افزایش سطح انرژی و رفع خستگی مفرط',
                        'حاوی آنتی‌اکسیدان‌های قوی برای حفظ سلامت قلب، پوست و مو'
                      ];
                    } else if (t.includes('c4') || t.includes('پمپ') || t.includes('pre-workout') || t.includes('preworkout')) {
                      functionalBenefits = [
                        'افزایش شدید تمرکز فکری و دم عضلانی (Muscle Pump) در حین تمرین',
                        'تاخیر در بروز خستگی و افزایش استقامت تمرینی با بتا-آلانین و سیترولین',
                        'بهبود خون‌رسانی و اکسیژن‌رسانی بهتر به بافت‌های عضلانی'
                      ];
                    } else if (t.includes('gainer') || t.includes('گینر') || t.includes('mass')) {
                      functionalBenefits = [
                        'تامین کالری بالا و کربوهیدرات‌های پیچیده برای افزایش وزن سریع و پایدار',
                        'کمک به ساخت عضلات باکیفیت در افراد سخت‌وزن‌گیر (Hardgainers)',
                        'بازسازی سریع ذخایر گلیکوژن عضلانی پس از تمرین'
                      ];
                    } else if (t.includes('collagen') || t.includes('biotin') || t.includes('کلاژن') || t.includes('بیوتین') || t.includes('hair') || t.includes('skin')) {
                      functionalBenefits = [
                        'تقویت پوست، مو، ناخن و جوانسازی عمیق بافت‌های پوستی',
                        'کاهش ریزش مو و تحریک رُشد مجدد فولیکول‌های مو',
                        'حفظ کشسانی و رطوبت طبیعی پوست با ترکیب هیالورونیک اسید و ویتامین C'
                      ];
                    } else if (t.includes('probiotic') || t.includes('digestive') || t.includes('پروبیوتیک') || t.includes('گوارش') || t.includes('gut')) {
                      functionalBenefits = [
                        'بهبود عملکرد دستگاه گوارش و حفظ تعادل فلور میکروبی روده',
                        'تقویت جذب مواد مغذی، مکمل‌ها و ویتامین‌ها در دستگاه هضم',
                        'کاهش نفخ، بهبود هضم غذا و تقویت سلامت عمومی سیستم ایمنی'
                      ];
                    } else if (t.includes('omega') || t.includes('امگا')) {
                      functionalBenefits = [
                        'تقویت سلامت قلب و عروق، مفاصل و بهبود عملکرد سلول‌های مغزی',
                        'عاری از جیوه و فلزات سنگین با درجه خلوص بالا (Pharmaceutical Grade)',
                        'تنظیم سطح کلسترول و کاهش التهاب‌های مفصلی'
                      ];
                    }

                    return (
                      <div className="space-y-2">
                        {functionalBenefits.map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 font-medium">
                            <span className="text-emerald-600 font-black shrink-0 mt-0.5">✔</span>
                            <span className="leading-relaxed">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* PROMO CODE INPUT BOX */}
          <div className="bg-white border border-slate-200/90 rounded-[20px] p-4 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-xs text-slate-900">ورود کد تخفیف</h3>
            </div>

            {appliedDiscount && appliedDiscount.isValid ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>کد تخفیف <span className="uppercase tracking-wider font-extrabold">{appliedDiscount.discountCodeObj?.code}</span> اعمال شد</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                    تخفیف کسرشده: {formatToman(appliedDiscount.discountAmountToman)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromoCode}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  title="حذف کد تخفیف"
                >
                  <X className="w-4 h-4" />
                  <span>حذف</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    placeholder="کد تخفیف را وارد کنید (مثال: OFF10)"
                    className="flex-1 p-2.5 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-black text-slate-900 focus:outline-none bg-[#F8FAFC] uppercase text-left dir-ltr"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromoCode}
                    disabled={isApplyingPromo || !promoInput.trim()}
                    className="bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0 border-none"
                  >
                    {isApplyingPromo ? 'در حال بررسی...' : 'اعمال کد'}
                  </button>
                </div>

                {promoMessage && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    promoMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    {promoMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{promoMessage.text}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CART TOTAL SUMMARY BOX - DETAILED FINANCIAL BREAKDOWN */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-4.5 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            {(cms?.features?.showBreakdown ?? cms?.showPriceBreakdown ?? cms?.showBreakdown ?? true) && (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs md:text-sm text-slate-900">
                    مشاهده ریز قیمت
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full">
                    {pricingResult.ruleDescription}
                  </span>
                </div>

                {/* 1. مجموع قیمت پایه کالاها (درهم / تومان) */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>مجموع قیمت پایه کالاها (دبی):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(cartTotalAed)} درهم ({formatToman(baseGoodsToman)})
                  </span>
                </div>

                {/* 2. کرایه کارگو ترکیبی */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>کرایه کارگو ترکیبی ({toPersianDigits(cartTotalWeightKg)} کیلوگرم):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(pricingResult.shippingCostAed)} درهم ({formatToman(cargoShippingToman)})
                  </span>
                </div>

                {/* 3. کارمزد اعمال‌شده با نمایش درصد فعلی */}
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>کارمزد سیستم ({toPersianDigits(pricingResult.commissionPercent)}٪):</span>
                  <span className="font-bold text-slate-900 dir-ltr">
                    {toPersianDigits(Math.round(pricingResult.commissionAmountAed * 10) / 10)} درهم ({formatToman(commissionToman)})
                  </span>
                </div>

                {/* 4. 🔥 میزان تخفیف سود شما */}
                {savingsToman > 0 ? (
                  <div className="flex justify-between items-center text-xs bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl text-emerald-900">
                    <span className="font-black flex items-center gap-1">
                      <span>🔥</span>
                      <span>میزان تخفیف سود شما (تخفیف پله‌ای):</span>
                    </span>
                    <span className="font-black text-emerald-700 dir-ltr">
                      {formatToman(savingsToman)} ({toPersianDigits(20 - pricingResult.commissionPercent)}٪ کارمزد کمتر)
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg font-medium text-right">
                    💡 با افزایش مبلغ سفارش به بالای ۵۰۰ درهم یا اضافه کردن کالاهای بیشتر، کارمزد سفارش از ۲۰٪ به ۱۸٪ و ۱۶٪ کاهش می‌یابد.
                  </div>
                )}

                {/* 4.5. 🎟️ کد تخفیف اعمال‌شده */}
                {discountAmountToman > 0 && (
                  <div className="flex justify-between items-center text-xs bg-emerald-100/80 border border-emerald-300 p-2.5 rounded-xl text-emerald-900">
                    <span className="font-black flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      <span>کد تخفیف ({appliedDiscount?.discountCodeObj?.code}):</span>
                    </span>
                    <span className="font-black text-emerald-800 dir-ltr">
                      -{formatToman(discountAmountToman)}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* 5. مبلغ کل قابل پرداخت (تومان) */}
            <div className={`pt-2 flex items-center justify-between ${(cms?.features?.showBreakdown ?? cms?.showPriceBreakdown ?? cms?.showBreakdown ?? true) ? 'border-t border-slate-100' : ''}`}>
              <div>
                <span className="text-xs font-black text-slate-900 block">مبلغ کل قابل پرداخت تحویل در ایران:</span>
                <span className="text-[10px] text-slate-400 font-medium block">شامل کالا + کارمزد {toPersianDigits(pricingResult.commissionPercent)}٪ + ارسال هوایی</span>
              </div>
              <div className="text-left">
                {discountAmountToman > 0 && (
                  <span className="text-xs text-slate-400 line-through block font-bold dir-ltr">
                    {formatToman(cartTotalToman)}
                  </span>
                )}
                <span className="font-black text-lg sm:text-xl text-[#E11D48] tracking-tight">{formatToman(effectiveTotalToman)}</span>
              </div>
            </div>
          </div>

          {/* RECIPIENT DETAILS FORM & DIRECT PAYMENT BUTTON */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-4.5 shadow-2xs space-y-3 font-['Vazirmatn',sans-serif]">
            <h3 className="font-extrabold text-xs md:text-sm text-slate-900 border-b border-slate-100 pb-2">
              اطلاعات تحویل‌گیرنده سفارش در ایران
            </h3>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                  نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: علیرضا حسینی"
                  className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                  شماره تماس جهت هماهنگی پیک <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="09121234567"
                  className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-left dir-ltr"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                آدرس دقیق تحویل در ایران <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={2}
                placeholder="شهر، خیابان، کوچه، پلاک، واحد..."
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition resize-none text-right"
              />
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-900 mb-1 text-right">
                توضیحات تکمیلی (اختیاری)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="طعم، زمان تحویل و غیره..."
                className="w-full p-2.5 border border-slate-300 focus:border-slate-900 rounded-[12px] text-xs font-medium text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            {/* Minimum Order Warning & Direct Payment Action Button */}
            {cartTotalAed < (settings.minOrderAed || 200) && (
              <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-[16px] text-amber-900 text-xs font-bold flex items-center gap-2 text-right dir-rtl">
                <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span>
                  حداقل مبلغ سفارش برای ارسال، {toPersianDigits(settings.minOrderAed || 200)} درهم میباشد. لطفاً محصولات بیشتری به سبد خود اضافه کنید.
                </span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSubmitOrder()}
                disabled={isSubmitting || cartTotalAed < (settings.minOrderAed || 200)}
                className={`w-full font-black text-xs md:text-sm py-3.5 rounded-[16px] transition shadow-md border-none text-center flex items-center justify-center gap-2 ${
                  cartTotalAed < (settings.minOrderAed || 200)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[#111111] hover:bg-black text-white cursor-pointer'
                }`}
              >
                <span>
                  {isSubmitting ? 'در حال اتصال به درگاه...' : 'تأیید و پرداخت نهایی ←'}
                </span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: RECEIVER INFO FORM & CHECKOUT */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <form onSubmit={handleSubmitOrder} className="space-y-4 animate-fade-in">
          
          {/* Back to Step 1 Button */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت و اصلاح مشخصات سبد خرید</span>
          </button>

          {/* Card 1: Order Summary */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 text-center shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-semibold block">مبلغ نهایی کل سفارش</span>
            <div className="text-2xl md:text-3xl font-black text-[#E11D48] my-1">
              {formatToman(cartTotalToman)}
            </div>
            <span className="text-xs text-slate-600 font-medium block dir-rtl leading-relaxed">
              {hasCart
                ? cartItems.map((i) => `${toPersianDigits(i.quantity)} × ${i.title}`).join(' | ')
                : `${toPersianDigits(qty)} × ${product.title}`}
            </span>
          </div>

          {/* Card 2: Recipient Details Form */}
          <div className="bg-white border border-slate-200/90 rounded-[24px] p-5 shadow-2xs space-y-4">
            
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                نام و نام خانوادگی تحویل‌گیرنده <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: علیرضا حسینی"
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                شماره تماس جهت هماهنگی پیک <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09121234567"
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-left dir-ltr"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                آدرس دقیق تحویل در ایران <span className="text-rose-600">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                placeholder="شهر، خیابان، کوچه، پلاک، واحد..."
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-bold text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition resize-none text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-right">
                توضیحات تکمیلی (اختیاری)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="طعم، زمان تحویل و غیره..."
                className="w-full p-3.5 border border-slate-300 focus:border-slate-900 rounded-[14px] text-xs font-medium text-slate-900 focus:outline-none bg-[#F8FAFC] focus:bg-white transition text-right"
              />
            </div>

            {/* Action Button: RENAMED TO "تأیید و پرداخت نهایی ←" */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#111111] hover:bg-black text-white font-black text-sm md:text-base py-4 rounded-[18px] transition shadow-md flex items-center justify-center gap-2 cursor-pointer border-none mt-3"
            >
              <span>
                {isSubmitting ? 'در حال ثبت سفارش...' : 'تأیید و پرداخت نهایی ←'}
              </span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
