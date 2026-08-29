import React, { useState, useEffect } from 'react';
import { Search, X, Layers, Filter } from 'lucide-react';
import { TaxonomyCategory, DEFAULT_TAXONOMY, fetchTaxonomyFromFirestore } from '../../utils/taxonomyHelper';

export interface CategoryFilterItem {
  id: string;
  name: string;
  slug?: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface CategoryFilterProps {
  selectedMainCategory?: string;
  selectedSubCategory?: string;
  onSelectMainCategory?: (mainCatId: string) => void;
  onSelectSubCategory?: (subCatId: string) => void;
  categories?: TaxonomyCategory[] | CategoryFilterItem[];
  subCategories?: { id: string; name: string; count?: number }[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;
  totalCount?: number;
  className?: string;
}

/**
 * Sirik Fit Unified Category Filter Component
 * Harmonized with Sirik Fit's official corporate palette:
 * - Slate Black (bg-slate-900) for active main navigation tabs
 * - Brand Red (bg-red-600) for active subcategory/filter pills
 * - Cool Gray (bg-slate-100) for inactive elements
 * - Clean White & Slate accents
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedMainCategory = 'sports_nutrition',
  selectedSubCategory = 'all',
  onSelectMainCategory,
  onSelectSubCategory,
  categories: customCategories,
  subCategories: customSubCategories,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = '... جستجوی مکمل، برند یا ویتامین در محصولات',
  showSearch = true,
  totalCount,
  className = ''
}) => {
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>(DEFAULT_TAXONOMY);

  useEffect(() => {
    if (customCategories && customCategories.length > 0 && 'subCategories' in customCategories[0]) {
      setTaxonomy(customCategories as TaxonomyCategory[]);
      return;
    }

    let isMounted = true;
    fetchTaxonomyFromFirestore().then((loaded) => {
      if (isMounted && Array.isArray(loaded) && loaded.length > 0) {
        setTaxonomy(loaded);
      }
    }).catch((err) => {
      console.warn('[CategoryFilter] Failed to fetch dynamic taxonomy:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [customCategories]);

  // Find active category config from taxonomy
  const activeMainConfig = taxonomy.find(
    (c) => c.id === selectedMainCategory || c.slug === selectedMainCategory
  ) || taxonomy[0] || DEFAULT_TAXONOMY[0];

  const subCats = customSubCategories || activeMainConfig?.subCategories || [];

  return (
    <div className={`flex flex-col gap-1 px-1 pt-0 pb-0.5 font-['Vazirmatn',sans-serif] text-right w-full ${className}`} dir="rtl">
      {/* 1. Optional Search Header */}
      {showSearch && onSearchChange && (
        <div className="relative w-full">
          <div className="relative flex items-center bg-white border border-slate-200/90 focus-within:border-slate-800 rounded-xl shadow-2xs transition">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-1.5 pr-8 pl-7 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 shrink-0 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Row 1: Main Category Pills (Deep Obsidian Black Active State) */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar py-0.5">
        {taxonomy.map((cat) => {
          const isActive = selectedMainCategory === cat.id || selectedMainCategory === cat.slug;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (onSelectMainCategory) onSelectMainCategory(cat.id);
                if (onSelectSubCategory) onSelectSubCategory('all');
              }}
              className={`whitespace-nowrap px-2.5 py-1 text-xs font-bold transition-all duration-200 cursor-pointer rounded-lg shrink-0 text-center relative border ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-800 border-slate-900 dark:bg-zinc-900 dark:ring-zinc-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200/80 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Row 2: Sub-Category / Filter Pills (Vibrant Brand Red Active State - Distinct Contrast) */}
      {subCats.length > 0 && (
        <div className="w-full flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar py-0">
          {subCats.map((sub) => {
            const isSubActive = selectedSubCategory === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  if (onSelectSubCategory) onSelectSubCategory(sub.id);
                }}
                className={`whitespace-nowrap px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer shrink-0 border ${
                  isSubActive
                    ? 'bg-red-600 text-white border-red-600 shadow-xs ring-1 ring-red-400 font-bold'
                    : 'bg-slate-100/90 hover:bg-slate-200 text-slate-600 border-slate-200/70 dark:bg-zinc-800/80 dark:text-zinc-300'
                }`}
              >
                <span>{sub.name}</span>
                {sub.count !== undefined && (
                  <span className={`mr-1 text-[9px] px-1 py-0.2 rounded-full ${
                    isSubActive ? 'bg-red-700/90 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {sub.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;
