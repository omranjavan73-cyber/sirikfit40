import React, { useState } from 'react';
import { Plus, Check, ShoppingBag } from 'lucide-react';
import { formatPrice, formatAedValue } from '../utils/formatters';

export interface ProductCardProps {
  product: any;
  badgeText?: string;
  viewMode?: 'grid' | 'list';
  onSelect?: (product: any) => void;
  onAddToCart?: (product: any) => void;
  showToast?: (msg: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  badgeText,
  viewMode = 'grid',
  onSelect,
  onAddToCart,
  showToast
}) => {
  const [isAdded, setIsAdded] = useState(false);

  const title = product.title || product.name || 'مکمل ورزشی اورجینال';
  const storeName = product.storeName || product.brand || 'دبی';
  const imageUrl = product.imageUrl || product.image || product.productImage;
  const priceToman = product.priceToman || product.calculatedToman || product.totalToman || 0;
  const priceAed = product.priceAED || product.priceAed || 0;
  const discountPercent = product.discountPercent || (product.originalPriceAed && priceAed ? Math.round(((product.originalPriceAed - priceAed) / product.originalPriceAed) * 100) : 0);

  const effectiveBadge = badgeText || (discountPercent > 0 ? `${discountPercent}٪ تخفیف` : product.badge || undefined);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    } else {
      // Trigger global product detail navigation event
      window.dispatchEvent(new CustomEvent('openProductDetail', { detail: product }));
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    } else {
      window.dispatchEvent(new CustomEvent('addToCartDirect', { detail: product }));
    }
    setIsAdded(true);
    if (showToast) {
      showToast('به سبد خرید افزوده شد');
    }
    setTimeout(() => setIsAdded(false), 2000);
  };

  // ----------------------------------------------------
  // LIST VIEW LAYOUT
  // ----------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className="group bg-white border border-gray-200 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-right font-['Vazirmatn',sans-serif] hover:border-gray-300 hover:shadow-md transition-all cursor-pointer select-none"
        dir="rtl"
      >
        {/* Image Thumbnail */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl p-1.5 shrink-0 flex items-center justify-center overflow-hidden">
          {effectiveBadge && (
            <span className="absolute top-1 right-1 z-10 bg-amber-500 text-white text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
              {effectiveBadge}
            </span>
          )}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          ) : (
            <ShoppingBag className="w-6 h-6 text-gray-300" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-md truncate max-w-[120px]">
              {storeName}
            </span>
          </div>
          <h3 className="text-xs font-black text-gray-900 leading-snug line-clamp-2">
            {title}
          </h3>
        </div>

        {/* Pricing & Add */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2 pl-1">
          {priceAed > 0 && (
            <span className="text-[10px] font-bold text-gray-400 dir-ltr font-mono">
              AED {formatAedValue(priceAed)}
            </span>
          )}
          <div className="text-xs font-black text-red-600">
            {formatPrice(priceToman)} <span className="text-[9px] font-bold text-gray-700">تومان</span>
          </div>
          <button
            type="button"
            onClick={handleQuickAdd}
            className={`py-1.5 px-3 rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
              isAdded ? 'bg-emerald-600 text-white' : 'bg-[#0f172a] hover:bg-black text-white'
            }`}
          >
            {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span>{isAdded ? 'افزوده شد' : 'افزودن'}</span>
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // GRID VIEW LAYOUT (Ultra-Compact & Clutter-Free)
  // ----------------------------------------------------
  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white border border-gray-200 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-gray-300 hover:shadow-md transition-all text-right select-none font-['Vazirmatn',sans-serif]"
      dir="rtl"
    >
      {/* Product Image & Store Overlay */}
      <div className="relative w-full aspect-square bg-gray-50 rounded-xl p-2 flex items-center justify-center overflow-hidden mb-2">
        {/* Deal Badge (Top Right) */}
        {effectiveBadge && (
          <span className="absolute top-1.5 right-1.5 z-10 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs">
            {effectiveBadge}
          </span>
        )}

        {/* Minimal Store Tag (Top Left) */}
        <span className="absolute top-1.5 left-1.5 z-10 bg-black/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md max-w-[90px] truncate">
          {storeName}
        </span>

        {/* Image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        ) : (
          <ShoppingBag className="w-8 h-8 text-gray-300" />
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1 mb-2">
        <h3 className="text-xs font-black text-gray-900 leading-snug line-clamp-2 h-8">
          {title}
        </h3>
      </div>

      {/* Pricing & Quick Add Button */}
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
          <span className="text-xs font-black text-red-600">
            {formatPrice(priceToman)} <span className="text-[10px] font-bold text-gray-700">تومان</span>
          </span>
          {priceAed > 0 && (
            <span className="text-[10px] font-bold text-gray-400 dir-ltr font-mono">
              AED {formatAedValue(priceAed)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleQuickAdd}
          className={`w-full py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer ${
            isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-[#0f172a] hover:bg-black active:scale-98 text-white'
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
              <span>افزودن به سبد</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
