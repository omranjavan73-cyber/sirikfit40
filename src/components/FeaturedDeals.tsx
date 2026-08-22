import React, { useState } from 'react';
import { SlidersHorizontal, X, ShoppingBag, Check } from 'lucide-react';
import type { FeaturedDeal, FinancialSettings } from '../types';
import { calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';
import { TwoTierCategoryNav } from './TwoTierCategoryNav';
import { ProductCatalogCard } from './ProductCatalogCard';
import { FloatingViewSwitcher } from './FloatingViewSwitcher';
import { matchProductTaxonomy } from '../utils/taxonomyHelper';

interface FeaturedDealsProps {
  deals?: FeaturedDeal[];
  categories?: any[];
  settings: FinancialSettings;
  onSelectDeal: (deal: FeaturedDeal) => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_DEALS: FeaturedDeal[] = [
  {
    id: 'deal-1',
    title: 'مکمل پروتئین وی ON Gold Standard 5lb',
    brand: 'Optimum Nutrition',
    category: 'مکمل‌های ورزشی',
    mainCategory: 'sports_nutrition',
    subCategory: 'whey',
    priceAed: 199.05,
    originalPriceAed: 249,
    discountPercent: 20,
    weightKg: 2.27,
    storeName: 'GNC Store',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://gnc-mena.com'
  },
  {
    id: 'deal-2',
    title: 'مکمل گینر افزایش وزن MuscleTech Mass Tech Elite',
    brand: 'MuscleTech',
    category: 'مکمل‌های ورزشی',
    mainCategory: 'sports_nutrition',
    subCategory: 'gainer',
    priceAed: 170.48,
    originalPriceAed: 215,
    discountPercent: 20,
    weightKg: 3.18,
    storeName: 'GNC Store',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://gnc-mena.com'
  },
  {
    id: 'deal-3',
    title: 'شیکر و قمقمه ورزشی GNC Shaker Bottle',
    brand: 'GNC',
    category: 'مکمل‌های ورزشی',
    mainCategory: 'sports_nutrition',
    subCategory: 'accessories',
    priceAed: 38.09,
    originalPriceAed: 45,
    discountPercent: 15,
    weightKg: 0.3,
    storeName: 'GNC Store',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://gnc-mena.com'
  },
  {
    id: 'deal-4',
    title: 'مکمل اورجینال GNC Lean Shake 25 414ml',
    brand: 'GNC',
    category: 'تغذیه سالم',
    mainCategory: 'healthy_food',
    subCategory: 'peanut_butter',
    priceAed: 14.67,
    originalPriceAed: 20,
    discountPercent: 25,
    weightKg: 0.45,
    storeName: 'GNC Store',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://gnc-mena.com'
  },
  {
    id: 'deal-5',
    title: 'مکمل آمینو اسید Project#1 Amino Evolution',
    brand: 'GNC',
    category: 'مکمل‌های ورزشی',
    mainCategory: 'sports_nutrition',
    subCategory: 'amino_bcaa',
    priceAed: 118,
    originalPriceAed: 140,
    discountPercent: 15,
    weightKg: 0.4,
    storeName: 'GNC Store',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://gnc-mena.com'
  },
  {
    id: 'deal-6',
    title: 'Dr. Nutrition Applied Nutrition Joint Complex',
    brand: 'Applied Nutrition',
    category: 'دغدغه‌های سلامتی',
    mainCategory: 'health_concerns',
    subCategory: 'joints',
    priceAed: 84.62,
    originalPriceAed: 110,
    discountPercent: 23,
    weightKg: 0.35,
    storeName: 'Dr. Nutrition',
    isActive: true,
    badge: 'پیشنهاد ویژه',
    url: 'https://www.drnutrition.com'
  }
];

export const FeaturedDeals: React.FC<FeaturedDealsProps> = ({
  deals = [],
  settings,
  onSelectDeal,
  onAddToCart,
  showToast
}) => {
  const [selectedMainCat, setSelectedMainCat] = useState<string>('sports_nutrition');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [selectedDealForModal, setSelectedDealForModal] = useState<FeaturedDeal | null>(null);

  const rawDeals = (deals && deals.length > 0) ? deals : DEFAULT_DEALS;
  const activeDeals = (rawDeals || []).filter((d) => d && d.isActive !== false);

  const filteredDeals = activeDeals.filter((deal) => {
    // Store filter
    if (selectedStoreFilter !== 'all') {
      const dealStore = (deal.storeName || deal.brand || '').toLowerCase();
      if (!dealStore.includes(selectedStoreFilter.toLowerCase())) return false;
    }

    return matchProductTaxonomy(deal, selectedMainCat, selectedSubCat, searchQuery);
  });

  const getComputedToman = (deal: FeaturedDeal) => {
    if (deal.priceToman && deal.priceToman > 0) return deal.priceToman;
    return calculateFinalToman(
      deal.priceAed,
      deal.weightKg || 0.5,
      settings.cargoRatePerKg || 35,
      deal.profitMargin !== undefined ? deal.profitMargin : (deal.marginPercent !== undefined ? deal.marginPercent : settings.profitMargin || 15),
      getEffectiveAedRate(settings)
    );
  };

  const handleProductCardAddToCart = (product: any) => {
    const calculatedToman = getComputedToman(product);
    const enrichedProduct = {
      ...product,
      calculatedToman: calculatedToman,
      priceToman: calculatedToman
    };

    if (onAddToCart) {
      onAddToCart(enrichedProduct);
    } else {
      onSelectDeal(enrichedProduct);
    }
  };

  return (
    <div className="space-y-4 font-['Vazirmatn',sans-serif] animate-fade-in pb-24 text-right">
      {/* 1. Two-Tier Category Navigation & Clean Search Header */}
      <TwoTierCategoryNav
        selectedMainCat={selectedMainCat}
        selectedSubCat={selectedSubCat}
        onSelectMainCat={setSelectedMainCat}
        onSelectSubCat={setSelectedSubCat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="... جستجوی مکمل، برند یا ویتامین در آفرهای دبی"
        totalCount={filteredDeals.length}
      />

      {/* 2. Product Catalog List/Grid Section */}
      {filteredDeals.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 my-6 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800">پیشنهادی با این مشخصات یافت نشد</h3>
            <p className="text-xs text-slate-500 font-medium">می‌توانید فیلترها را پاک کنید یا از دسته‌بندی دیگری انتخاب نمایید.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSubCat('all');
              setSearchQuery('');
              setSelectedStoreFilter('all');
            }}
            className="bg-slate-900 hover:bg-black text-white text-xs font-black px-6 py-2.5 rounded-2xl transition cursor-pointer"
          >
            مشاهده همه پیشنهادها
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-3'}>
          {filteredDeals.map((deal) => {
            const calculatedToman = getComputedToman(deal);
            const enrichedDeal = {
              ...deal,
              calculatedToman,
              priceToman: calculatedToman
            };

            return (
              <ProductCatalogCard
                key={deal.id}
                product={enrichedDeal}
                viewMode={viewMode}
                onSelect={() => onSelectDeal(enrichedDeal)}
                onAddToCart={handleProductCardAddToCart}
                showToast={(msg) => {
                  if (showToast) showToast(msg, 'success');
                }}
              />
            );
          })}
        </div>
      )}

      {/* 3. Floating View Mode Switcher & Filter Button (Docked above bottom bar) */}
      <FloatingViewSwitcher
        viewMode={viewMode}
        onToggleViewMode={(mode) => setViewMode(mode)}
        onOpenFilters={() => setIsFilterModalOpen(true)}
      />

      {/* 4. Filter Drawer / Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in font-['Vazirmatn',sans-serif] dir-rtl">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                <span>فیلترهای پیشرفته محصولات</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Store Filter */}
              <div>
                <label className="font-extrabold text-slate-800 block mb-2">فروشگاه مبدا دبی:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'همه فروشگاه‌ها' },
                    { id: 'gnc', label: 'GNC Store' },
                    { id: 'dr nutrition', label: 'Dr. Nutrition' },
                    { id: 'life', label: 'Life Pharmacy' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStoreFilter(s.id)}
                      className={`p-2.5 rounded-xl border font-bold text-center transition cursor-pointer ${
                        selectedStoreFilter === s.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedStoreFilter('all');
                  setIsFilterModalOpen(false);
                }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer"
              >
                پاک کردن فیلترها
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black py-2.5 rounded-xl transition cursor-pointer"
              >
                اعمال فیلتر
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
