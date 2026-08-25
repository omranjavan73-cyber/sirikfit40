import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import {
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  Store,
  Tag,
  Award,
  ArrowUpDown,
  DollarSign,
  ChevronDown,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { toPersianDigits, formatToman, calculateFinalToman, getEffectiveAedRate } from '../../utils/formatters';
import { matchBilingualSearch } from '../../utils/seo';
import type { FinancialSettings } from '../../types';

export interface ProductFilterState {
  category: string; // 'all' | 'whey' | 'creatine' | 'gainer' | 'amino_bcaa' | 'vitamins' | 'pre_workout' | 'fat_burn'
  store: string; // 'all' | 'GNC Store' | 'Life Pharmacy' | 'Dr. Nutrition' | 'Sporter'
  brand: string; // 'all' | 'Optimum Nutrition' | 'MuscleTech' | 'Dymatize' | ...
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'popularity';
  minPriceToman?: number;
  maxPriceToman?: number;
  deliveryStatus?: 'all' | 'iran_warehouse' | 'dubai_direct' | 'special_deals';
}

export const DEFAULT_FILTER_STATE: ProductFilterState = {
  category: 'all',
  store: 'all',
  brand: 'all',
  sortBy: 'newest',
  minPriceToman: undefined,
  maxPriceToman: undefined,
  deliveryStatus: 'all'
};

export const CATEGORY_OPTIONS = [
  { id: 'all', label: 'همه دسته‌ها', keywords: [] },
  { id: 'whey', label: 'پروتئین وی (Whey)', keywords: ['whey', 'وی', 'isolate', 'ایزوله', 'casein', 'کازئین', 'gold standard', 'protein'] },
  { id: 'creatine', label: 'کراتین (Creatine)', keywords: ['creatine', 'کراتین', 'monohydrate'] },
  { id: 'gainer', label: 'گینر و کربوهیدرات', keywords: ['gainer', 'گینر', 'mass', 'مس', 'وزن', 'کالری', 'کربو'] },
  { id: 'amino_bcaa', label: 'آمینواسید و BCAA', keywords: ['amino', 'آمینو', 'bcaa', 'بی سی ای ای', 'eaa', 'glutamine', 'گلوتامین'] },
  { id: 'vitamins', label: 'ویتامین و سلامت', keywords: ['vitamin', 'ویتامین', 'zinc', 'زینک', 'omega', 'امگا', 'multi', 'مولتی'] },
  { id: 'pre_workout', label: 'پمپ و انرژی‌زا', keywords: ['pump', 'پمپ', 'pre-workout', 'preworkout', 'قبل تمرین', 'c4', 'انرژی'] },
  { id: 'fat_burn', label: 'چربی‌سوز و لاغری', keywords: ['fat burn', 'چربی سوز', 'carnitine', 'کارنیتین', 'cla', 'سی ال ای', 'لاغری', 'diet'] }
];

export const STORE_OPTIONS = [
  { id: 'all', label: 'همه فروشگاه‌ها' },
  { id: 'GNC Store', label: 'GNC Store دبی' },
  { id: 'Life Pharmacy', label: 'Life Pharmacy امارات' },
  { id: 'Dr. Nutrition', label: 'Dr. Nutrition دبی' },
  { id: 'Sporter', label: 'Sporter دبی' }
];

export const BRAND_OPTIONS = [
  { id: 'all', label: 'همه برندها' },
  { id: 'Optimum Nutrition', label: 'Optimum Nutrition (ON)' },
  { id: 'MuscleTech', label: 'MuscleTech' },
  { id: 'Dymatize', label: 'Dymatize' },
  { id: 'Applied Nutrition', label: 'Applied Nutrition' },
  { id: 'Basix', label: 'Basix' },
  { id: 'Rule 1', label: 'Rule 1' },
  { id: 'Kevin Levrone', label: 'Kevin Levrone' },
  { id: 'GNC', label: 'GNC' },
  { id: 'Cellucor', label: 'Cellucor' },
  { id: 'AllMax', label: 'AllMax' }
];

export const SORT_OPTIONS = [
  { id: 'newest', label: 'جدیدترین‌ها' },
  { id: 'popularity', label: 'محبوب‌ترین / پرفروش‌ترین' },
  { id: 'price_asc', label: 'ارزان‌ترین قیمت' },
  { id: 'price_desc', label: 'گران‌ترین قیمت' }
];

// Slider limits & step configuration
export const SLIDER_MIN_PRICE = 0;
export const SLIDER_MAX_PRICE = 15000000;
export const SLIDER_STEP = 50000;

/**
 * Global Pure Filtering & Sorting Engine for all views
 */
export function applyMultiVariableFilter<T extends any>(
  items: T[],
  filters: ProductFilterState,
  searchQuery: string = '',
  settings?: FinancialSettings
): T[] {
  if (!items || items.length === 0) return [];

  const effectiveRate = getEffectiveAedRate(settings);

  const getItemTomanPrice = (item: any): number => {
    if (item.priceToman && item.priceToman > 0) return item.priceToman;
    if (item.calculatedTomanOverride && item.calculatedTomanOverride > 0) return item.calculatedTomanOverride;
    if (item.calculatedToman && item.calculatedToman > 0) return item.calculatedToman;
    if (item.priceAed) {
      return calculateFinalToman(
        item.priceAed,
        item.weightKg || 0.8,
        settings?.cargoRatePerKg || 35,
        item.profitMargin !== undefined ? item.profitMargin : (settings?.profitMargin || 20),
        effectiveRate
      );
    }
    return 0;
  };

  const filtered = items.filter((item: any) => {
    if (!item) return false;

    // 1. Bilingual Search Text
    if (searchQuery && searchQuery.trim()) {
      if (!matchBilingualSearch(item, searchQuery)) return false;
    }

    // 2. Supplement Category Filter
    if (filters.category && filters.category !== 'all') {
      const catConfig = CATEGORY_OPTIONS.find(c => c.id === filters.category);
      if (catConfig) {
        const itemBlob = `${item.category || ''} ${item.mainCategory || ''} ${item.subCategory || ''} ${item.subcategory || ''} ${item.title || ''} ${item.englishTitle || ''}`.toLowerCase();
        const matchesCat = catConfig.keywords.some(kw => itemBlob.includes(kw.toLowerCase()));
        if (!matchesCat) return false;
      }
    }

    // 3. Dubai Source Store Filter
    if (filters.store && filters.store !== 'all') {
      const storeStr = `${item.storeName || ''} ${item.storeOrigin || ''} ${item.source || ''}`.toLowerCase();
      const targetStore = filters.store.toLowerCase();
      if (!storeStr.includes(targetStore)) return false;
    }

    // 4. Brand Filter
    if (filters.brand && filters.brand !== 'all') {
      const brandStr = `${item.brand || ''} ${item.title || ''} ${item.englishTitle || ''}`.toLowerCase();
      const targetBrand = filters.brand.toLowerCase();
      if (!brandStr.includes(targetBrand)) return false;
    }

    // 5. Price Range Filter
    const price = getItemTomanPrice(item);
    if (filters.minPriceToman !== undefined && price < filters.minPriceToman) return false;
    if (filters.maxPriceToman !== undefined && price > filters.maxPriceToman) return false;

    // 6. Optional backward-compatible Delivery status filter
    if (filters.deliveryStatus && filters.deliveryStatus !== 'all') {
      const isIran = item.isLocalInventory === true || item.isIranWarehouse === true || (item.storeName || '').includes('انبار ایران');
      if (filters.deliveryStatus === 'iran_warehouse' && !isIran) return false;
      if (filters.deliveryStatus === 'dubai_direct' && isIran) return false;
      if (filters.deliveryStatus === 'special_deals' && !(item.discountPercent > 0 || (item.originalPriceAed && item.originalPriceAed > item.priceAed) || item.isDeal === true || item.badge?.includes('ویژه'))) {
        return false;
      }
    }

    return true;
  });

  // Sort Order
  const sorted = [...filtered].sort((a: any, b: any) => {
    if (filters.sortBy === 'price_asc') {
      return getItemTomanPrice(a) - getItemTomanPrice(b);
    }
    if (filters.sortBy === 'price_desc') {
      return getItemTomanPrice(b) - getItemTomanPrice(a);
    }
    if (filters.sortBy === 'popularity') {
      const popA = a.isPopular === true || a.isPopularSample === true ? 1 : 0;
      const popB = b.isPopular === true || b.isPopularSample === true ? 1 : 0;
      return popB - popA;
    }
    // 'newest' default
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  return sorted;
}

export function countActiveFilters(filters: ProductFilterState): number {
  let count = 0;
  if (filters.category && filters.category !== 'all') count++;
  if (filters.store && filters.store !== 'all') count++;
  if (filters.brand && filters.brand !== 'all') count++;
  if (filters.sortBy && filters.sortBy !== 'newest') count++;
  if (filters.minPriceToman !== undefined || filters.maxPriceToman !== undefined) count++;
  return count;
}

interface ProductFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: ProductFilterState;
  onApplyFilters: (newFilters: ProductFilterState) => void;
  totalResultsCount?: number;
  maxPriceLimit?: number;
}

export const ProductFilterModal: React.FC<ProductFilterModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyFilters,
  totalResultsCount,
  maxPriceLimit = SLIDER_MAX_PRICE
}) => {
  const [draftFilters, setDraftFilters] = useState<ProductFilterState>(currentFilters);
  
  // Local slider states for continuous dual range
  const [sliderMin, setSliderMin] = useState<number>(currentFilters.minPriceToman ?? SLIDER_MIN_PRICE);
  const [sliderMax, setSliderMax] = useState<number>(currentFilters.maxPriceToman ?? maxPriceLimit);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(currentFilters);
      setSliderMin(currentFilters.minPriceToman ?? SLIDER_MIN_PRICE);
      setSliderMax(currentFilters.maxPriceToman ?? maxPriceLimit);
    }
  }, [isOpen, currentFilters, maxPriceLimit]);

  if (!isOpen) return null;

  const activeCount = countActiveFilters(draftFilters);

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTER_STATE);
    setSliderMin(SLIDER_MIN_PRICE);
    setSliderMax(maxPriceLimit);
  };

  const handleApply = () => {
    const finalFilters: ProductFilterState = {
      ...draftFilters,
      minPriceToman: sliderMin > SLIDER_MIN_PRICE ? sliderMin : undefined,
      maxPriceToman: sliderMax < maxPriceLimit ? sliderMax : undefined
    };
    onApplyFilters(finalFilters);
    onClose();
  };

  // Slider change handlers
  const handleMinSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.min(val, sliderMax - SLIDER_STEP);
    setSliderMin(clamped);
    setDraftFilters(prev => ({
      ...prev,
      minPriceToman: clamped > SLIDER_MIN_PRICE ? clamped : undefined
    }));
  };

  const handleMaxSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.max(val, sliderMin + SLIDER_STEP);
    setSliderMax(clamped);
    setDraftFilters(prev => ({
      ...prev,
      maxPriceToman: clamped < maxPriceLimit ? clamped : undefined
    }));
  };

  // Numeric input change handlers with comma parsing
  const handleMinInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    const clamped = Math.min(Math.max(num, 0), sliderMax);
    setSliderMin(clamped);
    setDraftFilters(prev => ({
      ...prev,
      minPriceToman: clamped > SLIDER_MIN_PRICE ? clamped : undefined
    }));
  };

  const handleMaxInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw === '' ? maxPriceLimit : parseInt(raw, 10);
    const clamped = Math.min(Math.max(num, sliderMin), maxPriceLimit * 2);
    setSliderMax(clamped);
    setDraftFilters(prev => ({
      ...prev,
      maxPriceToman: clamped < maxPriceLimit ? clamped : undefined
    }));
  };

  // Percentage calculations for dual slider track highlighting
  const minPercent = Math.min(100, Math.max(0, ((sliderMin - SLIDER_MIN_PRICE) / (maxPriceLimit - SLIDER_MIN_PRICE)) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((sliderMax - SLIDER_MIN_PRICE) / (maxPriceLimit - SLIDER_MIN_PRICE)) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in font-['Vazirmatn',sans-serif] dir-rtl">
      <div
        className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>فیلترهای پیشرفته محصولات</span>
                {activeCount > 0 && (
                  <span className="bg-blue-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    {toPersianDigits(activeCount)} فعال
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>پاک کردن</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable Ordered Filter Groups */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-right">
          {/* 1. نوع مکمل (دسته‌بندی) */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>۱. نوع مکمل (دسته‌بندی):</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = draftFilters.category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, category: cat.id }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. فروشگاه مبدا دبی */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-600" />
              <span>۲. فروشگاه مبدا دبی:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STORE_OPTIONS.map((st) => {
                const isSelected = draftFilters.store === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, store: st.id }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{st.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. برند سازنده */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>۳. برند سازنده:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BRAND_OPTIONS.map((br) => {
                const isSelected = draftFilters.brand === br.id;
                return (
                  <button
                    key={br.id}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, brand: br.id }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    {br.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. مرتب‌سازی نتایج */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-purple-600" />
              <span>۴. مرتب‌سازی نتایج:</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SORT_OPTIONS.map((s) => {
                const isSelected = draftFilters.sortBy === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDraftFilters(prev => ({ ...prev, sortBy: s.id as any }))}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{s.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mr-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. محدوده قیمت (تومان) - Continuous Dual-Range Slider + Numeric Inputs */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>۵. محدوده قیمت (تومان):</span>
              </label>
              <div className="text-[11px] font-bold text-slate-500">
                از {toPersianDigits(sliderMin.toLocaleString())} تا {toPersianDigits(sliderMax.toLocaleString())} تومان
              </div>
            </div>

            {/* Visual Dual-Range Slider Track Bar */}
            <div className="relative pt-3 pb-2 px-1">
              <div className="relative h-2 w-full bg-slate-200 rounded-full">
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-75"
                  style={{
                    right: `${minPercent}%`,
                    left: `${100 - maxPercent}%`
                  }}
                />
              </div>

              {/* Min Range Input (Thumb overlay) */}
              <input
                type="range"
                min={SLIDER_MIN_PRICE}
                max={maxPriceLimit}
                step={SLIDER_STEP}
                value={sliderMin}
                onChange={handleMinSliderChange}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto cursor-pointer h-2 z-20 accent-emerald-600"
                style={{
                  WebkitAppearance: 'none',
                  background: 'transparent'
                }}
              />

              {/* Max Range Input (Thumb overlay) */}
              <input
                type="range"
                min={SLIDER_MIN_PRICE}
                max={maxPriceLimit}
                step={SLIDER_STEP}
                value={sliderMax}
                onChange={handleMaxSliderChange}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-auto cursor-pointer h-2 z-20 accent-teal-600"
                style={{
                  WebkitAppearance: 'none',
                  background: 'transparent'
                }}
              />
            </div>

            {/* Synchronized Editable Numeric Inputs with live 3-digit comma formatting */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Min Price Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">حداقل قیمت (تومان):</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sliderMin > 0 ? sliderMin.toLocaleString('en-US') : '۰'}
                    onChange={handleMinInputChange}
                    placeholder="۰"
                    className="w-full text-left pl-3 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-black text-slate-800 transition outline-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    تومان
                  </span>
                </div>
              </div>

              {/* Max Price Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">حداکثر قیمت (تومان):</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sliderMax < maxPriceLimit ? sliderMax.toLocaleString('en-US') : maxPriceLimit.toLocaleString('en-US')}
                    onChange={handleMaxInputChange}
                    placeholder={maxPriceLimit.toLocaleString('en-US')}
                    className="w-full text-left pl-3 pr-8 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-teal-500 rounded-xl text-xs font-black text-slate-800 transition outline-none"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    تومان
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-xs sm:text-sm font-black py-3 rounded-2xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>اعمال فیلترها</span>
            {totalResultsCount !== undefined && (
              <span className="bg-blue-500/80 px-2 py-0.5 rounded-lg text-xs">
                ({toPersianDigits(totalResultsCount)} محصول)
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilterModal;
