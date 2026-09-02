import React, { useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { formatPrice, formatAedValue, getStoreBadgeTheme } from '../utils/formatters';

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
  const isIHerb = (storeName || '').toLowerCase().includes('iherb') || (product.sourceUrl || product.url || '').toLowerCase().includes('iherb');
  const storeTheme = getStoreBadgeTheme(isIHerb ? 'iHerb' : storeName);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product);
    } else {
      window.dispatchEvent(new CustomEvent('openProductDetail', { detail: product }));
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
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

  return (
    <div
      onClick={handleCardClick}
      className="group relative bg-white border border-gray-200 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:border-gray-300 hover:shadow-md transition-all text-right select-none font-['Vazirmatn',sans-serif]"
      dir="rtl"
    >
      {/* Product Image Section */}
      <div className="relative w-full aspect-square bg-gray-50/80 rounded-xl overflow-hidden mb-2">
        {/* Store Badge (Top-Right) */}
        <div className="absolute top-1.5 right-1.5 z-10">
          <span
            style={storeTheme.style}
            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs ${storeTheme.bg}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full animate-pulse ${storeTheme.dot}`}
              style={storeTheme.dotStyle}
            />
            {storeTheme.name}
          </span>
        </div>

        {/* Minimalist Star Badge (Top-Left) */}
        {(product.isPopular || (product as any)?.isFeatured || (effectiveBadge && effectiveBadge.includes('پرطرفدار'))) ? (
          <div className="absolute top-1.5 left-1.5 z-10" title="محصول پرطرفدار">
            <span className="w-5 h-5 flex items-center justify-center bg-amber-500 text-white rounded-full shadow-xs">
              <Star className="w-3 h-3 text-white fill-white stroke-white" />
            </span>
          </div>
        ) : effectiveBadge ? (
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-xs">
              {effectiveBadge}
            </span>
          </div>
        ) : null}

        {/* Product Image with dedicated top clearance for the badge */}
        <div className="w-full h-full flex items-center justify-center pt-7 pb-2 px-2.5">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        </div>
      </div>

      {/* Product Title */}
      <h3 className="text-xs font-black text-gray-900 leading-snug line-clamp-2 h-8 mb-2">
        {title}
      </h3>

      {/* Pricing & Add to Cart */}
      <div className="flex flex-col gap-2 mt-auto">
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-xs font-black text-red-600">
            {Number(priceToman || 0).toLocaleString('fa-IR')} <span className="text-[10px] font-normal text-gray-600">تومان</span>
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
