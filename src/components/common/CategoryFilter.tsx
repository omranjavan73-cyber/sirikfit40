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
    <div className={`flex flex-col gap-1.5 pt-2 pb-1 font-['Vazirmatn',sans-serif] text-right ${className}`} dir="rtl">
      {/* 1. Optional Search Header */}
      {showSearch && onSearchChange && (
        <div className="relative">
          <div className="relative flex items-center bg-white border border-slate-200/90 focus-within:border-slate-800 rounded-2xl shadow-2xs transition">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2.5 pr-10 pl-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 shrink-0 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute left-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Tier 1: Main Category Navigation Tabs (Slate Black / Cool Gray) */}
      <div className="bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-2xl shadow-xs overflow-hidden border border-slate-200/70">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none py-0.5 px-0.5 dir-rtl">
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
                className={`whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer rounded-xl flex-1 text-center relative ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800 dark:bg-zinc-900 dark:ring-zinc-700'
                    : 'bg-transparent text-slate-700 hover:bg-slate-200/80 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{cat.name}</span>
                {isActive && (
                  <span className="absolute bottom-1 left-3 right-3 h-0.5 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tier 2: Sub-Category / Filter Pills (Brand Red / Clean Light Gray) */}
      {subCats.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 px-0.5 dir-rtl">
          {subCats.map((sub) => {
            const isSubActive = selectedSubCategory === sub.id;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  if (onSelectSubCategory) onSelectSubCategory(sub.id);
                }}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shrink-0 border ${
                  isSubActive
                    ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-500 border-red-600'
                    : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-200/80 dark:bg-zinc-800/80 dark:text-zinc-300'
                }`}
              >
                <span>{sub.name}</span>
                {sub.count !== undefined && (
                  <span className={`mr-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSubActive ? 'bg-red-700/80 text-white' : 'bg-slate-200 text-slate-600'
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
