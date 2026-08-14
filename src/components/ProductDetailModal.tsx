import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Plane, ShieldCheck, Check, Sparkles, ExternalLink, Weight, Coins, Info } from 'lucide-react';
import type { FinancialSettings } from '../types';
import { formatToman, formatAed, toPersianDigits, calculateFinalToman } from '../utils/formatters';

export interface ProductDetailModalProduct {
  title: string;
  url?: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  weightKg?: number;
  image?: string;
  images?: string[];
  galleryImages?: string[];
  storeName?: string;
  brand?: string;
  category?: string;
  description?: string;
  badge?: string;
  flavors?: string[];
  sizes?: string[];
  selectedFlavor?: string;
  selectedSize?: string;
  variants?: {
    id: string;
    flavor?: string;
    size?: string;
    priceAed?: number;
    priceToman?: number;
  }[];
}

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductDetailModalProduct | null;
  settings: FinancialSettings;
  onAddToCart: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  settings,
  onAddToCart
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const [selectedFlavor, setSelectedFlavor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');

  // Gallery list construction
  const rawList = product ? (product.images || product.galleryImages || (product.image ? [product.image] : [])) : [];
  const fallbackImg = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
  
  const galleryList = Array.from(
    new Set(rawList.filter(Boolean))
  );

  useEffect(() => {
    if (product) {
      const validFlavors = (product.flavors || []).filter(
        (flv) => flv && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(flv.trim().toLowerCase())
      );
      const validSizes = (product.sizes || []).filter(
        (sz) => sz && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(sz.trim().toLowerCase())
      );
      setSelectedFlavor(product.selectedFlavor || validFlavors[0] || '');
      setSelectedSize(product.selectedSize || validSizes[0] || '');
      const initialImg = galleryList[0] || product.image || fallbackImg;
      setSelectedImage(initialImg);
      setQuantity(1);
      setIsAdded(false);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const isLocal = product.isLocalInventory === true || product.storeName?.includes('انبار ایران') || product.brand?.includes('انبار ایران');
  const priceAed = product.priceAed || 100;
  const weightKg = product.weightKg || 0.8;
  const originalPriceAed = product.originalPriceAed;
  
  const discountVal = (originalPriceAed && originalPriceAed > priceAed)
    ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
    : (product.discountPercent || 0);

  const unitToman = product.calculatedTomanOverride || (product as any).priceToman || calculateFinalToman(
    priceAed,
    weightKg,
    settings.cargoRatePerKg,
    settings.profitMargin,
    settings.aedRate
  );

  const totalToman = unitToman * quantity;

  const handleAdd = () => {
    onAddToCart({
      ...product,
      title: product.title,
      url: product.url || 'https://www.drnutrition.com',
      priceAed: priceAed,
      weightKg: weightKg,
      image: selectedImage || product.image || fallbackImg,
      storeName: product.storeName || product.brand || 'دبی',
      quantity: quantity,
      calculatedTomanOverride: unitToman,
      isLocalInventory: isLocal
    });

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-white rounded-[28px] max-w-lg w-full p-5 sm:p-6 shadow-2xl relative space-y-5 border border-slate-100 max-h-[92vh] overflow-y-auto text-right dir-rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 left-4 z-20 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition cursor-pointer"
          title="بستن"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Store & Brand Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1 pl-10">
          <span className="text-[11px] bg-[#111111] text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            {product.storeName || 'فروشگاه دبی'}
          </span>
          {product.brand && (
            <span className="text-[11px] bg-slate-100 text-slate-700 font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
              {product.brand}
            </span>
          )}
          {product.category && (
            <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-2.5 py-1 rounded-full border border-amber-200">
              {product.category}
            </span>
          )}
          {discountVal > 0 && (
            <span className="text-[11px] bg-rose-600 text-white font-black px-2.5 py-1 rounded-full dir-ltr shadow-2xs">
              -{toPersianDigits(discountVal)}٪ تخفیف
            </span>
          )}
          {product.badge && (
            <span className="text-[11px] bg-sky-50 text-sky-800 font-extrabold px-2.5 py-1 rounded-full border border-sky-200">
              {product.badge}
            </span>
          )}
        </div>

        {/* GALLERY SECTION */}
        <div className="space-y-3">
          {/* Main Large Display Image */}
          <div className="relative w-full h-56 sm:h-64 bg-slate-50 rounded-[22px] border border-slate-200/90 overflow-hidden flex items-center justify-center p-2 shadow-inner group">
            <img
              src={selectedImage || fallbackImg}
              alt={product.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain object-center rounded-[18px] transition duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.currentTarget;
                const currentSrc = target.src || '';
                if (selectedImage && !currentSrc.includes('images.weserv.nl') && !selectedImage.startsWith('data:')) {
                  target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(selectedImage);
                } else {
                  target.src = fallbackImg;
                }
              }}
            />
          </div>

          {/* Interactive Thumbnails Row (3-5 items) */}
          {galleryList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 dir-ltr justify-center">
              {galleryList.slice(0, 5).map((imgUrl, idx) => {
                const isActive = selectedImage === imgUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(imgUrl)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden bg-slate-50 shrink-0 transition cursor-pointer ${
                      isActive 
                        ? 'border-[#D31027] ring-2 ring-[#D31027]/20 shadow-sm scale-105' 
                        : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`تصویر ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('images.weserv.nl')) {
                          target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(String(imgUrl));
                        } else {
                          target.src = fallbackImg;
                        }
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* PRODUCT TITLE */}
        <div className="space-y-1">
          <h2 className="font-black text-base sm:text-lg text-slate-900 leading-snug">
            {product.title}
          </h2>
        </div>

        {/* TRANSPARENT PRICING & WEIGHT BREAKDOWN */}
        <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-[20px] p-3.5 space-y-2.5">
          {isLocal ? (
            <>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  محل تحویل کالا:
                </span>
                <span className="font-black text-emerald-700 font-extrabold">موجود در ایران (تحویل فوری ۲۴ الی ۴۸ ساعته)</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                <span className="font-bold flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-sky-600" />
                  مدت زمان ارسال:
                </span>
                <span className="font-black text-slate-800">⚡ تحویل فوری درب منزل ۲۴ الی ۴۸ ساعته</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  قیمت پایه در دبی:
                </span>
                <div className="font-black text-slate-900 dir-ltr flex items-center gap-1.5">
                  {originalPriceAed && originalPriceAed > priceAed && (
                    <span className="line-through text-slate-400 text-[11px]">
                      {formatAed(originalPriceAed)}
                    </span>
                  )}
                  <span className="text-emerald-700 font-black">{formatAed(priceAed)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                <span className="font-bold flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-sky-600" />
                  نوع ارسال و تحویل:
                </span>
                <span className="font-black text-slate-800">ارسال سفارشی از دبی (تحویل ۷ الی ۱۴ روز کاری درب منزل)</span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
            <span className="font-extrabold text-xs text-slate-900">
              قیمت نهایی تحویل فوری:
            </span>
            <span className="font-black text-sm sm:text-base text-[#D31027]">
              {formatToman(totalToman)}
            </span>
          </div>
        </div>

        {/* STRUCTURED TECHNICAL SPECIFICATIONS TABLE (جدول مشخصات فنی) */}
        <div className="space-y-2">
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
                <span className="font-black text-slate-800 block dir-ltr text-right">{toPersianDigits(weightKg)} کیلوگرم</span>
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
        <div className="space-y-2">
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

        {/* FLAVOR & SIZE SELECTORS */}
        {(() => {
          const validFlavors = (product?.flavors || []).filter(
            (flv) => flv && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(flv.trim().toLowerCase())
          );
          const validSizes = (product?.sizes || []).filter(
            (sz) => sz && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal'].includes(sz.trim().toLowerCase())
          );

          if (validFlavors.length === 0 && validSizes.length === 0) return null;

          return (
            <div className="space-y-3 pt-1 border-t border-slate-100">
              {/* Flavor Selector */}
              {validFlavors.length > 0 && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-black text-slate-900 block">
                    انتخاب طعم (Flavor):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {validFlavors.map((flv) => (
                      <button
                        key={flv}
                        type="button"
                        onClick={() => setSelectedFlavor(flv)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          selectedFlavor === flv
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {flv}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {validSizes.length > 0 && (
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-black text-slate-900 block">
                    انتخاب حجم / تعداد (Size):
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {validSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                          selectedSize === sz
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* QUANTITY & PRIMARY ACTION BUTTON */}
        <div className="pt-2 flex items-center gap-3">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer"
            >
              -
            </button>
            <span className="font-black text-sm text-slate-900 w-6 text-center dir-ltr">
              {toPersianDigits(quantity)}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center justify-center shadow-2xs hover:bg-slate-200 cursor-pointer"
            >
              +
            </button>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              const productPayload = {
                ...product,
                priceAed: priceAed,
                weightKg: weightKg,
                image: selectedImage || product.image || fallbackImg,
                quantity: quantity,
                selectedFlavor,
                selectedSize
              };
              onAddToCart(productPayload, selectedFlavor, selectedSize);
              setIsAdded(true);
              setTimeout(() => {
                setIsAdded(false);
                onClose();
              }, 800);
            }}
            className="w-full bg-slate-900 hover:bg-[#D31027] text-white font-black py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>به سبد خرید اضافه شد!</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>افزودن به سبد خرید</span>
              </>
            )}
          </button>
        </div>

        {/* Original Product Link */}
        {product.url && (
          <div className="text-center pt-1">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-700 transition"
            >
              <span>مشاهده صفحه اصلی در {product.storeName || 'امارات'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
