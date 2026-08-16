import React, { useState } from 'react';
import { Search, X, Layers, ChevronLeft, Check } from 'lucide-react';
import type { WarehouseCategory } from '../types';
import { CircularCategoryRow } from './CircularCategoryRow';
import {
  DEFAULT_UNIFIED_CATEGORIES,
  getCategoryTheme,
  renderCategoryIcon,
  getCanonicalCategoryKey,
  getCategoryImageUrl
} from '../utils/categoryHelper';

interface CategoryGridSectionProps {
  categories?: WarehouseCategory[];
  selectedCat: string;
  onSelectCategory: (filterKey: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  itemsCount?: number;
}

export const CategoryGridSection: React.FC<CategoryGridSectionProps> = ({
  categories = [],
  selectedCat,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  searchPlaceholder = '...جستجوی مکمل، برند یا دسته',
  itemsCount
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Consolidate categories
  const allCategoriesList = categories && categories.length > 0 ? categories : DEFAULT_UNIFIED_CATEGORIES;
  const canonicalSelected = getCanonicalCategoryKey(selectedCat);

  // Filtered categories in modal
  const modalFilteredCategories = allCategoriesList.filter((c) => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.label || '').toLowerCase().includes(q) ||
      (c.englishLabel || '').toLowerCase().includes(q) ||
      (c.filterKey || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-2 font-['Vazirmatn',sans-serif]">
      {/* 1. Search Bar */}
      <div className="relative">
        <div className="relative flex items-center bg-white border border-slate-200 focus-within:border-slate-900 rounded-2xl transition-all shadow-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent py-2.5 pr-10 pl-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none text-right dir-rtl font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 shrink-0 pointer-events-none" />

          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Integrated Header Row (Title on Right, "All Categories" link on Left) */}
      <div className="flex items-center justify-between pt-1 px-1 dir-rtl">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black text-slate-900 tracking-tight">دسته‌بندی مکمل‌ها</h3>
          {itemsCount !== undefined && (
            <span className="text-[11px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {itemsCount} کالا
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAllModal(true)}
          className="text-xs text-slate-600 hover:text-slate-950 font-bold transition cursor-pointer flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-xl"
        >
          <span>مشاهده همه دسته‌ها</span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>

      {/* 3. Compact Circular Category Row */}
      <CircularCategoryRow
        categories={allCategoriesList}
        selectedCat={selectedCat}
        onSelectCategory={onSelectCategory}
        showNavArrows={true}
      />

      {/* 4. "See All Categories" Modal / Overlay */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in dir-rtl">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/90">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">همه دسته‌بندی‌های مکمل</h3>
                  <p className="text-[11px] text-slate-500 font-medium">برای فیلتر کردن سریع، دسته مورد نظر را لمس کنید</p>
                </div>
              </div>

              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 border-b border-slate-100">
              <div className="relative flex items-center bg-slate-100 rounded-xl">
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="جستجو در دسته‌بندی‌ها..."
                  className="w-full bg-transparent py-2 pr-9 pl-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5" />
              </div>
            </div>

            {/* Modal Categories Grid */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {modalFilteredCategories.map((cat) => {
                  const rawKey = cat.filterKey || cat.id;
                  const canonicalKey = getCanonicalCategoryKey(rawKey || cat.label);
                  const isActive =
                    canonicalSelected === canonicalKey ||
                    selectedCat === rawKey ||
                    selectedCat === cat.id ||
                    (canonicalSelected === 'all' && canonicalKey === 'all');

                  const theme = getCategoryTheme(rawKey || cat.label);
                  const imageSource = cat.imageUrl || cat.iconUrl || getCategoryImageUrl(rawKey || cat.label);

                  return (
                    <div
                      key={cat.id || rawKey}
                      onClick={() => {
                        onSelectCategory(rawKey);
                        setShowAllModal(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-rose-50 text-rose-950 border-rose-300 shadow-xs ring-2 ring-rose-500/20'
                          : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full p-0.5 bg-white border border-gray-200 shadow-xs overflow-hidden shrink-0 flex items-center justify-center"
                        >
                          {imageSource ? (
                            <img
                              src={imageSource}
                              alt={cat.label}
                              className="w-full h-full object-cover rounded-full bg-slate-50"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            renderCategoryIcon(theme.iconName, 'w-4 h-4 text-slate-700')
                          )}
                        </div>

                        <div className="text-right">
                          <span className={`text-xs font-black block ${isActive ? 'text-rose-950' : 'text-slate-900'}`}>
                            {cat.label}
                          </span>
                          {cat.englishLabel && (
                            <span
                              className={`text-[9.5px] font-mono font-bold uppercase tracking-wider block ${
                                isActive ? 'text-rose-500' : 'text-slate-400'
                              }`}
                            >
                              {cat.englishLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span className="w-5 h-5 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xs">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {modalFilteredCategories.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 font-medium">
                  هیچ دسته‌بندی با این مشخصات یافت نشد
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  setShowAllModal(false);
                }}
                className="text-xs font-black text-slate-700 hover:text-black hover:underline cursor-pointer"
              >
                نمایش همه کالاها (بدون فیلتر)
              </button>

              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
