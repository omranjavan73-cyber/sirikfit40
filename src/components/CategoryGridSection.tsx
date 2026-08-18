import React, { useState } from 'react';
import { Search, X, Grid, Layers, ChevronLeft, Check } from 'lucide-react';
import type { WarehouseCategory } from '../types';
import { CircularCategoryRow, DEFAULT_CIRCULAR_CATEGORIES } from './CircularCategoryRow';

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
  const allCategoriesList = (categories && categories.length > 0) ? categories : DEFAULT_CIRCULAR_CATEGORIES;

  // Filtered categories in modal
  const modalFilteredCategories = allCategoriesList.filter(c => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return true;
    return (c.label || '').toLowerCase().includes(q) ||
           (c.englishLabel || '').toLowerCase().includes(q) ||
           (c.filterKey || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-1.5 font-['Vazirmatn',sans-serif]">
      {/* 1. Search Bar */}
      <div className="relative">
        <div className="relative flex items-center bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] focus-within:border-[#111111] rounded-[14px] transition shadow-2xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent py-2 pr-10 pl-4 text-xs text-[#111111] placeholder-neutral-400 focus:outline-none text-right dir-rtl font-medium"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 shrink-0 pointer-events-none" />

          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Integrated Header Row (Title on Right, "All Categories" link on Left) */}
      <div className="flex items-center justify-between pt-1 px-1 dir-rtl">
        <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
          دسته‌بندی محصولات
        </h3>

        <button
          type="button"
          onClick={() => setShowAllModal(true)}
          className="text-xs text-slate-500 hover:text-slate-900 font-medium transition cursor-pointer flex items-center gap-0.5"
        >
          <span>همه دسته‌بندی‌ها</span>
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
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
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">همه دسته‌بندی‌های فروشگاه</h3>
                  <p className="text-[11px] text-slate-500 font-medium">دسته‌بندی مورد نظر خود را برای فیلتر انتخاب کنید</p>
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
                  className="w-full bg-transparent py-2 pr-9 pl-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5" />
              </div>
            </div>

            {/* Modal Categories List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[60vh]">
              {modalFilteredCategories.map((cat) => {
                const filterKey = cat.filterKey || cat.id;
                const isActive = selectedCat === filterKey || selectedCat === cat.id;
                const imageUrl = cat.iconUrl || 'https://images.unsplash.com/photo-1579722820308-d74e571900a9?w=500&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={cat.id || filterKey}
                    onClick={() => {
                      onSelectCategory(filterKey);
                      setShowAllModal(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white overflow-hidden relative shrink-0 border border-slate-200/90 p-0.5 shadow-2xs">
                        <img src={imageUrl} alt={cat.label} className="w-full h-full object-cover rounded-full" />
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-black block ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {cat.label}
                        </span>
                        {cat.englishLabel && (
                          <span className={`text-[10px] font-mono dir-ltr ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                            {cat.englishLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-xl">
                          <Check className="w-3.5 h-3.5" />
                          <span>انتخاب شده</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">انتخاب</span>
                      )}
                    </div>
                  </div>
                );
              })}

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
                className="text-xs font-black text-slate-700 hover:text-black hover:underline"
              >
                نمایش همه کالاها (بدون فیلتر)
              </button>

              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-1.5 rounded-xl transition"
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
