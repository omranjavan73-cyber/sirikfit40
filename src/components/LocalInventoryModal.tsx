import React, { useState } from 'react';
import { PackageCheck, X, Search, Sparkles, CheckCircle2, Truck, AlertCircle } from 'lucide-react';
import type { LocalInventoryItem, FinancialSettings } from '../types';
import { formatToman, formatPrice, getEffectiveAedRate } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { ProductDetailModal } from './ProductDetailModal';

interface LocalInventoryModalProps {
  items: LocalInventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectLocalProduct: (product: {
    title: string;
    url: string;
    priceAed: number;
    weightKg: number;
    image?: string;
    storeName?: string;
    calculatedTomanOverride?: number;
  }) => void;
  settings?: FinancialSettings;
  onAddToCart?: (product: any, selectedFlavor?: string, selectedSize?: string) => void;
}

export const LocalInventoryModal: React.FC<LocalInventoryModalProps> = ({
  items,
  isOpen,
  onClose,
  onSelectLocalProduct,
  settings,
  onAddToCart
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLocalForModal, setSelectedLocalForModal] = useState<LocalInventoryItem | null>(null);
  const { aedRate } = useSettings();
  const currentRate = aedRate && aedRate > 0 ? aedRate : 23000;

  if (!isOpen) return null;

  const safeItems = items || [];
  const categories = ['همه', ...Array.from(new Set(safeItems.map(i => i?.category || 'عمومی')))];

  const filteredItems = safeItems.filter(item => {
    const matchesCategory = selectedCategory === 'همه' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOrder = (item: LocalInventoryItem) => {
    const payload = {
      id: 'local-' + item.id,
      title: item.title,
      url: 'https://omex-dubai.ir/local-stock/' + item.id,
      priceAed: currentRate > 0 ? Math.round(item.priceToman / currentRate) : 0,
      weightKg: 0.5,
      image: item.image,
      storeName: 'انبار ایران (تحویل فوری)',
      calculatedTomanOverride: item.priceToman,
      calculatedToman: item.priceToman,
      isLocalInventory: true,
      quantity: 1
    };

    if (onAddToCart) {
      onAddToCart(payload);
    } else {
      onSelectLocalProduct(payload);
    }
    onClose();
  };

  const defaultSettings: FinancialSettings = settings || {
    cargoRatePerKg: 35,
    profitMargin: 20,
    aedRate: currentRate
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-['Vazirmatn',sans-serif]">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-violet-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">موجودی انبار ایران (تحویل فوری)</h3>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>آماده ارسال ۲۴ ساعته</span>
                </span>
              </div>
              <p className="text-xs text-purple-100 font-medium mt-0.5">ارسال مستقیم با پست پیشتاز و پیک اختصاصی در تهران</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Controls: Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجو در موجودی انبار ایران..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Items */}
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-extrabold">محصولی در این دسته‌بندی یافت نشد.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedLocalForModal(item)}
                  className={`group bg-white border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    item.inStock
                      ? 'border-slate-200 hover:border-purple-500 hover:shadow-md'
                      : 'border-slate-200/60 opacity-60 bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="img-wrap relative mb-3 w-full h-[130px] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="badge absolute top-2 right-2 flex flex-col gap-1 z-20">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{item.deliveryBadge || 'تحویل فوری'}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-[#7C3AED] block mb-1">{item.category}</span>
                    <h4 className="font-extrabold text-sm text-slate-900 line-clamp-2 leading-relaxed mb-2">{item.title}</h4>
                  </div>
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 mt-2 w-full">
                    <div className="flex items-baseline gap-1 text-red-600 font-extrabold text-xs sm:text-sm md:text-base whitespace-nowrap">
                      <span>{formatPrice(item.priceToman)}</span>
                      <span className="text-[10px] sm:text-[11px] font-bold">تومان</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLocalForModal(item);
                      }}
                      disabled={!item.inStock}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                        item.inStock
                          ? 'bg-slate-900 hover:bg-red-600 text-white shadow-sm hover:shadow-md active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span>افزودن به سبد خرید</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-purple-50/80 border-t border-purple-100 flex items-center justify-between text-[11px] text-purple-900 font-bold">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>تمامی مکمل‌ها و کالاها پلمپ اصل خرید مستقیم از امارات می‌باشند.</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 underline cursor-pointer text-xs shrink-0"
          >
            بستن
          </button>
        </div>

      </div>

      {/* Embedded Product Details Modal */}
      {(() => {
        if (!selectedLocalForModal) return null;
        const effectiveRate = getEffectiveAedRate(settings) || currentRate || 55000;
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
            settings={settings || { cargoRatePerKg: 35, profitMargin: 20, aedRate: effectiveRate }}
            onAddToCart={(productPayload, flavor, size) => {
              if (onAddToCart) {
                onAddToCart(productPayload, flavor, size);
              } else if (selectedLocalForModal) {
                handleOrder(selectedLocalForModal);
              }
              setSelectedLocalForModal(null);
              onClose();
            }}
          />
        );
      })()}
    </div>
  );
};
