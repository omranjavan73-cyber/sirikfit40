import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal';
import type { FinancialSettings } from '../types';

export interface PopularProductItem {
  id: string;
  title: string;
  image: string;
  price?: number | string;
  discountedPrice?: number | string;
  filterKey?: string;
  rawItem?: any;
  type?: 'local' | 'deal' | 'custom';
}

const DEFAULT_POPULAR_PRODUCTS: PopularProductItem[] = [
  {
    id: 'whey-protein',
    title: 'پروتئین وی طعم‌دار',
    price: 3450000,
    filterKey: 'whey',
    image: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'creatine-monohydrate',
    title: 'کراتین مونوهیدرات',
    price: 1850000,
    filterKey: 'creatine',
    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'multivitamin-men',
    title: 'مولتی ویتامین',
    price: 980000,
    filterKey: 'vitamin',
    image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'c4-preworkout',
    title: 'پمپ C4 Extreme',
    price: 2150000,
    filterKey: 'pre',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'omega-gnc',
    title: 'امگا ۳ فشرده GNC',
    price: 1290000,
    filterKey: 'omega',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80',
    type: 'custom'
  },
  {
    id: 'gainer-weight',
    title: 'گینر افزایش وزن',
    price: 2890000,
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
  const list = (rawList && rawList.length > 0) ? rawList : DEFAULT_POPULAR_PRODUCTS;

  const handleItemClick = (prod: PopularProductItem) => {
    setSelectedPopularForModal(prod);
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: 23000
  };

  const resolveItemPrice = (item: PopularProductItem): number | null => {
    const p = item.price || item.discountedPrice;
    if (p !== undefined && p !== null && !isNaN(Number(p)) && Number(p) > 0) {
      return Number(p);
    }
    if (item.rawItem) {
      if (item.rawItem.priceToman && Number(item.rawItem.priceToman) > 0) {
        return Number(item.rawItem.priceToman);
      }
      if (item.rawItem.calculatedToman && Number(item.rawItem.calculatedToman) > 0) {
        return Number(item.rawItem.calculatedToman);
      }
      if (item.rawItem.priceAed && Number(item.rawItem.priceAed) > 0) {
        const rate = defaultSettings.aedRate || 23000;
        const cargoCost = (item.rawItem.weightKg || 0.5) * (defaultSettings.cargoRatePerKg || 35);
        const subtotal = item.rawItem.priceAed + cargoCost;
        return Math.round(subtotal * (1 + (defaultSettings.profitMargin || 20) / 100) * rate);
      }
    }
    return null;
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

      {/* Horizontal Row with Subtle Hover-Only Side Arrows and White Circular Product Badges */}
      <div className="relative flex items-center w-full">
        {/* Right Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('right')}
          className="absolute right-0 z-20 w-7 h-7 rounded-full bg-white/90 border border-slate-200/80 text-slate-400 hover:text-slate-900 hover:bg-white shadow-2xs flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-80 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
          title="بعدی"
        >
          <ChevronRight className="w-4 h-4 stroke-[2]" />
        </button>

        {/* Scrollable Container with Story Cards */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 px-1 dir-rtl scroll-smooth w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {list.map((item) => {
            const numericPrice = resolveItemPrice(item);
            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="flex flex-col items-center text-center shrink-0 w-20 sm:w-24 gap-1 select-none cursor-pointer group transition-transform duration-200 hover:-translate-y-0.5 overflow-hidden"
              >
                {/* Story Avatar Frame */}
                <div className="relative w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full p-0.5 border border-slate-200/90 bg-white shadow-xs hover:shadow-md group-hover:border-slate-600 flex items-center justify-center overflow-hidden transition-all duration-200 shrink-0">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>

                {/* Product Title */}
                <span className="text-slate-800 font-semibold text-[11px] truncate w-full text-center px-1">
                  {item.title}
                </span>

                {/* Product Price */}
                <span className="text-[11px] font-bold text-red-600 dark:text-red-500 dir-rtl tracking-tight mt-0.5 flex items-center justify-center">
                  {numericPrice ? (
                    <>
                      <span>{Number(numericPrice).toLocaleString('fa-IR')}</span>
                      <span className="text-[10px] font-semibold text-red-500/80 mr-0.5">تومان</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500">استعلام قیمت</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Left Nav Arrow */}
        <button
          type="button"
          onClick={() => scroll('left')}
          className="absolute left-0 z-20 w-7 h-7 rounded-full bg-white/90 border border-slate-200/80 text-slate-400 hover:text-slate-900 hover:bg-white shadow-2xs flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-80 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
          title="قبلی"
        >
          <ChevronLeft className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Embedded Product Details Modal (Matching Featured Deals) */}
      <ProductDetailModal
        isOpen={!!selectedPopularForModal}
        onClose={() => setSelectedPopularForModal(null)}
        product={selectedPopularForModal ? {
          title: selectedPopularForModal.title,
          url: selectedPopularForModal.rawItem?.url || 'https://drnutrition.com',
          priceAed: selectedPopularForModal.rawItem?.priceAed || (selectedPopularForModal.type === 'local' ? Math.round((selectedPopularForModal.rawItem?.priceToman || 0) / defaultSettings.aedRate) : 150),
          originalPriceAed: selectedPopularForModal.rawItem?.originalPriceAed || 0,
          weightKg: selectedPopularForModal.rawItem?.weightKg || 0.5,
          image: selectedPopularForModal.image,
          storeName: selectedPopularForModal.type === 'local' ? 'انبار ایران (تحویل فوری)' : (selectedPopularForModal.rawItem?.storeName || 'فروشگاه دبی'),
          brand: selectedPopularForModal.type === 'local' ? 'انبار ایران' : (selectedPopularForModal.rawItem?.brand || 'دبی'),
          category: selectedPopularForModal.rawItem?.category || (selectedPopularForModal.type === 'local' ? 'موجودی ایران' : 'پرطرفدارها'),
          description: selectedPopularForModal.rawItem?.description || '',
          badge: selectedPopularForModal.type === 'local' ? 'موجودی در ایران (تحویل فوری ۲۴ الی ۴۸ ساعته)' : 'ارسال سفارشی از دبی (تحویل ۷ الی ۱۴ روز کاری درب منزل)',
          calculatedTomanOverride: selectedPopularForModal.type === 'local' ? selectedPopularForModal.rawItem?.priceToman : undefined,
          isLocalInventory: selectedPopularForModal.type === 'local',
          flavors: selectedPopularForModal.rawItem?.flavors || [],
          sizes: selectedPopularForModal.rawItem?.sizes || []
        } : null}
        settings={defaultSettings}
        onAddToCart={(productPayload, flavor, size) => {
          if (onAddToCart) {
            onAddToCart(productPayload, flavor, size);
          } else if (onSelectProduct && selectedPopularForModal) {
            onSelectProduct(selectedPopularForModal);
          }
          setSelectedPopularForModal(null);
        }}
      />
    </div>
  );
};

