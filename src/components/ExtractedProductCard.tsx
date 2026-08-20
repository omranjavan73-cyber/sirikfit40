import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, CheckCircle2, Weight, Coins, Sparkles, AlertCircle, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { ImageMagnifier } from './ImageMagnifier';
import { formatAed, formatToman, toPersianDigits, deduplicateImageUrls } from '../utils/formatters';
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
      className="bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] rounded-2xl p-4 md:p-6 shadow-xs font-['Vazirmatn',sans-serif] space-y-4"
    >
      {/* 2-Column Responsive Layout (Desktop: 12-col grid, Cols 1-5 for Image, Cols 6-12 for Specs & Actions) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* ==================================================================== */}
        {/* COLUMN 1: HIGH-RES LARGE IMAGE SHOWCASE WITH MAGNIFIER (Cols 1-5)   */}
        {/* ==================================================================== */}
        <div className="md:col-span-5 flex flex-col items-center gap-3.5 w-full">
          {/* Main Large Showcase Container */}
          <div className="w-full flex justify-center">
            <ImageMagnifier
              src={selectedImg || image}
              alt={productTitle}
              fallbackSrc="https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600"
              zoomScale={2.2}
              showHints={true}
              badge={
                discountPercent ? (
                  <span className="bg-rose-600 text-white text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-sm dir-ltr">
                    -{discountPercent}%
                  </span>
                ) : null
              }
              className="w-full max-w-[320px] h-[300px] md:max-w-none md:h-auto md:min-h-[400px] lg:min-h-[440px] bg-white border border-gray-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-center relative overflow-hidden"
              imageClassName="object-contain w-full h-full max-h-[380px]"
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
                        ? 'border-2 border-red-500 ring-2 ring-red-500/20 shadow-sm scale-105'
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
          
          {/* Store Badge, Brand & Title */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] bg-slate-900 text-white font-extrabold px-3 py-1 rounded-lg uppercase tracking-wider shadow-2xs">
                {storeName || 'Dr. Nutrition'}
              </span>

              {brandName && (
                <span className="text-[11px] bg-white border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg">
                  برند: {brandName}
                </span>
              )}

              {categoryName && (
                <span className="text-[11px] bg-white border border-slate-200 text-slate-600 font-medium px-2.5 py-1 rounded-lg">
                  {categoryName}
                </span>
              )}
            </div>

            <h3 className="font-black text-base sm:text-lg lg:text-xl text-[#111111] leading-snug">
              {dynamicTitle}
            </h3>
          </div>

          {/* Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-neutral-400 block font-bold mb-0.5 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-500" />
                قیمت در امارات:
              </span>
              <span className="text-[#111111] font-black text-sm dir-ltr block text-left">
                {formatAed(priceAed)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-neutral-400 block font-bold mb-0.5 flex items-center gap-1">
                <Weight className="w-3 h-3 text-sky-500" />
                وزن تخمینی:
              </span>
              <span className="text-[#111111] font-black text-sm block">
                {weightKg} کیلوگرم
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-50 to-teal-50/70 p-3 rounded-xl border border-emerald-200/90 shadow-2xs">
              <span className="text-[10px] text-emerald-800 block font-bold mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                قیمت تمام‌شده در ایران:
              </span>
              <span className="text-emerald-900 font-black text-sm sm:text-base block">
                {formatToman(Math.round(finalToman / quantity))}
              </span>
            </div>
          </div>

          {/* Interactive Variant Selectors (Flavors / Sizes / Options) */}
          {validOptions.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900 inline-block"></span>
                  <span>گزینه‌های قابل انتخاب (طعم / وزن / بسته‌بندی):</span>
                </span>
                {selectedOption && validOptions.includes(selectedOption) && (
                  <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg dir-rtl">
                    انتخاب‌شده: <span className="text-slate-900 font-black">{translateFlavor(selectedOption) !== selectedOption ? translateFlavor(selectedOption) : formatPersianSize(selectedOption)}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5 dir-ltr">
                {validOptions.map((opt) => {
                  const isSelected = selectedOption === opt;
                  const matchedItem = variantItems.find(
                    (v) =>
                      v.title?.toLowerCase() === opt.toLowerCase() ||
                      v.name?.toLowerCase() === opt.toLowerCase() ||
                      v.size?.toLowerCase() === opt.toLowerCase() ||
                      v.flavor?.toLowerCase() === opt.toLowerCase()
                  );
                  const isAvailable = matchedItem ? matchedItem.inStock !== false : true;
                  const optPrice = matchedItem ? (matchedItem.priceAED ?? matchedItem.priceAed) : null;
                  const hasDifferentPrice = optPrice && optPrice > 0 && optPrice !== priceAed;
                  const localizedLabel = translateFlavor(opt) !== opt ? translateFlavor(opt) : formatPersianSize(opt);

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (!isAvailable) return;
                        if (matchedItem?.image) {
                          setSelectedImg(matchedItem.image);
                        }
                        if (onSelectOption) onSelectOption(opt);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all inline-flex items-center gap-1.5 ${
                        !isAvailable
                          ? 'bg-slate-100/80 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50 line-through'
                          : isSelected
                          ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-sm scale-[1.02] cursor-pointer'
                          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-400 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <span>{localizedLabel}</span>
                      {!isAvailable && (
                        <span className="text-[10px] text-rose-500 font-normal no-underline mr-1">
                          (ناموجود)
                        </span>
                      )}
                      {isAvailable && hasDifferentPrice && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {optPrice} AED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Key Benefits & Nutrition Highlights / Description */}
          {description && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-black text-[#111111] flex items-center gap-1.5">
                <span className="text-amber-500">✨</span>
                <span>توضیحات و مشخصات کالا:</span>
              </span>
              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {description}
              </p>
            </div>
          )}

          {/* Quantity Stepper & Final Total Price Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">تعداد سفارش:</span>
              <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-slate-200 active:scale-95"
                >
                  -
                </button>
                <span className="font-black text-sm text-slate-900 w-6 text-center dir-ltr">
                  {toPersianDigits(quantity)}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-black flex items-center justify-center cursor-pointer transition text-base border border-slate-200 active:scale-95"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Price Summary & Call to Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div>
                <span className="text-[11px] text-neutral-400 block font-bold">مبلغ نهایی سفارش ({quantity} عدد):</span>
                <span className="text-base sm:text-lg font-black text-[#111111]">
                  {formatToman(finalToman)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onAddToCart && (
                  <button
                    type="button"
                    onClick={onAddToCart}
                    disabled={isAdded}
                    className={`font-black text-xs sm:text-sm py-2.5 px-5 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm border-none active:scale-95 ${
                      isAdded
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#D31027] hover:bg-[#b00d20] text-white'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>به سبد اضافه شد</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>افزودن به سبد خرید</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Guarantee Badge */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ضمانت اصالت ۱۰۰٪ فیزیکی کالا با فاکتور رسمی امارات</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExtractedProductCard;
