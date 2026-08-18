import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { WarehouseCategory } from '../types';

export const DEFAULT_CIRCULAR_CATEGORIES: WarehouseCategory[] = [
  {
    id: 'protein',
    label: 'پروتئین وی',
    englishLabel: 'WHEY',
    filterKey: 'protein',
    iconUrl: 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'creatine',
    label: 'کراتین',
    englishLabel: 'CREATINE',
    filterKey: 'creatine',
    iconUrl: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'omega',
    label: 'امگا ۳',
    englishLabel: 'OMEGA 3',
    filterKey: 'omega',
    iconUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'vitamin',
    label: 'مولتی ویتامین',
    englishLabel: 'MULTIVITAMIN',
    filterKey: 'vitamin',
    iconUrl: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'gainer',
    label: 'گینر',
    englishLabel: 'GAINER',
    filterKey: 'gainer',
    iconUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'amino',
    label: 'آمینو',
    englishLabel: 'AMINO',
    filterKey: 'amino',
    iconUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'pre',
    label: 'قبل تمرین',
    englishLabel: 'PRE-WORKOUT',
    filterKey: 'pre',
    iconUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 'all',
    label: 'همه کالاها',
    englishLabel: 'ALL PRODUCTS',
    filterKey: 'all',
    iconUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80'
  }
];

interface CircularCategoryRowProps {
  categories?: WarehouseCategory[];
  selectedCat?: string;
  onSelectCategory: (filterKey: string) => void;
  title?: string;
  showNavArrows?: boolean;
}

export const CircularCategoryRow: React.FC<CircularCategoryRowProps> = ({
  categories = [],
  selectedCat = 'all',
  onSelectCategory,
  title,
  showNavArrows = true
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Merge provided categories with fallback defaults if needed
  const catList = (categories && categories.length > 0) ? categories : DEFAULT_CIRCULAR_CATEGORIES;

  const getCategoryImage = (cat: WarehouseCategory): string => {
    if (cat.iconUrl) return cat.iconUrl;
    const match = DEFAULT_CIRCULAR_CATEGORIES.find(d => d.filterKey === cat.filterKey || d.id === cat.id);
    return match?.iconUrl || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';
  };

  return (
    <div className="w-full font-['Vazirmatn',sans-serif] relative group/carousel my-1 py-0.5">
      {/* Optional Header Row */}
      {title && (
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <h3 className="text-xs font-black text-slate-900">{title}</h3>
          </div>
        </div>
      )}

      {/* Horizontal Flex Row with Subtle Side Nav Arrows */}
      <div className="relative flex items-center w-full">
        {showNavArrows && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute right-0 z-20 w-7 h-7 rounded-full bg-white/90 border border-slate-200/80 text-slate-400 hover:text-slate-900 hover:bg-white shadow-2xs flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-80 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
            title="بعدی"
          >
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        )}

        {/* Horizontal Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar py-1 px-6 dir-rtl scroll-smooth w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {catList.map((cat) => {
            const filterKey = cat.filterKey || cat.id;
            const isActive = selectedCat === filterKey || selectedCat === cat.id || (selectedCat === 'all' && cat.filterKey === 'all');
            const imgSrc = getCategoryImage(cat);

            return (
              <div
                key={cat.id || filterKey}
                onClick={() => onSelectCategory(filterKey)}
                className="flex flex-col items-center shrink-0 cursor-pointer group select-none transition-transform duration-200 hover:-translate-y-0.5"
                style={{ width: '72px' }}
              >
                {/* Slimmer & Sleek Circular Badge Frame */}
                <div
                  className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full p-0.5 border bg-white shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-center overflow-hidden shrink-0 ${
                    isActive
                      ? 'border-slate-900 ring-2 ring-slate-900/20 scale-105'
                      : 'border-slate-200/90 group-hover:border-slate-600'
                  }`}
                >
                  <img
                    src={imgSrc}
                    alt={cat.label}
                    className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';
                    }}
                  />

                  {isActive && (
                    <span className="absolute top-0.5 left-0.5 z-10 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center shadow-2xs">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* Centered Persian Label Below Circle */}
                <span
                  className={`text-xs font-medium mt-1.5 text-center truncate max-w-[70px] w-full transition-colors ${
                    isActive ? 'text-slate-900 font-bold' : 'text-slate-700 group-hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </span>
              </div>
            );
          })}
        </div>

        {showNavArrows && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute left-0 z-20 w-7 h-7 rounded-full bg-white/90 border border-slate-200/80 text-slate-400 hover:text-slate-900 hover:bg-white shadow-2xs flex items-center justify-center transition-all opacity-20 group-hover/carousel:opacity-80 hover:!opacity-100 cursor-pointer active:scale-95 shrink-0"
            title="قبلی"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>
    </div>
  );
};
