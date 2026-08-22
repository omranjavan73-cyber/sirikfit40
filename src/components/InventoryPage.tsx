import React, { useState } from 'react';
import { SlidersHorizontal, X, ShoppingBag, Check } from 'lucide-react';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import { ProductDetailModal } from './ProductDetailModal';
import { TwoTierCategoryNav } from './TwoTierCategoryNav';
import { ProductCatalogCard } from './ProductCatalogCard';
import { FloatingViewSwitcher } from './FloatingViewSwitcher';
import { matchProductTaxonomy } from '../utils/taxonomyHelper';

interface InventoryPageProps {
  items: LocalInventoryItem[];
  categories?: any[];
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items = [],
  onSelectLocalProduct,
  settings,
  onAddToCart,
  showToast
}) => {
  const [selectedMainCat, setSelectedMainCat] = useState<string>('sports_nutrition');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [selectedLocalForModal, setSelectedLocalForModal] = useState<LocalInventoryItem | null>(null);

  const visibleItems = (items || []).filter(item => item && item.inStock !== false);

  const filteredItems = visibleItems.filter((item) => {
    return matchProductTaxonomy(item, selectedMainCat, selectedSubCat, searchQuery);
  });

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
      />

      {/* 2. Products List/Grid Section */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 my-6 shadow-2xs">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-slate-800">کالایی در این دسته‌بندی یافت نشد</h3>
            <p className="text-xs text-slate-500 font-medium">می‌توانید فیلترها را پاک کنید یا از دسته‌بندی دیگری انتخاب نمایید.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedSubCat('all');
              setSearchQuery('');
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

      {/* 4. Filter Drawer / Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in font-['Vazirmatn',sans-serif] dir-rtl">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-700" />
                <span>فیلترهای انبار ایران</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed font-medium">
                کالاهای انبار ایران موجود و پلمپ در انبار بوده و آماده ارسال مستقیم می‌باشند.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-black py-2.5 rounded-xl transition cursor-pointer text-center"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
