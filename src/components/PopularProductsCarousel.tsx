import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal';
import type { FinancialSettings } from '../types';
import { getEffectiveAedRate, calculateFinalToman } from '../utils/formatters';

export interface PopularProductItem {
  id: string;
  title: string;
  image: string;
  filterKey?: string;
  rawItem?: any;
  type?: 'local' | 'deal' | 'custom';
}

const DEFAULT_POPULAR_PRODUCTS: PopularProductItem[] = [
  {
    id: 'whey-protein',
    title: 'پروتئین وی طعم‌دار',
    filterKey: 'whey',
    image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'creatine-monohydrate',
    title: 'کراتین مونوهیدرات',
    filterKey: 'creatine',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'multivitamin-men',
    title: 'مولتی ویتامین',
    filterKey: 'vitamin',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'c4-preworkout',
    title: 'پمپ C4 Extreme',
    filterKey: 'pre',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'omega-gnc',
    title: 'امگا ۳ فشرده GNC',
    filterKey: 'omega',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'gainer-weight',
    title: 'گینر افزایش وزن',
    filterKey: 'gainer',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  }
];

interface PopularProductsCarouselProps {
  onSelectCategory?: (categoryKey: string) => void;
  onSelectProduct?: (item: PopularProductItem) => void;
  products?: PopularProductItem[];
  items?: PopularProductItem[];
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

function getCleanShortTitle(title: string): string {
  if (!title) return '';
  // Remove parenthesized and bracketed content
  let cleaned = title.split('(')[0].split('（')[0].split('[')[0].trim();
  // Strip redundant leading "مکمل" for concise chip display
  cleaned = cleaned.replace(/^مکمل\s+/, '');
  return cleaned || title;
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
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const rawList = items || products;
  const list = rawList !== undefined ? rawList : DEFAULT_POPULAR_PRODUCTS;

  if (!list || list.length === 0) {
    return null;
  }

  const handleItemClick = (prod: PopularProductItem) => {
    setSelectedPopularForModal(prod);
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: 23000
  };

  return (
    <div id="popular-products-carousel" className="w-full font-['Vazirmatn',sans-serif] mt-2 mb-1 py-0.5 group/carousel relative">
      {/* Title Header with Four-Dot Icon (Right-Aligned) */}
      <div className="flex items-center justify-start gap-1.5 mb-1.5 px-1 text-right pr-1 dir-rtl">
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

      {/* Horizontal Row with Subtle Navigation Arrows and White Circular Product Badges */}
      <div className="relative flex items-center w-full group">
        {/* Right Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute z-10 -right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/80 shadow-sm border border-gray-200 text-slate-400 opacity-40 hover:opacity-100 hover:bg-white hover:text-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 shrink-0"
          title="بعدی"
          aria-label="بعدی"
        >
          <ChevronRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Scrollable Container (Forces exactly 4 items on mobile screens) */}
        <div
          ref={scrollRef}
          className="flex items-start justify-between gap-2 overflow-x-auto no-scrollbar px-3 py-2 w-full select-none dir-rtl scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {list.map((prod) => {
            const rawTitle = prod.title || (prod as any).name || '';
            const shortTitle = (prod as any).shortName || getCleanShortTitle(rawTitle);
            const imgSrc = prod.image || (prod as any).imageUrl || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';

            return (
              <div
                key={prod.id}
                onClick={() => handleItemClick(prod)}
                className="flex flex-col items-center flex-shrink-0 w-[72px] sm:w-[80px] cursor-pointer group select-none"
              >
                {/* 1. THE THICK WHITE FRAME (This creates the white padding and outer shadow) */}
                <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-white p-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-center transition-all duration-300 group-hover:shadow-md group-hover:-translate-y-0.5">
                  {/* 2. THE INNER IMAGE (Clipped perfectly inside the white frame) */}
                  <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img
                      src={imgSrc}
                      alt={rawTitle}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>
                </div>

                {/* 3. TRUNCATED TITLE (Ensures 4 items fit perfectly on mobile) */}
                <span className="text-[10px] sm:text-[11px] font-medium text-slate-700 mt-2 text-center w-full truncate px-0.5 block leading-tight">
                  {shortTitle}
                </span>
              </div>
            );
          })}
        </div>

        {/* Left Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute z-10 -left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/80 shadow-sm border border-gray-200 text-slate-400 opacity-40 hover:opacity-100 hover:bg-white hover:text-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 shrink-0"
          title="قبلی"
          aria-label="قبلی"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
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
            raw.priceAed || 100,
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
          badge: isLocal ? 'موجودی در ایران (تحویل فوری ۲۴ الی ۴۸ ساعته)' : 'ارسال سفارشی از دبی (تحویل ۷ الی ۱۴ روز کاری درب منزل)',
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
