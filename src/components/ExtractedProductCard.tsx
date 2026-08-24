import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, CheckCircle2, Weight, Coins, Sparkles, AlertCircle, ArrowLeft, ShieldCheck, RefreshCw, ChevronDown } from 'lucide-react';
import { ImageMagnifier } from './ImageMagnifier';
import { formatAed, formatToman, toPersianDigits, deduplicateImageUrls, getStoreBadgeTheme } from '../utils/formatters';
import { formatPersianSize, translateFlavor, generatePersianProductCaption } from '../utils/supplementLocalization';
import type { FinancialSettings, CmsConfig, ProductVariantMatrix, ProductVariantItem } from '../types';

export interface ExtractedProductCardProps {
  productTitle: string;
  url: string;
  priceAed: number;
  originalPriceAed?: number;
  weightKg: number;
  image: string;
  galleryImages?: string[];
  storeName?: string;
  brandName?: string;
  categoryName?: string;
  description?: string;
  flavors?: string[];
  sizes?: string[];
  options?: string[];
  selectedOption?: string;
  variantMatrix?: ProductVariantMatrix | null;
  variantItems?: ProductVariantItem[];
  finalToman: number;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onSelectOption?: (option: string) => void;
  onAddToCart?: () => void;
  onProceedToOrder?: () => void;
  isAdded?: boolean;
}

export const ExtractedProductCard: React.FC<ExtractedProductCardProps> = ({
  productTitle,
  url,
  priceAed,
  originalPriceAed,
  weightKg,
  image,
  galleryImages = [],
  storeName = 'Dr. Nutrition',
  brandName,
  categoryName,
  description,
  flavors = [],
  sizes = [],
  options = [],
  selectedOption,
  variantMatrix,
  variantItems = [],
  finalToman,
  quantity,
  onQuantityChange,
  onSelectOption,
  onAddToCart,
  onProceedToOrder,
  isAdded = false
}) => {
  // Deduplicate and filter images strictly
  const cleanGallery = useMemo(() => {
    return deduplicateImageUrls([image, ...galleryImages], image);
  }, [image, galleryImages]);

  // Active main image in showcase
  const [selectedImg, setSelectedImg] = useState<string>(cleanGallery[0] || image);
  const [showSpecs, setShowSpecs] = useState(false);

  useEffect(() => {
    if (cleanGallery.length > 0) {
      if (!cleanGallery.includes(selectedImg)) {
        setSelectedImg(cleanGallery[0]);
      }
    } else {
      setSelectedImg(image);
    }
  }, [cleanGallery, image]);

  // Discount percentage calculation
  const discountPercent = useMemo(() => {
    if (originalPriceAed && originalPriceAed > priceAed) {
      return Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
    }
    return null;
  }, [originalPriceAed, priceAed]);

  // Clean valid options (filter standard / default placeholders)
  const validOptions = useMemo(() => {
    return (options || []).filter(
      (opt) =>
        opt &&
        !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(
          opt.trim().toLowerCase()
        )
    );
  }, [options]);

  // Dynamic Persian Product Caption
  const dynamicTitle = useMemo(() => {
    if (selectedOption) {
      const isFlv = (flavors || []).includes(selectedOption);
      const isSz = (sizes || []).includes(selectedOption);
      return generatePersianProductCaption({
        title: productTitle,
        selectedFlavor: isFlv ? selectedOption : (!isSz ? selectedOption : undefined),
        selectedSize: isSz ? selectedOption : undefined
      });
    }
    return productTitle;
  }, [productTitle, selectedOption, flavors, sizes]);

  return (
    <div
      id="extracted-product-card"
      className="bg-white border border-gray-200 rounded-3xl p-4 md:p-6 shadow-sm font-['Vazirmatn',sans-serif] space-y-4 text-right"
      dir="rtl"
    >
      {/* 2-Column Responsive Layout (Desktop: 12-col grid, Cols 1-5 for Image, Cols 6-12 for Specs & Actions) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* COLUMN 1: HIGH-RES LARGE IMAGE SHOWCASE WITH MAGNIFIER (Cols 1-5)   */}
        {/* ==================================================================== */}
        <div className="md:col-span-5 flex flex-col items-center gap-3.5 w-full">
          {/* Main Large Showcase Container with Floating Store Badges */}
          <div className="w-full relative rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm flex justify-center">
            {/* Floating Store Badge (Top Right) */}
            {(() => {
              const storeTheme = getStoreBadgeTheme(brandName || storeName);
              return (
                <div className={`absolute top-3 right-3 z-20 ${storeTheme.bg} text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm pointer-events-none`}>
                  <span className={`w-2 h-2 rounded-full ${storeTheme.dot} animate-pulse`} />
                  <span>{storeTheme.name}</span>
                </div>
              );
            })()}

            {/* Delivery Origin Tag (Top Left) */}
            <div className="absolute top-3 left-3 z-20 bg-gray-100 text-gray-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-gray-200 pointer-events-none">
              ارسال مستقیم دبی
            </div>

            <ImageMagnifier
              src={selectedImg || image}
              alt={productTitle}
              fallbackSrc="https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600"
              zoomScale={2.2}
              showHints={true}
              badge={
                discountPercent ? (
                  <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-sm dir-ltr">
                    -{discountPercent}%
                  </span>
                ) : null
              }
              className="w-full max-w-[320px] h-[300px] md:max-w-none md:h-auto md:min-h-[400px] lg:min-h-[440px] bg-transparent p-4 flex items-center justify-center relative overflow-hidden"
              imageClassName="object-contain w-full h-full max-h-[380px] drop-shadow-sm transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Conditional Thumbnail Strip: ONLY rendered if MULTIPLE distinct images exist */}
          {cleanGallery.length > 1 && (
            <div className="w-full flex items-center justify-center gap-2 overflow-x-auto py-1 px-1 dir-ltr no-scrollbar">
              {cleanGallery.slice(0, 6).map((imgUrl, idx) => {
                const isActive = selectedImg === imgUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImg(imgUrl)}
                    className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white shrink-0 cursor-pointer transition-all duration-200 p-1 flex items-center justify-center ${
                      isActive
                        ? 'border-2 border-red-600 ring-2 ring-red-600/20 shadow-sm scale-105'
                        : 'border border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                    }`}
                    title={`تصویر ${idx + 1}`}
                  >
                    <img
                      src={imgUrl}
                      alt={`تصویر ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('images.weserv.nl')) {
                          target.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(imgUrl);
                        }
                      }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================================================================== */}
        {/* COLUMN 2: SPECS, PRICING, VARIANTS & ACTIONS (Cols 6-12)             */}
        {/* ==================================================================== */}
        <div className="md:col-span-7 flex flex-col space-y-4 w-full text-right dir-rtl">
          
          {/* Title */}
          <div className="space-y-1">
            <h3 className="font-black text-base sm:text-lg lg:text-xl text-gray-950 leading-snug">
              {dynamicTitle}
            </h3>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] text-gray-500 block font-bold mb-0.5 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-500" />
                قیمت در امارات:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-black text-sm dir-ltr block text-left">
                  {formatAed(priceAed)}
                </span>
                {originalPriceAed && originalPriceAed > priceAed && (
                  <span className="text-gray-400 font-bold text-xs line-through dir-ltr">
                    {formatAed(originalPriceAed)}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] text-gray-500 block font-bold mb-0.5 flex items-center gap-1">
                <Weight className="w-3 h-3 text-sky-500" />
                وزن تخمینی:
              </span>
              <span className="text-gray-900 font-black text-sm block">
                {weightKg} کیلوگرم
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-2xs">
              <span className="text-[10px] text-gray-500 block font-bold mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-red-600" />
                قیمت تمام‌شده در ایران:
              </span>
              <span className="text-red-600 font-black text-sm sm:text-base block">
                {formatToman(Math.round(finalToman / quantity))}
              </span>
            </div>
          </div>

          {/* Extracted Specifications & Badges (Clean Non-Clickable Informative Badges) */}
          {(() => {
            const cleanFlavors = Array.from(new Set((flavors || []).filter(f => f && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(f.trim().toLowerCase()))));
            const cleanSizes = Array.from(new Set((sizes || []).filter(s => s && !['پیش‌فرض / استاندارد', 'پیش‌فرض', 'استاندارد', 'default', 'standard', 'normal', 'default title'].includes(s.trim().toLowerCase()))));
            const otherOptions = (validOptions || []).filter(o => !cleanFlavors.includes(o) && !cleanSizes.includes(o));

            if (cleanFlavors.length === 0 && cleanSizes.length === 0 && otherOptions.length === 0) return null;

            return (
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                  <span>مشخصات استخراج‌شده کالا (Flavor & Size):</span>
                </span>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {cleanFlavors.map((flv) => (
                    <span
                      key={`flv-${flv}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-bold shadow-2xs"
                    >
                      <span className="text-gray-500 font-medium text-[11px]">طعم:</span>
                      <span className="text-gray-950 font-black">{translateFlavor(flv)}</span>
                    </span>
                  ))}
                  {cleanSizes.map((sz) => (
                    <span
                      key={`sz-${sz}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-bold shadow-2xs"
                    >
                      <span className="text-gray-500 font-medium text-[11px]">سایز / وزن:</span>
                      <span className="text-gray-950 font-black">{formatPersianSize(sz)}</span>
                    </span>
                  ))}
                  {cleanFlavors.length === 0 && cleanSizes.length === 0 && otherOptions.map((opt) => (
                    <span
                      key={`opt-${opt}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs font-bold shadow-2xs"
                    >
                      <span className="text-gray-500 font-medium text-[11px]">گزینه:</span>
                      <span className="text-gray-950 font-black">{translateFlavor(opt) !== opt ? translateFlavor(opt) : formatPersianSize(opt)}</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Clean High-Contrast Product Specifications */}
          <div className="w-full flex flex-col gap-2.5 my-1">
            {/* Ingredients Card */}
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
              <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                ترکیبات و مشخصات فنی (Specifications & Ingredients)
              </span>
              <p className="text-xs leading-relaxed text-gray-700 font-medium pr-3.5">
                {description || 'پروتئین وی خالص با بالاترین درصد خلوص، حاوی BCAA و اسیدهای آمینه شاخه‌دار، بدون شکر افزوده و چربی ترانس.'}
              </p>
            </div>

            {/* Benefits Card */}
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl flex flex-col gap-1.5">
              <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-black" />
                کارایی و عملکرد (Key Benefits)
              </span>
              <p className="text-xs leading-relaxed text-gray-700 font-medium pr-3.5">
                تسریع رشد و ریکاوری تارهای عضلانی، جلوگیری از کاتابولیسم، هضم سریع و جذب بهینه.
              </p>
            </div>

            {/* Authenticity Guarantee Card */}
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                <span>تضمین ۱۰۰٪ اصالت کالا و ارسال مستقیم و اورجینال</span>
              </span>
              <span className="text-[11px] font-extrabold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                پلمپ اورجینال ✅
              </span>
            </div>
          </div>

          {/* Quantity Stepper & Final Total Price Card */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-700">تعداد سفارش:</span>
              <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-gray-200 active:scale-95"
                >
                  -
                </button>
                <span className="font-black text-sm text-gray-900 w-6 text-center dir-ltr">
                  {toPersianDigits(quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="w-7 h-7 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-gray-200 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Price Summary & Call to Actions */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <span className="text-[11px] text-gray-500 block font-bold">مبلغ نهایی سفارش ({quantity} عدد):</span>
                <span className="text-base sm:text-lg font-black text-red-600">
                  {formatToman(finalToman)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={onAddToCart}
                    disabled={isAdded}
                    className={`font-black text-xs sm:text-sm py-3.5 px-6 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-black hover:bg-gray-900 text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>به سبد اضافه شد</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 text-white" />
                        <span>افزودن به سبد خرید</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExtractedProductCard;
