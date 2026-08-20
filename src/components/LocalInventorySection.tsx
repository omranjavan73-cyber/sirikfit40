import React, { useState } from 'react';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import { formatToman, formatPrice, getEffectiveAedRate } from '../utils/formatters';
import { ProductDetailModal } from './ProductDetailModal';

interface LocalInventorySectionProps {
  items?: LocalInventoryItem[];
  settings?: FinancialSettings;
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
  onOpenFullModal?: () => void;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const LocalInventorySection: React.FC<LocalInventorySectionProps> = ({
  items = [],
  settings,
  onSelectLocalProduct,
  onOpenFullModal,
  onAddToCart
}) => {
  const [selectedLocalForModal, setSelectedLocalForModal] = useState<LocalInventoryItem | null>(null);
  const visibleItems = (items || []).filter(item => item && item.inStock !== false);

  if (visibleItems.length === 0) {
    return null;
  }

  const getItemBrandCode = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('myprotein') || t.includes('مای پروتئین') || t.includes('myp')) return 'MYP';
    if (t.includes('gnc') || t.includes('جی ان سی')) return 'GNC';
    if (t.includes('cellucor') || t.includes('c4') || t.includes('سلکور')) return 'CEL';
    if (t.includes('doctor') || t.includes('doc')) return 'DOC';
    if (t.includes('optimum') || t.includes('on ') || t.includes('وی')) return 'ON';
    if (t.includes('dymatize') || t.includes('iso')) return 'ISO';
    return 'ON';
  };

  const handleCardClick = (item: LocalInventoryItem) => {
    setSelectedLocalForModal(item);
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: 23000
  };

  return (
    <section id="local-inventory-section" className="my-6 space-y-3 font-['Vazirmatn',sans-serif] scroll-mt-16">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-extrabold text-base md:text-lg text-neutral-900">
            انبار تهران (تحویل فوری)
          </h3>
          <p className="text-[11px] text-neutral-500 font-medium">
            کالاهای موجود و آماده ارسال ۱ الی ۲ روزه با پیک/پست
          </p>
        </div>
        {onOpenFullModal && (
          <button
            onClick={onOpenFullModal}
            className="text-xs font-bold text-neutral-900 hover:underline cursor-pointer shrink-0"
          >
            مشاهده همه ({visibleItems.length}) ←
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {visibleItems.slice(0, 4).map((item) => {
          const brandCode = getItemBrandCode(item.title);

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className="bg-white border border-neutral-200 hover:border-black rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs transition cursor-pointer"
            >
              {/* Left Side: Price + 'افزودن به سبد خرید' Button */}
              <div className="flex flex-col items-start shrink-0 min-w-[105px]">
                <div className="flex items-baseline gap-1 text-red-600 font-extrabold text-xs sm:text-sm whitespace-nowrap mb-1.5 dir-rtl">
                  <span>{formatPrice(item.priceToman)}</span>
                  <span className="text-[10px] sm:text-[11px] font-bold">تومان</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick(item);
                  }}
                  className="font-bold text-[11px] px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-sm text-center w-full bg-slate-900 hover:bg-red-600 text-white flex items-center justify-center gap-1.5 active:scale-95"
                >
                  افزودن به سبد خرید
                </button>
              </div>

              {/* Center Info: Title + Status + Stock */}
              <div className="text-right flex-1 min-w-0 pr-1">
                <h4 className="font-extrabold text-xs text-neutral-900 leading-snug line-clamp-2 mb-1">
                  {item.title}
                </h4>
                <div className="flex items-center justify-start gap-1.5 flex-wrap">
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-emerald-200">
                    موجود در تهران
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    موجود: {item.stockCount || 4} عدد
                  </span>
                </div>
              </div>

              {/* Right Side: Square Brand Tag */}
              <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center font-black text-xs text-neutral-900 shrink-0">
                {brandCode}
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Product Details Modal */}
      {(() => {
        if (!selectedLocalForModal) return null;
        const effectiveRate = getEffectiveAedRate(settings) || defaultSettings.aedRate || 55000;
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
              description: selectedLocalForModal.description || 'اورجینال - موجود در انبار ایران جهت ارسال فوری ۲۴ ساعته',
              badge: selectedLocalForModal.deliveryBadge || '⚡ تحویل فوری ۲۴ ساعته',
              flavors: selectedLocalForModal.flavors || [],
              sizes: selectedLocalForModal.sizes || []
            }}
            settings={settings || defaultSettings}
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
    </section>
  );
};
