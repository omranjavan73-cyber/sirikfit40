import React, { useState } from 'react';
import type { LocalInventoryItem, WarehouseCategory, FinancialSettings } from '../types';
import { formatToman, formatPrice, formatAedValue, getEffectiveAedRate } from '../utils/formatters';
import { CategoryGridSection } from './CategoryGridSection';
import { ProductDetailModal } from './ProductDetailModal';
import { isCategoryMatch } from '../utils/categoryHelper';

interface InventoryPageProps {
  items: LocalInventoryItem[];
  categories?: WarehouseCategory[];
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({
  items,
  categories,
  onSelectLocalProduct,
  settings,
  onAddToCart
}) => {
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocalForModal, setSelectedLocalForModal] = useState<LocalInventoryItem | null>(null);

  const visibleItems = (items || []).filter(item => item && item.inStock !== false);

  const filteredItems = visibleItems.filter(item => {
    const q = searchQuery.trim().toLowerCase();
    const title = (item.title || '').toLowerCase();
    const cat = (item.category || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();

    const matchesSearch = !q || title.includes(q) || cat.includes(q) || desc.includes(q);
    const matchesCat = isCategoryMatch(item, selectedCat, categories);

    return matchesSearch && matchesCat;
  });

  // Short brand tag (3-4 uppercase letters) helper
  const getItemBrandCode = (title: string, category?: string) => {
    const t = title.toLowerCase();
    if (t.includes('myprotein') || t.includes('مای پروتئین') || t.includes('myp')) return 'MYP';
    if (t.includes('gnc') || t.includes('جی ان سی')) return 'GNC';
    if (t.includes('cellucor') || t.includes('c4') || t.includes('سلکور')) return 'CEL';
    if (t.includes('doctor') || t.includes('doc')) return 'DOC';
    if (t.includes('optimum') || t.includes('on ') || t.includes('وی')) return 'ON';
    if (t.includes('dymatize') || t.includes('iso')) return 'ISO';
    if (t.includes('life')) return 'LIFE';
    return 'ON';
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: 23000
  };

  return (
    <div className="space-y-4 font-['Vazirmatn',sans-serif] animate-fade-in pb-12">
      {/* Top Header */}
      <div className="text-right pb-0.5">
        <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
          موجودی انبار ایران
        </h2>
      </div>

      {/* Shared Category Grid Section (Search + 3x2 Rectangular Category Cards + All Categories Button & Drawer) */}
      <CategoryGridSection
        categories={categories}
        selectedCat={selectedCat}
        onSelectCategory={setSelectedCat}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="...جستجوی مکمل، برند یا دسته"
        itemsCount={filteredItems.length}
      />

      {/* Stock Items List Header */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <h3 className="font-extrabold text-sm text-[#111111]">موجودی انبار ایران</h3>
        <span className="text-xs font-extrabold text-[#111111] bg-[#F8FAFC] border-[1.5px] border-[#E5E5E5] px-3 py-0.5 rounded-full">
          {filteredItems.length} کالا
        </span>
      </div>

      {/* Stock Items Grid (Responsive Multi-column Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredItems.map((item) => {
          const brandCode = getItemBrandCode(item.title, item.category);

          return (
            <div
              key={item.id}
              onClick={() => setSelectedLocalForModal(item)}
              className="product-card bg-white border border-slate-200/90 hover:border-[#111111] rounded-[22px] p-3.5 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between relative space-y-3 overflow-hidden"
            >
              {/* Product Image Container */}
              <div className="img-wrap relative w-full h-[120px] rounded-[18px] bg-[#F8FAFC] border border-slate-100 flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover object-center block"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : null}

                {!item.image && (
                  <span className="font-black text-2xl text-[#111111] tracking-tight">{brandCode}</span>
                )}

                {/* Stock Badge on top of Image */}
                <span className="badge absolute bottom-1.5 right-1.5 bg-[#111111] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs z-20">
                  {item.deliveryBadge || 'تحویل فوری'}
                </span>
              </div>

              {/* Product Title & Stock Status */}
              <div className="space-y-1.5 text-right flex-1 flex flex-col justify-between">
                <span className="text-[10px] font-extrabold text-emerald-600 block">
                  موجودی در ایران ({item.stockCount || 4} عدد)
                </span>

                <h4 className="font-extrabold text-xs md:text-sm text-slate-900 leading-snug line-clamp-2 min-h-[32px]">
                  {item.title}
                </h4>

                {/* Pricing Row - Single unbroken row */}
                <div className="flex items-center justify-between w-full pt-2 pb-1 border-t border-gray-100">
                  {/* Right side: Toman Price in a single unbroken line */}
                  <div className="flex items-baseline gap-1 text-red-600 font-extrabold text-xs sm:text-sm md:text-base whitespace-nowrap">
                    <span>{formatPrice(item.priceToman)}</span>
                    <span className="text-[10px] sm:text-[11px] md:text-xs font-bold">تومان</span>
                  </div>

                  {/* Left side: AED Original Price if available */}
                  {item.priceAed ? (
                    <div className="text-gray-400 text-xs font-semibold whitespace-nowrap dir-ltr">
                      <span>{formatAedValue(item.priceAed)}</span>
                      <span className="text-[10px] ml-0.5">AED</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Full-width Order Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLocalForModal(item);
                }}
                className="w-full bg-slate-900 hover:bg-red-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-200 shadow-sm active:scale-95 mt-1 cursor-pointer flex items-center justify-center gap-1.5"
              >
                افزودن به سبد خرید
              </button>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-2">
          <p className="text-sm font-extrabold text-slate-800">هیچ کالایی با این مشخصات یافت نشد</p>
          <p className="text-xs text-slate-500 font-medium">لطفاً کلمه کلیدی یا دسته‌بندی دیگری را امتحان کنید.</p>
          <button
            onClick={() => { setSelectedCat('all'); setSearchQuery(''); }}
            className="mt-2 text-xs font-black text-slate-900 underline"
          >
            پاک کردن فیلترها
          </button>
        </div>
      )}

      {/* Embedded Product Details Modal */}
      {(() => {
        if (!selectedLocalForModal) return null;
        const effectiveRate = getEffectiveAedRate(settings) || 55000;
        return (
          <ProductDetailModal
            isOpen={!!selectedLocalForModal}
            onClose={() => setSelectedLocalForModal(null)}
            product={{
              id: selectedLocalForModal.id,
              title: `${selectedLocalForModal.title} (موجودی انبار ایران)`,
              url: selectedLocalForModal.url || 'https://omex.ir/stock/' + selectedLocalForModal.id,
              priceAed: selectedLocalForModal.priceAed || Math.round(selectedLocalForModal.priceToman / effectiveRate) || 100,
              originalPriceAed: selectedLocalForModal.originalPriceToman ? Math.round(selectedLocalForModal.originalPriceToman / effectiveRate) : 0,
              priceToman: selectedLocalForModal.priceToman,
              originalPriceToman: selectedLocalForModal.originalPriceToman,
              calculatedTomanOverride: selectedLocalForModal.priceToman,
              isLocalInventory: true,
              weightKg: selectedLocalForModal.weightKg || 0.5,
              image: selectedLocalForModal.image,
              storeName: 'انبار ایران (تحویل فوری)',
              brand: 'انبار ایران',
              category: selectedLocalForModal.category || 'موجودی ایران',
              description: selectedLocalForModal.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری',
              badge: selectedLocalForModal.deliveryBadge || '⚡ ارسال فوری (انبار ایران)',
              flavors: selectedLocalForModal.flavors || [],
              sizes: selectedLocalForModal.sizes || []
            }}
            settings={settings || { cargoRatePerKg: 35, profitMargin: 20, aedRate: effectiveRate }}
            onAddToCart={(productPayload, flavor, size) => {
              if (onAddToCart) {
                onAddToCart(productPayload, flavor, size);
              } else if (selectedLocalForModal) {
                onSelectLocalProduct(selectedLocalForModal);
              }
              setSelectedLocalForModal(null);
            }}
          />
        );
      })()}
    </div>
  );
};
