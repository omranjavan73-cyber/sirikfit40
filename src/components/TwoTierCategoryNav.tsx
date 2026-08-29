import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingCart } from 'lucide-react';
import { TaxonomyCategory, DEFAULT_TAXONOMY, fetchTaxonomyFromFirestore } from '../utils/taxonomyHelper';
import { useCart } from '../context/CartContext';

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
  onOpenCart?: () => void;
  cartCount?: number;
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
  customTaxonomy,
  onOpenCart,
  cartCount
}) => {
  const [taxonomy, setTaxonomy] = useState<TaxonomyCategory[]>(customTaxonomy || DEFAULT_TAXONOMY);
  const cartContext = useCart();
  const effectiveCartCount = cartCount !== undefined ? cartCount : (cartContext?.itemCount || 0);

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
    <div className="flex flex-col gap-2 pt-1.5 pb-2 px-1 sm:px-2 font-['Vazirmatn',sans-serif] text-right w-full">
      {/* 1. Streamlined Top Action Row (Full-width Search Bar + Compact Cart Icon Button) */}
      <div className="flex items-center gap-1.5 w-full">
        <div className="relative flex-1">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-700 focus-within:border-slate-800 rounded-xl shadow-2xs transition">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-1.5 pr-8 pl-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 shrink-0 pointer-events-none" />
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

        {/* Compact Cart Icon Button with Dynamic Red Item Badge */}
        <button
          type="button"
          onClick={() => {
            if (onOpenCart) {
              onOpenCart();
            } else {
              window.dispatchEvent(new CustomEvent('openCartDirect'));
            }
          }}
          className="shrink-0 relative z-10 w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95"
          title="مشاهده سبد خرید"
          aria-label="مشاهده سبد خرید"
        >
          <ShoppingCart className="w-4 h-4" />
          {effectiveCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
              {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Row 1: Main Category Pills */}
      <div className="w-full flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar py-1">
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
              className={`whitespace-nowrap px-3.5 py-1.5 text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer rounded-xl shrink-0 text-center relative border ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800 border-slate-900 dark:bg-zinc-900 dark:ring-zinc-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Row 2: Sub-Filter Pills */}
      {activeMainConfig?.subCategories && activeMainConfig.subCategories.length > 0 && (
        <div className="w-full flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar py-1">
          {activeMainConfig.subCategories.map((sub) => {
            const isSubActive = selectedSubCat === sub.id || selectedSubCat === sub.slug;

            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSelectSubCat(sub.id)}
                className={`whitespace-nowrap px-3 py-1 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shrink-0 border ${
                  isSubActive
                    ? 'bg-red-600 text-white border-red-600 shadow-sm ring-1 ring-red-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
