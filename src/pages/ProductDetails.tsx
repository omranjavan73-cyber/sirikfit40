import React, { useState, useMemo, useEffect } from 'react';
import type { NormalizedProduct, ProductVariant } from '../types';
import { useCart } from '../context/CartContext';
import { formatToman, toPersianDigits } from '../utils/formatters';
import { parseWeightKg, computeVariantToman } from '../utils/pricingCalculator';
import { ShoppingCart, Check, AlertCircle, Sparkles, Scale } from 'lucide-react';

interface ProductDetailsProps {
  product: NormalizedProduct;
  aedRate?: number;
  cargoRatePerKg?: number;
  profitMargin?: number;
  onAddToCart?: (item: any) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  aedRate = 55000,
  cargoRatePerKg = 35,
  profitMargin = 20,
  onAddToCart
}) => {
  // 1. Collect all unique flavors and sizes directly from the saved variants array
  const availableFlavors = useMemo(() => {
    const set = new Set<string>();
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v: any) => {
        if (v.flavor) set.add(v.flavor);
      });
    }
    if (set.size === 0 && product.flavors && product.flavors.length > 0) {
      product.flavors.forEach((f: any) => {
        const name = typeof f === 'string' ? f : (f?.name || f?.flavor);
        if (name) set.add(name);
      });
    }
    return Array.from(set);
  }, [product]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v: any) => {
        if (v.size) set.add(v.size);
      });
    }
    if (set.size === 0 && product.sizes && product.sizes.length > 0) {
      product.sizes.forEach((s: any) => {
        const name = typeof s === 'string' ? s : (s?.name || s?.label || s?.size);
        if (name) set.add(name);
      });
    }
    return Array.from(set);
  }, [product]);

  // 2. Selection State
  const [selectedFlavor, setSelectedFlavor] = useState<string>(availableFlavors[0] || '');
  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0] || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAdded, setIsAdded] = useState<boolean>(false);

  // Sync state if options change
  useEffect(() => {
    if (availableFlavors.length > 0 && (!selectedFlavor || !availableFlavors.includes(selectedFlavor))) {
      setSelectedFlavor(availableFlavors[0]);
    }
  }, [availableFlavors]);

  useEffect(() => {
    if (availableSizes.length > 0 && (!selectedSize || !availableSizes.includes(selectedSize))) {
      setSelectedSize(availableSizes[0]);
    }
  }, [availableSizes]);

  // 3. Resolve active variant & matching price
  const activeVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return null;

    // Exact match (Flavor + Size)
    const exact = product.variants.find(
      (v: any) =>
        (!selectedFlavor || v.flavor === selectedFlavor) &&
        (!selectedSize || v.size === selectedSize)
    );
    if (exact) return exact;

    // Match flavor only
    const matchFlavor = product.variants.find((v: any) => v.flavor === selectedFlavor);
    if (matchFlavor) return matchFlavor;

    // Match size only
    const matchSize = product.variants.find((v: any) => v.size === selectedSize);
    if (matchSize) return matchSize;

    return product.variants[0];
  }, [product.variants, selectedFlavor, selectedSize]);

  // 4. Compute active dynamic prices & stock
  const currentPriceAed = activeVariant?.priceAed ?? activeVariant?.priceAED ?? activeVariant?.price ?? product.priceAED ?? product.priceAed ?? product.price ?? 0;
  const currentOriginalPriceAed = activeVariant?.originalPriceAed ?? activeVariant?.originalPriceAED ?? activeVariant?.originalPrice ?? product.originalPriceAED ?? product.originalPriceAed ?? product.originalPrice;
  const effectiveWeightKg = parseWeightKg(activeVariant?.size || selectedSize, activeVariant?.weightKg || product.weightKg || 0.8);

  const currentPriceToman = useMemo(() => {
    if (activeVariant?.priceToman && activeVariant.priceToman > 0) {
      return activeVariant.priceToman;
    }
    return computeVariantToman(currentPriceAed, activeVariant?.size || selectedSize, effectiveWeightKg, {
      aedRate,
      cargoRatePerKg,
      profitMargin
    });
  }, [activeVariant, currentPriceAed, effectiveWeightKg, selectedSize, cargoRatePerKg, profitMargin, aedRate]);

  const activeImage = activeVariant?.image || product.imageUrl || product.image || product.mainImage || '';
  const isAvailable = activeVariant ? (activeVariant.inStock !== false) : (product.inStock !== false);

  const handleAddToCart = () => {
    if (!isAvailable) return;
    const payload = {
      id: `${product.id || product.url || product.title}_${selectedSize}_${selectedFlavor}`,
      title: product.title,
      priceAED: currentPriceAed,
      priceToman: currentPriceToman,
      selectedSize,
      selectedFlavor,
      imageUrl: activeImage,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Image */}
        <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 relative">
          {activeImage ? (
            <img
              src={activeImage}
              alt={product.title}
              className="max-h-80 w-auto object-contain transition-all duration-300 hover:scale-105"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400">
              بدون تصویر
            </div>
          )}

          {!isAvailable && (
            <span className="absolute top-3 right-3 bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-xl shadow-xs">
              ناموجود
            </span>
          )}
        </div>

        {/* Product Info & Controls */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {product.brand && (
                <span className="text-xs font-black text-red-600 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-lg">
                  {product.brand}
                </span>
              )}
              {((product as any).isFeatured || (product as any).isPopular) && (
                <span className="text-xs font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>پرطرفدار</span>
                </span>
              )}
            </div>

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

            {/* Price Box */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 block mb-0.5">قیمت نهایی تحویل ایران:</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-600">
                    {formatToman(currentPriceToman)}
                  </span>
                  <span className="text-xs font-bold text-gray-500">تومان</span>
                </div>
              </div>
              <div className="text-left dir-ltr">
                <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 block">
                  {currentPriceAed} AED
                </span>
                {currentOriginalPriceAed && currentOriginalPriceAed > currentPriceAed && (
                  <span className="text-[11px] font-mono text-gray-400 line-through">
                    {currentOriginalPriceAed} AED
                  </span>
                )}
              </div>
            </div>

            {/* Flavor Swatches */}
            {availableFlavors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    انتخاب طعم:
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {selectedFlavor}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableFlavors.map((flv) => {
                    const isSelected = selectedFlavor === flv;
                    return (
                      <button
                        key={flv}
                        type="button"
                        onClick={() => setSelectedFlavor(flv)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs ring-2 ring-black/20'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {flv}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Swatches */}
            {availableSizes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    انتخاب سایز / وزن:
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {selectedSize}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableSizes.map((sz) => {
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs ring-2 ring-black/20'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {sz}
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
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                -
              </button>
              <span className="text-xs font-black min-w-[16px] text-center">
                {toPersianDigits(quantity)}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-6 h-6 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleAddToCart}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isAvailable
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black hover:bg-gray-900 text-white shadow-md'
              }`}
            >
              {!isAvailable ? (
                <>
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  <span>ناموجود در این ترکیب</span>
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
    </div>
  );
};
