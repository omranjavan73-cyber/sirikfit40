import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { WarehouseCategory } from '../types';
import {
  DEFAULT_UNIFIED_CATEGORIES,
  DEFAULT_CATEGORY_IMAGES,
  getCategoryTheme,
  renderCategoryIcon,
  getCanonicalCategoryKey
} from '../utils/categoryHelper';

export { DEFAULT_UNIFIED_CATEGORIES as DEFAULT_CIRCULAR_CATEGORIES };

interface CircularCategoryRowProps {
  categories?: WarehouseCategory[];
  selectedCat?: string;
  onSelectCategory: (filterKey: string) => void;
  title?: string;
  showNavArrows?: boolean;
}

interface CategoryCircleItemProps {
  cat: WarehouseCategory;
  isActive: boolean;
  onSelect: () => void;
}

const CategoryCircleItem: React.FC<CategoryCircleItemProps> = ({ cat, isActive, onSelect }) => {
  const [imageError, setImageError] = useState(false);
  const rawKey = cat.filterKey || cat.id;
  const displayLabel = cat.label || cat.name || 'دسته‌بندی';
  const theme = getCategoryTheme(rawKey || displayLabel);
  
  // Custom image check: support imageUrl, iconUrl, or canonical image default
  const defaultImg = (DEFAULT_CATEGORY_IMAGES as any)[getCanonicalCategoryKey(rawKey || displayLabel)];
  const imageSource = cat.imageUrl || cat.iconUrl || defaultImg;
  const hasValidImage = Boolean(imageSource && typeof imageSource === 'string' && imageSource.trim().length > 0 && !imageError);

  return (
    <div
      onClick={onSelect}
      className="relative flex flex-col items-center justify-center cursor-pointer group flex-shrink-0 select-none"
    >
      {/* Double-Ring Circle Container: Outer Ring + Clean Thick White Middle Band */}
      <div
        className={`w-16 h-16 md:w-20 md:h-20 rounded-full border border-gray-200/90 bg-white p-[3px] shadow-sm transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${
          isActive ? 'ring-2 ring-red-500 border-red-300' : ''
        }`}
      >
        {/* Inner Image Container: Micro Inner Border + Overflow Hidden */}
        <div className="w-full h-full rounded-full border border-gray-200/70 overflow-hidden bg-gray-50 flex items-center justify-center relative">
          {hasValidImage ? (
            <img
              src={imageSource}
              alt={displayLabel}
              className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-1">
              <div className="transition-transform duration-200 group-hover:scale-110 flex items-center justify-center">
                {renderCategoryIcon(theme.iconName, 'w-5 h-5 sm:w-6 sm:h-6 text-slate-800 stroke-[2]')}
              </div>
              {cat.englishLabel && (
                <span className="text-[7px] font-extrabold uppercase tracking-tighter text-slate-500 leading-none mt-0.5 line-clamp-1 max-w-[90%] text-center">
                  {cat.englishLabel}
                </span>
              )}
            </div>
          )}

          {/* Active checkmark indicator badge */}
          {isActive && (
            <div className="absolute top-0.5 left-0.5 z-20 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xs border border-white">
              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
            </div>
          )}
        </div>
      </div>

      {/* Category Title */}
      <span
        className={`text-[11px] md:text-xs font-semibold mt-2 text-center truncate max-w-[68px] select-none transition-colors ${
          isActive ? 'text-red-600 font-black' : 'text-gray-700 group-hover:text-slate-950'
        }`}
      >
        {displayLabel}
      </span>
    </div>
  );
};

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

  // Merge provided categories with fallback defaults
  const catList = categories && categories.length > 0 ? categories : DEFAULT_UNIFIED_CATEGORIES;
  const canonicalSelected = getCanonicalCategoryKey(selectedCat);

  return (
    <div className="w-full font-['Vazirmatn',sans-serif] relative group/carousel my-2 py-1">
      {/* Optional Header Row */}
      {title && (
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">مشاهده سریع بر اساس دسته</span>
        </div>
      )}

      {/* Horizontal Flex Row with Smooth Navigation Controls */}
      <div className="relative flex items-center w-full">
        {showNavArrows && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute -right-1 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white shadow-md flex items-center justify-center transition-all opacity-80 group-hover/carousel:opacity-100 cursor-pointer active:scale-95 shrink-0"
            title="بعدی"
            aria-label="بعدی"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* Badges Container: Horizontal smooth scroll with hidden scrollbar */}
        <div
          ref={scrollRef}
          className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-1 dir-rtl scroll-smooth w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {catList.map((cat) => {
            const rawKey = cat.filterKey || cat.id;
            const canonicalKey = getCanonicalCategoryKey(rawKey || cat.label || cat.name);
            const isActive =
              canonicalSelected === canonicalKey ||
              selectedCat === rawKey ||
              selectedCat === cat.id ||
              (canonicalSelected === 'all' && canonicalKey === 'all');

            return (
              <CategoryCircleItem
                key={cat.id || rawKey}
                cat={cat}
                isActive={isActive}
                onSelect={() => onSelectCategory(rawKey)}
              />
            );
          })}
        </div>

        {showNavArrows && (
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute -left-1 z-20 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white shadow-md flex items-center justify-center transition-all opacity-80 group-hover/carousel:opacity-100 cursor-pointer active:scale-95 shrink-0"
            title="قبلی"
            aria-label="قبلی"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};

// Aliases for compatibility
export const CategoryPills = CircularCategoryRow;
export const CategoriesHeader = CircularCategoryRow;
