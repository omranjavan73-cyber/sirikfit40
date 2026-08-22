import React, { useState } from 'react';
import { Heart, Star, ShoppingBag, Plus, Check } from 'lucide-react';
import { formatPrice, formatAedValue, toPersianDigits } from '../utils/formatters';

interface ProductCatalogCardProps {
  product: any;
  viewMode?: 'grid' | 'list';
  onSelect: (product: any) => void;
  onAddToCart?: (product: any) => void;
  showToast?: (msg: string) => void;
}

export const ProductCatalogCard: React.FC<ProductCatalogCardProps> = ({
  product,
  viewMode = 'grid',
  onSelect,
  onAddToCart,
  showToast
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const title = product.title || 'مکمل ورزشی و اورجینال';
  const brand = product.brand || product.storeName || 'GNC Store';
  const storeName = product.storeName || brand || 'دبی';
  const imageUrl = product.image || product.imageUrl || product.productImage;
  const rating = product.rating || '4.9';

  // Pricing
  const priceToman = product.priceToman || product.calculatedToman || product.totalToman || 0;
  const priceAed = product.priceAed || product.priceAED || 0;
  const discountPercent = product.discountPercent || (product.originalPriceAed && priceAed ? Math.round(((product.originalPriceAed - priceAed) / product.originalPriceAed) * 100) : 0);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
      setIsAdded(true);
      if (showToast) {
        showToast('کالا به سبد خرید اضافه شد');
      }
      setTimeout(() => setIsAdded(false), 2000);
    } else {
      onSelect(product);
    }
  };

  // ----------------------------------------------------
  // LIST VIEW LAYOUT (افقی و تمام عرض)
  // ----------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(product)}
        className="group bg-white border border-slate-200/90 hover:border-slate-400 rounded-3xl p-3 sm:p-4 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 sm:gap-4 text-right font-['Vazirmatn',sans-serif] relative overflow-hidden"
      >
        {/* Right side: Image Thumbnail with discount badge */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 border border-slate-100 rounded-2xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
          {discountPercent > 0 ? (
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-2xs z-10">
              {discountPercent}٪
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow-2xs z-10">
              آفر
            </span>
          )}

          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <ShoppingBag className="w-8 h-8 text-slate-300" />
          )}
        </div>

        {/* Center: Details */}
        <div className="flex-1 min-w-0 space-y-1 flex flex-col justify-between py-0.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] font-black text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{rating}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {storeName}
            </span>
          </div>

          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
            {title}
          </h4>

          {/* Benefit Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded">
              اورجینال دبی
            </span>
            <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              {brand}
            </span>
          </div>
        </div>

        {/* Left side: Price & Add to Cart button */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5 pl-0.5 gap-2">
          <button
            type="button"
            onClick={handleHeartClick}
            className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          <div className="text-left space-y-0.5 my-auto">
            {priceAed > 0 && (
              <div className="text-slate-400 text-[10px] font-bold dir-ltr font-mono">
                AED {formatAedValue(priceAed)}
              </div>
            )}
            <div className="text-red-600 font-black text-xs sm:text-sm whitespace-nowrap flex items-baseline gap-1">
              <span>{formatPrice(priceToman)}</span>
              <span className="text-[9px] font-extrabold">تومان</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCartClick}
            className={`text-xs font-black px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer ${
              isAdded 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-900 hover:bg-black text-white'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>اضافه شد</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>+ افزودن به سبد</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID VIEW LAYOUT (کارت عمودی فشرده با قیمت تک خطی)
  // ----------------------------------------------------
  return (
    <div
      onClick={() => onSelect(product)}
      className="group bg-white border border-slate-200/90 hover:border-slate-400 rounded-3xl p-2.5 sm:p-3 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between text-right font-['Vazirmatn',sans-serif] relative overflow-hidden"
    >
      {/* 1. Header Ribbon & Wishlist */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={handleHeartClick}
          className="text-slate-300 hover:text-red-500 transition p-1 -m-1 cursor-pointer"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {discountPercent > 0 ? (
          <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md shadow-2xs">
            {discountPercent}٪ تخفیف
          </span>
        ) : (
          <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-md shadow-2xs">
            پیشنهاد ویژه
          </span>
        )}
      </div>

      {/* 2. Centered High-Res Image Box (Compact Height) */}
      <div className="relative w-full h-32 sm:h-36 bg-slate-50/80 border border-slate-100/80 rounded-2xl p-2 mb-2 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <ShoppingBag className="w-8 h-8 text-slate-300" />
        )}
      </div>

      {/* 3. Rating & Store Badge */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[110px]">
          {storeName}
        </span>
        <div className="flex items-center gap-1 text-[11px] font-black text-amber-500 shrink-0">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span>{rating}</span>
        </div>
      </div>

      {/* 4. Title (2 lines) */}
      <h4 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2 min-h-[34px] mb-1.5">
        {title}
      </h4>

      {/* 5. Benefit Pill Badges */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100/80 px-1.5 py-0.5 rounded">
          High Quality
        </span>
        <span className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          {brand}
        </span>
      </div>

      {/* 6. Compact Single-Row Price Container (تومان در راست، درهم در چپ در یک خط واحد) */}
      <div className="flex items-center justify-between w-full px-1 py-1.5 my-1 border-t border-slate-100">
        {/* Right Side: Primary Toman Price */}
        <div className="flex items-baseline gap-1 text-right">
          <span className="text-xs sm:text-sm font-extrabold text-red-600">
            {formatPrice(priceToman)}
          </span>
          <span className="text-[9px] font-medium text-slate-500">تومان</span>
        </div>

        {/* Left Side: Muted AED Price */}
        {priceAed > 0 && (
          <div className="text-left">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dir-ltr font-mono">
              AED {formatAedValue(priceAed)}
            </span>
          </div>
        )}
      </div>

      {/* 7. Full-width Add to Cart Button */}
      <button
        type="button"
        onClick={handleAddToCartClick}
        className={`w-full text-xs font-black py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
          isAdded 
            ? 'bg-emerald-600 text-white' 
            : 'bg-slate-900 hover:bg-black text-white'
        }`}
      >
        {isAdded ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>به سبد اضافه شد</span>
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" />
            <span>+ افزودن به سبد</span>
          </>
        )}
      </button>
    </div>
  );
};
