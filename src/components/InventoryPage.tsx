import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, X, ShoppingBag, Check } from 'lucide-react';
import type { LocalInventoryItem, FinancialSettings } from '../types';
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

interface InventoryPageProps {
  items: LocalInventoryItem[];
  categories?: any[];
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenCart?: () => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items = [],
  onSelectLocalProduct,
  settings,
  onAddToCart,
  showToast,
  onOpenCart
}) => {
  const [selectedMainCat, setSelectedMainCat] = useState<string>('sports_nutrition');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterState, setFilterState] = useState<ProductFilterState>(DEFAULT_FILTER_STATE);

  const visibleItems = (items || []).filter(item => item && item.inStock !== false);

  // Apply full taxonomy and multi-variable filtering
  const filteredItems = useMemo(() => {
    const matchedTaxonomy = visibleItems.filter((item) => {
      return matchProductTaxonomy(item, selectedMainCat, selectedSubCat, searchQuery);
    });

    return applyMultiVariableFilter(matchedTaxonomy, filterState, searchQuery, settings);
  }, [visibleItems, selectedMainCat, selectedSubCat, searchQuery, filterState, settings]);

  const handleProductCardAddToCart = (product: any) => {
    const enrichedProduct = {
      ...product,
      calculatedToman: product.priceToman,
      totalToman: product.priceToman,
      isLocalInventory: true
    };

    if (onAddToCart) {
      onAddToCart(enrichedProduct);
    } else {
      onSelectLocalProduct(enrichedProduct);
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
        searchPlaceholder="... جستجوی مکمل، برند یا ویتامین در انبار ایران"
        totalCount={filteredItems.length}
        onOpenCart={onOpenCart}
      />

      {/* 2. Products List/Grid Section */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 my-6 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800">کالایی با فیلترهای انتخابی یافت نشد</h3>
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
            مشاهده همه موجودی انبار
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3' : 'space-y-3'}>
          {filteredItems.map((item) => (
            <ProductCatalogCard
              key={item.id}
              product={{
                ...item,
                calculatedToman: item.priceToman,
                totalToman: item.priceToman,
                storeName: 'انبار ایران',
                brand: item.brand || 'انبار ایران'
              }}
              viewMode={viewMode}
              onSelect={() => onSelectLocalProduct(item)}
              onAddToCart={handleProductCardAddToCart}
              showToast={(msg) => {
                if (showToast) showToast(msg, 'success');
              }}
            />
          ))}
        </div>
      )}

      {/* 3. Floating View Mode Switcher & Filter Button */}
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
        totalResultsCount={filteredItems.length}
      />
    </div>
  );
};

