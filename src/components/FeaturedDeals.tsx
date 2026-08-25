import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ShoppingBag, Check } from 'lucide-react';
import type { FeaturedDeal, FinancialSettings } from '../types';
import { calculateFinalToman, getEffectiveAedRate } from '../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';
import { TwoTierCategoryNav } from './TwoTierCategoryNav';
import { ProductCatalogCard } from './ProductCatalogCard';
import { FloatingViewSwitcher } from './FloatingViewSwitcher';
import { matchProductTaxonomy } from '../utils/taxonomyHelper';
import {
  ProductFilterModal,
  ProductFilterState,
  DEFAULT_FILTER_STATE,
  applyMultiVariableFilter
} from './product/ProductFilterModal';

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
  const [filterState, setFilterState] = useState<ProductFilterState>(DEFAULT_FILTER_STATE);

  const rawDeals = (deals && deals.length > 0) ? deals : DEFAULT_DEALS;
  const activeDeals = (rawDeals || []).filter((d) => d && d.isActive !== false);

  const filteredDeals = useMemo(() => {
    const matchedTaxonomy = activeDeals.filter((deal) => {
      return matchProductTaxonomy(deal, selectedMainCat, selectedSubCat, searchQuery);
    });

    return applyMultiVariableFilter(matchedTaxonomy, filterState, searchQuery, settings);
  }, [activeDeals, selectedMainCat, selectedSubCat, searchQuery, filterState, settings]);

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
            <h3 className="font-extrabold text-sm text-slate-800">پیشنهادی با فیلترهای انتخابی یافت نشد</h3>
            <p className="text-xs text-slate-500 font-medium">می‌توانید فیلترها را ریست کنید یا از دسته‌بندی دیگری انتخاب نمایید.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSubCat('all');
              setSearchQuery('');
              setFilterState(DEFAULT_FILTER_STATE);
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

      {/* 4. Advanced Multi-Variable Product Filter Modal */}
      <ProductFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentFilters={filterState}
        onApplyFilters={(newFilters) => setFilterState(newFilters)}
        totalResultsCount={filteredDeals.length}
      />

    </div>
  );
};
