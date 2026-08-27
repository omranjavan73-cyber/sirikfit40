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
    <div className="space-y-3 font-['Vazirmatn',sans-serif] text-right">
      {/* 1. Streamlined Top Action Row (Full-width Search Bar + Compact Cart Icon Button) */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-700 focus-within:border-slate-800 rounded-2xl shadow-2xs transition">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-3 pr-10 pl-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-right dir-rtl font-medium"
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
          className="relative w-11 h-11 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0 active:scale-95"
          title="مشاهده سبد خرید"
          aria-label="مشاهده سبد خرید"
        >
          <ShoppingCart className="w-5 h-5" />
          {effectiveCartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
              {effectiveCartCount > 99 ? '99+' : effectiveCartCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Tier 1: Slate Black Main Category Navigation Bar */}
      <div className="bg-slate-100 dark:bg-zinc-800/90 rounded-2xl p-1 shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar scrollbar-none py-0.5 px-0.5 dir-rtl">
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
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-800 dark:bg-zinc-900 dark:ring-zinc-700'
                    : 'bg-transparent text-slate-700 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-700'
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
                  ? 'bg-red-600 text-white border-red-600 shadow-sm ring-1 ring-red-500'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80 dark:bg-zinc-800 dark:text-zinc-300'
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
