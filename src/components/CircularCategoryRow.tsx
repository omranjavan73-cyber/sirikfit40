import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { WarehouseCategory } from '../types';
import { SirikFitLogo } from './SirikFitLogo';
import {
  DEFAULT_UNIFIED_CATEGORIES,
  getCategoryTheme,
  renderCategoryIcon,
  getCanonicalCategoryKey,
  getCategoryImageUrl
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
  const canonical = getCanonicalCategoryKey(rawKey || displayLabel);
  const isAllCategory = canonical === 'all';
  const theme = getCategoryTheme(rawKey || displayLabel);
  
  // Custom image check: support imageUrl, iconUrl, or category photo fallback
  const fallbackImage = getCategoryImageUrl(rawKey || displayLabel);
  const imageSource = cat.imageUrl || cat.iconUrl || fallbackImage;
  const hasValidImage = Boolean(imageSource && typeof imageSource === 'string' && imageSource.trim().length > 0 && !imageError);

  return (
    <div
      onClick={onSelect}
      className="flex flex-col items-center flex-shrink-0 w-[72px] sm:w-[80px] cursor-pointer group select-none"
    >
      {/* 1. THE THICK WHITE FRAME */}
      <div
        className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-white p-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border transition-all duration-300 flex items-center justify-center group-hover:shadow-md group-hover:-translate-y-0.5 ${
          isActive ? 'border-gray-400 shadow-md scale-105' : 'border-slate-100'
        }`}
      >
        {/* 2. THE INNER IMAGE / ICON */}
        <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 flex items-center justify-center">
          {isAllCategory && !cat.imageUrl ? (
            <div className="w-full h-full flex items-center justify-center bg-white p-0.5">
              <SirikFitLogo className="w-full h-full" />
            </div>
          ) : hasValidImage ? (
            <img
              src={imageSource}
              alt={displayLabel}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={`w-full h-full rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white p-1`}
            >
              {renderCategoryIcon(theme.iconName, 'w-5 h-5 text-white stroke-[2]')}
            </div>
          )}
        </div>
      </div>

      {/* 3. TRUNCATED TITLE */}
      <span className={`text-[10px] sm:text-[11px] font-medium mt-2 text-center w-full truncate px-0.5 block leading-tight transition-colors ${
        isActive ? 'font-bold text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
      }`}>
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

      {/* Horizontal Flex Row with Subtle Navigation Controls */}
      <div className="relative flex items-center w-full group">
        {showNavArrows && (
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute z-10 -right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-gray-200 text-slate-400 opacity-40 hover:opacity-100 hover:bg-white hover:text-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 shrink-0"
            title="بعدی"
            aria-label="بعدی"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {/* Badges Container: Horizontal smooth scroll with hidden scrollbar */}
        <div
          ref={scrollRef}
          className="flex items-center gap-3 sm:gap-3.5 overflow-x-auto no-scrollbar py-2.5 px-2 dir-rtl scroll-smooth w-full"
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
            className="absolute z-10 -left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/70 shadow-sm border border-gray-200 text-slate-400 opacity-40 hover:opacity-100 hover:bg-white hover:text-slate-700 hover:shadow-md transition-all duration-300 cursor-pointer active:scale-95 shrink-0"
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
