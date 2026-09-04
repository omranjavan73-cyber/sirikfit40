import React, { useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal';
import type { FinancialSettings } from '../types';
import { getEffectiveAedRate, calculateFinalToman, formatPrice } from '../utils/formatters';

export interface PopularProductItem {
  id: string;
  title: string;
  titleFa?: string;
  name?: string;
  image: string;
  imageUrl?: string;
  galleryImages?: string[];
  filterKey?: string;
  rawItem?: any;
  type?: 'local' | 'deal' | 'custom';
  samplePriceAed?: number;
  sampleWeightKg?: number;
  priceToman?: number;
  priceAed?: number;
  profitMargin?: number;
  marginPercent?: number;
  weightKg?: number;
  popularOrder?: number;
  isPopular?: boolean;
}



interface PopularProductsCarouselProps {
  onSelectCategory?: (categoryKey: string) => void;
  onSelectProduct?: (item: PopularProductItem) => void;
  products?: PopularProductItem[];
  items?: PopularProductItem[];
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PopularProductsCarousel: React.FC<PopularProductsCarouselProps> = ({
  onSelectCategory,
  onSelectProduct,
  products,
  items,
  settings,
  onAddToCart
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedPopularForModal, setSelectedPopularForModal] = useState<PopularProductItem | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -240 : 240;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const list = useMemo(() => {
    const raw = items || products || [];
    const filtered = raw.filter(prod => {
      if (!prod || !prod.id) return false;
      const t = (prod.title || prod.titleFa || prod.name || (prod.rawItem && (prod.rawItem.title || prod.rawItem.name)) || '').trim();
      return t && t !== 'محصول پرطرفدار' && t !== 'بدون عنوان' && t !== 'محصول بدون عنوان';
    });

    // If items were passed from ProductContext, they are already pre-sorted by canonical order.
    // If only an unsorted products array was provided, sort ascending by popularOrder (0, 1, 2...)
    if (!items && products) {
      return filtered.sort((a: any, b: any) => {
        const orderA = typeof a.popularOrder === 'number' && a.popularOrder >= 0 ? a.popularOrder : 9999;
        const orderB = typeof b.popularOrder === 'number' && b.popularOrder >= 0 ? b.popularOrder : 9999;
        if (orderA !== orderB) return orderA - orderB;
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.sectionAddedAt || a.updatedAt || 0).getTime();
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.sectionAddedAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    }

    return filtered;
  }, [items, products]);

  if (!list || list.length === 0) {
    return null;
  }

  const handleItemClick = (prod: PopularProductItem) => {
    if (onSelectProduct) {
      onSelectProduct(prod);
    } else if (onSelectCategory && prod.filterKey) {
      onSelectCategory(prod.filterKey);
    }
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: 54500
  };

  return (
    <div id="popular-products-carousel" className="w-full font-['Vazirmatn',sans-serif] mt-2 mb-1 py-0.5 group/carousel relative">
      {/* Title Header with Four-Dot Icon (Right-Aligned) */}
      <div dir="rtl" className="flex items-center justify-start gap-1.5 mb-1.5 px-2 text-right pr-2">
        <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0 text-slate-900">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
        </div>
        <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
          پرطرفدارها
        </h3>
      </div>

      {/* Horizontal Row with Hover Nav Arrows and Enhanced Circles */}
      <div className="relative flex items-center w-full">
        {/* Right Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-1 z-20 w-7 h-7 rounded-full bg-white/95 border border-slate-200/90 text-slate-500 hover:text-slate-900 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-90 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
          title="بعدی"
        >
          <ChevronRight className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Scrollable Container with Generous Safe Horizontal Gap */}
        <div
          ref={scrollRef}
          dir="rtl"
          className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar py-3 px-4 scroll-smooth w-full items-start"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {list.map((prod) => {
            const effectiveRate = getEffectiveAedRate(settings) || defaultSettings.aedRate || 54500;
            const rawItem = prod.rawItem;
            let priceVal: number | null = null;

            if (prod.priceToman && prod.priceToman > 0) {
              priceVal = prod.priceToman;
            } else if (rawItem?.priceToman && rawItem.priceToman > 0) {
              priceVal = rawItem.priceToman;
            } else if (rawItem?.calculatedTomanOverride && rawItem.calculatedTomanOverride > 0) {
              priceVal = rawItem.calculatedTomanOverride;
            } else if (rawItem?.calculatedToman && rawItem.calculatedToman > 0) {
              priceVal = rawItem.calculatedToman;
            } else if (prod.priceAed && prod.priceAed > 0) {
              const margin = prod.profitMargin ?? prod.marginPercent ?? defaultSettings.profitMargin ?? 20;
              const cargo = (prod.weightKg || 0.5) * (defaultSettings.cargoRatePerKg || 35) * effectiveRate;
              priceVal = Math.floor(((prod.priceAed * effectiveRate * (1 + margin / 100)) + cargo) / 1000) * 1000;
            } else if (rawItem?.priceAed && rawItem.priceAed > 0) {
              const margin = rawItem.profitMargin ?? rawItem.marginPercent ?? defaultSettings.profitMargin ?? 20;
              const cargo = (rawItem.weightKg || 0.5) * (defaultSettings.cargoRatePerKg || 35) * effectiveRate;
              priceVal = Math.floor(((rawItem.priceAed * effectiveRate * (1 + margin / 100)) + cargo) / 1000) * 1000;
            } else if (prod.samplePriceAed && prod.samplePriceAed > 0) {
              const margin = defaultSettings.profitMargin ?? 20;
              const cargo = (prod.sampleWeightKg || 0.5) * (defaultSettings.cargoRatePerKg || 35) * effectiveRate;
              priceVal = Math.floor(((prod.samplePriceAed * effectiveRate * (1 + margin / 100)) + cargo) / 1000) * 1000;
            }

            const itemImage = prod.image || prod.imageUrl || (rawItem && (rawItem.image || rawItem.imageUrl)) || (prod.galleryImages && prod.galleryImages[0]) || '';
            const itemTitle = prod.title || prod.titleFa || prod.name || (rawItem && (rawItem.title || rawItem.name)) || '';

            return (
              <div
                key={prod.id}
                onClick={() => handleItemClick(prod)}
                className="flex-shrink-0 w-24 sm:w-28 md:w-32 flex flex-col items-center justify-between text-center px-1 cursor-pointer group select-none transition-transform duration-200 hover:-translate-y-0.5"
              >
                {/* Double-Ring Circle Container: Outer Ring + Clean Thick White Middle Band */}
                <div className="w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full border border-gray-200/90 bg-white p-[3px] shadow-sm transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center">
                  {/* Inner Image Frame: Micro Inner Border + Overflow Hidden */}
                  <div className="w-full h-full rounded-full border border-gray-200/70 overflow-hidden bg-white flex items-center justify-center p-1">
                    <img
                      src={itemImage}
                      alt={itemTitle}
                      className="w-full h-full object-contain select-none group-hover:scale-110 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
                      }}
                    />
                  </div>
                </div>

                {/* Product Persian Title Below Circle */}
                <span className="text-[11px] md:text-xs font-medium text-gray-700 group-hover:text-gray-900 mt-1.5 w-full truncate px-1 text-center">
                  {itemTitle}
                </span>

                {/* Price Badge Overhaul: Standalone, Compact, Elegant Pill Badge */}
                {priceVal !== null && (
                  <div className="mt-1 w-full flex justify-center">
                    <span className="inline-flex items-center justify-center bg-red-600 text-white font-extrabold text-[10px] md:text-[11px] px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap tracking-tight">
                      {formatPrice(priceVal)} تومان
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Left Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-1 z-20 w-7 h-7 rounded-full bg-white/95 border border-slate-200/90 text-slate-500 hover:text-slate-900 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-90 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
          title="قبلی"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Embedded Product Details Modal (Matching Featured Deals) */}
      {(() => {
        if (!selectedPopularForModal) return null;
        const effectiveRate = getEffectiveAedRate(settings) || defaultSettings.aedRate || 55000;
        const cargoRate = defaultSettings.cargoRatePerKg || 35;
        const isLocal = selectedPopularForModal.type === 'local';
        const raw = selectedPopularForModal.rawItem || {};
        
        let priceTomanVal: number | undefined = undefined;
        let profitMarginVal: number = defaultSettings.profitMargin || 20;

        if (raw.priceToman && raw.priceToman > 0) {
          priceTomanVal = raw.priceToman;
        } else if (raw.calculatedTomanOverride && raw.calculatedTomanOverride > 0) {
          priceTomanVal = raw.calculatedTomanOverride;
        } else if (raw.calculatedToman && raw.calculatedToman > 0) {
          priceTomanVal = raw.calculatedToman;
        } else if (isLocal) {
          priceTomanVal = raw.priceToman;
        } else if (selectedPopularForModal.type === 'deal') {
          profitMarginVal = raw.profitMargin !== undefined ? raw.profitMargin : (raw.marginPercent !== undefined ? raw.marginPercent : (defaultSettings.profitMargin || 20));
          priceTomanVal = calculateFinalToman(
            raw.priceAed || raw.price || 0,
            raw.weightKg || 0.5,
            cargoRate,
            profitMarginVal,
            effectiveRate
          );
        } else {
          priceTomanVal = calculateFinalToman(
            150,
            0.5,
            cargoRate,
            profitMarginVal,
            effectiveRate
          );
        }

        const modalProduct = {
          id: raw.id || selectedPopularForModal.id,
          title: selectedPopularForModal.title,
          url: raw.url || 'https://drnutrition.com',
          priceAed: raw.priceAed || (isLocal ? Math.round((raw.priceToman || 0) / effectiveRate) : 150),
          originalPriceAed: raw.originalPriceAed || 0,
          priceToman: priceTomanVal,
          originalPriceToman: raw.originalPriceToman,
          calculatedTomanOverride: priceTomanVal,
          profitMargin: profitMarginVal,
          weightKg: raw.weightKg || 0.5,
          image: selectedPopularForModal.image,
          storeName: isLocal ? 'انبار ایران (تحویل فوری)' : (raw.storeName || 'فروشگاه دبی'),
          brand: isLocal ? 'انبار ایران' : (raw.brand || 'دبی'),
          category: raw.category || (isLocal ? 'موجودی ایران' : 'پرطرفدارها'),
          description: raw.description || '',
          badge: isLocal ? (raw.deliveryBadge || 'موجود در انبار ایران (تحویل فوری)') : 'ارسال سفارشی از دبی (تحویل ۷ الی ۱۴ روز کاری درب منزل)',
          isLocalInventory: isLocal,
          flavors: raw.flavors || [],
          sizes: raw.sizes || []
        };

        return (
          <ProductDetailModal
            isOpen={!!selectedPopularForModal}
            onClose={() => setSelectedPopularForModal(null)}
            product={modalProduct}
            settings={settings || defaultSettings}
            onAddToCart={(productPayload, flavor, size) => {
              if (onAddToCart) {
                onAddToCart(productPayload, flavor, size);
              } else if (onSelectProduct && selectedPopularForModal) {
                onSelectProduct(selectedPopularForModal);
              }
              setSelectedPopularForModal(null);
            }}
          />
        );
      })()}
    </div>
  );
};

