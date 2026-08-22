import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { TaxonomyCategory, DEFAULT_TAXONOMY, fetchTaxonomyFromFirestore } from '../utils/taxonomyHelper';

interface TwoTierCategoryNavProps {
  selectedMainCat: string;
  selectedSubCat: string;
  onSelectMainCat: (mainId: string) => void;
  onSelectSubCat: (subId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  totalCount?: number;
  customTaxonomy?: TaxonomyCategory[];
}

export const TwoTierCategoryNav: React.FC<TwoTierCategoryNavProps> = ({
  selectedMainCat,
  selectedSubCat,
  onSelectMainCat,
  onSelectSubCat,
  searchQuery,
  onSearchChange,
  searchPlaceholder = '... جستجوی مکمل، برند یا ویتامین در آفرهای دبی',
  totalCount,
  customTaxonomy
}) => {
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>(customTaxonomy || DEFAULT_TAXONOMY);

  useEffect(() => {
    if (customTaxonomy && customTaxonomy.length > 0) {
      setTaxonomy(customTaxonomy);
      return;
    }

    const load = async () => {
      try {
        const loaded = await fetchTaxonomyFromFirestore();
        if (Array.isArray(loaded) && loaded.length > 0) {
          setTaxonomy(loaded);
        }
      } catch (e) {
        console.warn('Could not load dynamic taxonomy:', e);
      }
    };
    load();
  }, [customTaxonomy]);

  const activeMainConfig = taxonomy.find(c => c.id === selectedMainCat || c.slug === selectedMainCat) || taxonomy[0] || DEFAULT_TAXONOMY[0];

  return (
    <div className="space-y-3 font-['Vazirmatn',sans-serif] text-right">
      {/* 1. Search Header (Clean Rounded Input) */}
      <div className="relative">
        <div className="relative flex items-center bg-white border border-slate-200/90 focus-within:border-blue-700 rounded-2xl shadow-2xs transition">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent py-3 pr-10 pl-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 shrink-0 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute left-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tier 1: Royal Blue Main Category Bar (نوار آبی اصلی) */}
      <div className="sticky top-0 z-30 bg-[#1e40af] rounded-2xl p-1.5 shadow-md overflow-hidden">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar scrollbar-none py-1 px-1 dir-rtl">
          {taxonomy.map((cat) => {
            const isActive = selectedMainCat === cat.id || selectedMainCat === cat.slug;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectMainCat(cat.id);
                  onSelectSubCat('all'); // Reset subcategory to all on main category change
                }}
                className={`whitespace-nowrap px-3.5 py-2 text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer rounded-xl flex-1 text-center relative ${
                  isActive
                    ? 'text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{cat.name}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Tier 2: Sub-Category Pills (قرص‌های زیرمجموعه) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none py-1 px-0.5 dir-rtl">
        {activeMainConfig.subCategories.map((sub) => {
          const isSubActive = selectedSubCat === sub.id || selectedSubCat === sub.slug;

          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSelectSubCat(sub.id)}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shrink-0 border ${
                isSubActive
                  ? 'bg-[#1e40af] text-white border-[#1e40af] shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
