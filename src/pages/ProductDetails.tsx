import React, { useState, useMemo, useEffect } from 'react';
import type { NormalizedProduct } from '../types';
import { useCart } from '../context/CartContext';
import { calculateProductTomanPrice } from '../utils/pricingCalculator';
import {
  matchVariantValues,
  areVariantsMatching,
  getActiveVariants,
  getAllFlavors,
  getAllSizes,
  getAvailableSizesForFlavor,
  findExactVariant,
  isFlavorAvailable,
  isSizeAvailableForFlavor,
  handleFlavorChange,
  handleSizeChange
} from '../utils/variantMatrixEngine';
import { isMatchVariant, matchVariantAttr, resolveCompoundVariant, resolveVariantHeroImage } from '../utils/variantHelpers';
import { ShoppingCart, Check, AlertCircle, ExternalLink, Globe, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatPersianSize, translateFlavor, sanitizeVariantLabel } from '../utils/supplementLocalization';
import { getStoreBadgeTheme } from '../utils/formatters';

interface ProductDetailsProps {
  product: NormalizedProduct;
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  onAddToCart?: (item: any) => void;
}

// 1. String Normalizer: Strips parentheses, extra spaces, and handles lowercase
const cleanStr = (str: string = ''): string => {
  return String(str)
    .replace(/\(.*?\)/g, '') // remove anything inside parentheses
    .replace(/[()]/g, '')
    .trim()
    .toLowerCase();
};

const cleanSize = (sizeStr: string = ''): string => {
  const match = String(sizeStr).match(/([\d.]+)/);
  return match ? match[1] : String(sizeStr).trim();
};

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  aedRate = 55000,
  cargoRatePerKg = 35,
  profitMargin = 20,
  onAddToCart
}) => {
  const { addToCart } = useCart();

  // ── Store / Brand Badge Resolver (Rendered cleanly above title) ──────────────
  const storeBadge = useMemo(() => {
    const rawUrl = product?.sourceUrl || product?.url || (product as any)?.originalUrl || '';
    const isIherb = ((product as any)?.storeName || '').toLowerCase().includes('iherb') || (rawUrl || '').toLowerCase().includes('iherb');
    return getStoreBadgeTheme(isIherb ? 'iHerb' : ((product as any)?.storeName || product?.brand));
  }, [product]);

  // 2. Extract active variants directly from product.variants as single source of truth
  const activeVariants = useMemo(() => {
    return getActiveVariants(product?.variants);
  }, [product?.variants]);

  // Extract Unique Global Flavors and Sizes directly from active variants (or allowed fallbacks)
  const availableFlavors: string[] = useMemo(() => {
    if (activeVariants.length > 0) {
      return getAllFlavors(activeVariants);
    }
    const raw = (product as any)?.allowedFlavors || (product as any)?.flavors || [];
    return Array.from(new Set(raw.map((f: any) => String(typeof f === 'string' ? f : (f?.name || f?.flavor || f?.label || ''))).filter(Boolean))) as string[];
  }, [activeVariants, product]);

  const availableSizes: string[] = useMemo(() => {
    if (activeVariants.length > 0) {
      return getAllSizes(activeVariants);
    }
    const raw = (product as any)?.allowedSizes || (product as any)?.sizes || [];
    return Array.from(new Set(raw.map((s: any) => String(typeof s === 'string' ? s : (s?.name || s?.size || s?.label || ''))).filter(Boolean))) as string[];
  }, [activeVariants, product]);

  // Initial selection
  const [selectedFlavor, setSelectedFlavor] = useState<string>(() => {
    const activeList = getActiveVariants(product?.variants);
    if (activeList.length > 0) {
      return activeList[0]?.flavor || '';
    }
    return '';
  });

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    const activeList = getActiveVariants(product?.variants);
    if (activeList.length > 0) {
      return activeList[0]?.size || activeList[0]?.name || '';
    }
    return '';
  });

  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string>('');

  // 3. Primary Flavor & Dependent Size Availability Checks
  // Check if a Size is valid for the currently selected Flavor
  const isSizeAvailable = (size: string): boolean => {
    if (activeVariants.length === 0) return true;
    return isSizeAvailableForFlavor(activeVariants, size, selectedFlavor);
  };

  // Flavor is NEVER disabled by size. All configured flavors remain selectable.
  const isFlavorAvailable = (_flavor: string): boolean => {
    return true;
  };

  // 4. Click Handlers
  const handleFlavorClick = (flavor: string) => {
    const res = handleFlavorChange(activeVariants, flavor, selectedSize);
    setSelectedFlavor(res.flavor);
    setSelectedSize(res.size);
    setSelectedGalleryImage('');
  };

  const handleSizeClick = (size: string) => {
    // Size simply selects the size; does NOT disable or filter flavors
    setSelectedSize(size);
    setSelectedGalleryImage('');
  };

  // Initial auto-sync on mount or product change
  useEffect(() => {
    if (activeVariants.length > 0) {
      const exact = findExactVariant(activeVariants, selectedFlavor, selectedSize);
      if (!exact) {
        const first = activeVariants[0];
        if (first.flavor) setSelectedFlavor(first.flavor);
        if (first.size || first.name) setSelectedSize(first.size || first.name);
      }
    } else {
      if (availableFlavors.length > 0 && !selectedFlavor) {
        setSelectedFlavor(availableFlavors[0]);
      }
      if (availableSizes.length > 0 && !selectedSize) {
        setSelectedSize(availableSizes[0]);
      }
    }
  }, [activeVariants, availableFlavors, availableSizes]);

  // 5. Exact Active Variant Resolution & Dynamic Pricing
  const activeVariant = useMemo(() => {
    if (activeVariants.length === 0) return null;
    return resolveCompoundVariant(activeVariants, selectedFlavor, selectedSize);
  }, [activeVariants, selectedFlavor, selectedSize]);

  const currentPriceAed = activeVariant 
    ? Number(activeVariant.priceAed || activeVariant.priceAED || 0) 
    : Number((product as any)?.basePriceAed || product?.priceAed || 0);

  const currentPriceToman = useMemo(() => {
    if (activeVariant && Number((activeVariant as any).manualPriceToman) > 0) {
      return Number((activeVariant as any).manualPriceToman);
    }
    if (activeVariant && Number(activeVariant.priceToman) > 0) {
      return Number(activeVariant.priceToman);
    }
    if ((product as any)?.manualPriceToman && Number((product as any).manualPriceToman) > 0) {
      return Number((product as any).manualPriceToman);
    }
    if ((product as any)?.priceToman) {
      return Number((product as any).priceToman);
    }
    const margin = (product as any).profitMargin !== undefined ? (product as any).profitMargin : profitMargin;
    return Number(calculateProductTomanPrice({
      priceAed: currentPriceAed,
      profitMarginPercent: margin,
      aedToTomanRate: aedRate,
      baseShippingAed: 20
    }));
  }, [activeVariant, (product as any)?.manualPriceToman, (product as any)?.priceToman, (product as any)?.profitMargin, profitMargin, currentPriceAed, aedRate]);

  // Compute active combination stock availability
  const isComboAvailable = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return product.inStock !== false;
    }
    if (selectedFlavor && selectedSize) {
      const exact = product.variants.find(
        (v: any) => cleanStr(v.flavor) === cleanStr(selectedFlavor) && cleanSize(v.size) === cleanSize(selectedSize)
      );
      if (!exact) return false;
      return exact.inStock !== false;
    }
    if (activeVariant) {
      return activeVariant.inStock !== false;
    }
    return product.inStock !== false;
  }, [product.variants, product.inStock, selectedFlavor, selectedSize, activeVariant]);

  // Gallery list construction
  const rawImages = product.images || (product as any).galleryImages || (product.imageUrl ? [product.imageUrl] : [product.image]);
  const galleryList = useMemo(() => {
    const list = Array.isArray(rawImages) ? rawImages.filter(Boolean) : [];
    if (activeVariant?.image && !list.includes(activeVariant.image)) {
      list.unshift(activeVariant.image);
    }
    return list;
  }, [rawImages, activeVariant]);

  const mainDisplayImage = useMemo(() => {
    if (selectedGalleryImage && selectedGalleryImage.trim() !== '') {
      return selectedGalleryImage.trim();
    }
    return resolveVariantHeroImage(
      product.variants || [],
      selectedFlavor,
      selectedSize,
      product.imageUrl || product.image || (product as any)?.mainImage
    );
  }, [selectedGalleryImage, product.variants, selectedFlavor, selectedSize, product.imageUrl, product.image]);

  const handleAddToCart = () => {
    if (!isComboAvailable) return;
    const payload = {
      id: `${product.id || product.url || product.title}_${selectedSize}_${selectedFlavor}`,
      title: product.titleFa || product.title,
      priceAED: currentPriceAed,
      priceToman: currentPriceToman,
      selectedSize,
      selectedFlavor,
      imageUrl: mainDisplayImage,
      quantity,
      product
    };

    if (onAddToCart) {
      onAddToCart(payload);
    } else {
      addToCart(payload);
    }

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm font-['Vazirmatn',sans-serif]" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Product Image Stage (Purged of clutter) */}
        <div className="flex flex-col space-y-3">
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 relative min-h-[300px]">
            {mainDisplayImage ? (
              <img
                src={mainDisplayImage}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="max-h-80 w-auto object-contain transition-all duration-300 hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = product.image || product.imageUrl || '/placeholder-supplement.png';
                }}
              />
            ) : (
              <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400">
                بدون تصویر
              </div>
            )}

            {!isComboAvailable && (
              <span className="absolute top-3.5 left-3.5 bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-xl shadow-xs">
                ناموجود
              </span>
            )}
          </div>

          {/* Gallery Thumbnails */}
          {galleryList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 dir-ltr no-scrollbar">
              {galleryList.map((imgUrl, idx) => {
                const isSelected = (mainDisplayImage === imgUrl);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedGalleryImage(imgUrl)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-gray-800 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'border-red-600 ring-2 ring-red-600/20'
                        : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`View ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Info, Clean Dual Pricing & Smart Variant Selectors */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Store / Brand Badge Cleanly Above Title */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                style={storeBadge.style}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${storeBadge.bg}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${storeBadge.dot} animate-pulse`}
                  style={storeBadge.dotStyle}
                />
                <span>{storeBadge.name}</span>
              </span>

              {product.brand && product.brand !== storeBadge.name && (
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  {product.brand}
                </span>
              )}
            </div>

            {/* Bilingual Titles */}
            <div>
              <h1 className="text-base sm:text-lg font-black text-gray-950 dark:text-white leading-relaxed">
                {product.titleFa || product.title}
              </h1>
              {product.titleEn && product.titleEn !== (product.titleFa || product.title) && (
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 dir-ltr text-right">
                  {product.titleEn}
                </p>
              )}
            </div>

            {/* Clean White High-Contrast Pricing Box */}
            <div className="grid grid-cols-2 gap-3 my-5" dir="rtl">
              {/* Right Box: Toman Price (Delivered Iran) */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-red-100 rounded-2xl shadow-sm text-center">
                <span className="text-[12px] font-bold text-gray-500 mb-1">تحویل ایران</span>
                <div className="flex items-center justify-center gap-1 font-black text-xl text-red-600">
                  <span>{Number(currentPriceToman || 0).toLocaleString('fa-IR')}</span>
                  <span className="text-xs font-bold">تومان</span>
                </div>
              </div>

              {/* Left Box: AED Dubai Price */}
              <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm text-center">
                <span className="text-[12px] font-bold text-gray-500 mb-1">قیمت درهم (دبی)</span>
                <div className="flex items-center justify-center gap-1.5 font-black text-xl text-gray-900" dir="ltr">
                  <span className="text-xs font-black text-emerald-600">AED</span>
                  <span>{Number(currentPriceAed || 0).toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>

            {/* Flavor Selector */}
            {availableFlavors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 block">
                    طعم (Flavor):
                  </span>
                  {selectedFlavor && (
                    <span className="text-xs font-black text-slate-900">
                      {translateFlavor(selectedFlavor)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 my-2">
                  {availableFlavors.map((flavor: string) => {
                    const isSelected = matchVariantValues(selectedFlavor, flavor);
                    const isAvailable = isFlavorAvailable(flavor);
                    const pureLabel = translateFlavor(flavor);

                    return (
                      <button
                        key={flavor}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleFlavorClick(flavor)}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-500/20 border-red-600'
                            : isAvailable
                            ? 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 cursor-pointer'
                            : 'opacity-25 line-through cursor-not-allowed pointer-events-none bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                        }`}
                      >
                        {pureLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector */}
            {availableSizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 block">
                    وزن / سایز (Size):
                  </span>
                  {selectedSize && (
                    <span className="text-xs font-black text-slate-900">
                      {formatPersianSize(selectedSize)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 my-2">
                  {availableSizes.map((size: string) => {
                    const isSelected = matchVariantValues(selectedSize, size);
                    const isAvailable = isSizeAvailable(size);
                    const pureLabel = formatPersianSize(size);

                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSizeClick(size)}
                        className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-500/20 border-red-600'
                            : isAvailable
                            ? 'bg-white text-gray-800 border border-gray-200 hover:border-gray-400 cursor-pointer'
                            : 'opacity-25 line-through cursor-not-allowed pointer-events-none bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                        }`}
                      >
                        {pureLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Button & Quantity */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            {/* Quantity */}
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 px-2 py-1 gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-black dark:hover:text-white"
              >
                -
              </button>
              <span className="text-xs font-black min-w-[16px] text-center">
                {quantity.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-black dark:hover:text-white"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <button
              type="button"
              disabled={!isComboAvailable}
              onClick={handleAddToCart}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isComboAvailable
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-gray-700'
                  : isAdded
                  ? 'bg-red-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-md active:scale-95'
              }`}
            >
              {!isComboAvailable ? (
                <>
                  <AlertCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span>ناموجود در این مشخصات</span>
                </>
              ) : isAdded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>به سبد اضافه شد ✓</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>افزودن به سبد خرید</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Additional Information & Original Product Link Section */}
      {(() => {
        const rawUrl = (product?.sourceUrl || product?.url || (product as any)?.originalUrl || (product as any)?.productUrl || (product as any)?.link || (product as any)?.rawItem?.sourceUrl || (product as any)?.rawItem?.url || '');
        const hasValidUrl = typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'));

        return (
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 text-right">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-extrabold text-sm">
                  <Info className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>مشخصات تکمیلی و منبع رسمی محصول</span>
                </div>
                <span
                  style={storeBadge.style}
                  className={`text-xs font-extrabold px-3 py-1 rounded-full ${storeBadge.bg}`}
                >
                  {storeBadge.name}
                </span>
              </div>

              {/* Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 font-medium">فروشگاه مبدأ:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{storeBadge.name}</span>
                </div>
                {product.brand && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="text-slate-400 font-medium">برند:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{product.brand}</span>
                  </div>
                )}
                <div className="flex items-center justify-between bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-400 font-medium">اصالت کالا:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>۱۰۰٪ پلمپ و اورجینال</span>
                  </span>
                </div>
              </div>

              {/* Clickable Original Product Link Button */}
              {hasValidUrl && (
                <div className="pt-2">
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white font-extrabold text-xs sm:text-sm flex items-center justify-between transition-all group shadow-xs cursor-pointer select-none"
                    title="مشاهده صفحه این محصول در سایت اصلی فروشگاه"
                  >
                    <span className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>مشاهده در وبسایت رسمی {storeBadge.name}</span>
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-300 font-bold group-hover:text-slate-900 dark:group-hover:text-white">
                      <span>لینک اصلی کالا</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

