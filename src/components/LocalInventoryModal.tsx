import React, { useState } from 'react';
import { PackageCheck, X, Search, Sparkles, CheckCircle2, Clock, Truck, ShoppingBag, AlertCircle } from 'lucide-react';
import type { LocalInventoryItem, User } from '../types';
import { formatToman } from '../utils/formatters';

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
}

export const LocalInventoryModal: React.FC<LocalInventoryModalProps> = ({
  items,
  isOpen,
  onClose,
  onSelectLocalProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = ['همه', ...Array.from(new Set(items.map(i => i.category || 'عمومی')))];

  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'همه' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleOrder = (item: LocalInventoryItem) => {
    // Convert Toman price directly to AED equivalent so OrderForm / API handles it smoothly
    onSelectLocalProduct({
      title: item.title,
      url: 'https://omex-dubai.ir/local-stock/' + item.id,
      priceAed: Math.round(item.priceToman / 19500),
      weightKg: 0.5,
      image: item.image,
      storeName: 'انبار ایران (تحویل فوری)',
      calculatedTomanOverride: item.priceToman
    });
    onClose();
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
                <h3 className="font-black text-lg sm:text-xl text-white">موجودی در انبار ایران</h3>
                <span className="bg-amber-300 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-700" />
                  <span>تحویل ۱ تا ۲ روزه</span>
                </span>
              </div>
              <p className="text-xs text-purple-100 font-medium mt-0.5">
                محصولات فیزیکی موجود در تهران جهت ارسال فوری بدون نیاز به انتظار فرآیند کارگو
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در کالاهای موجود در انبار ایران..."
              className="w-full bg-white border border-slate-200 focus:border-[#7C3AED] text-slate-800 text-xs rounded-xl pr-9 pl-3 py-2.5 outline-none font-medium transition"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">کالایی در این دسته‌بندی یافت نشد.</p>
              <p className="text-xs text-slate-400 mt-1">می‌توانید کالا را از دبی سفارش دهید تا ۷ روزه ارسال شود.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`product-card bg-white border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 overflow-hidden ${
                    item.inStock
                      ? 'border-slate-200 hover:border-purple-300 hover:shadow-md'
                      : 'border-slate-200/60 opacity-60 bg-slate-50'
                  }`}
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="img-wrap relative mb-3 w-full h-[130px] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover object-center block"
                      />
                      <div className="badge absolute top-2 right-2 flex flex-col gap-1 z-20">
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{item.deliveryBadge || 'تحویل فوری'}</span>
                        </span>
                      </div>

                      {item.inStock && (
                        <span className="badge absolute bottom-2 left-2 bg-slate-900/80 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md backdrop-blur-md z-20">
                          موجود در تهران ({item.stockQuantity} عدد)
                        </span>
                      )}
                    </div>

                    {/* Category & Title */}
                    <span className="text-[10px] font-black text-[#7C3AED] block mb-1">
                      {item.category}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 line-clamp-2 leading-relaxed mb-2">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-3 leading-normal">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing & Buy Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                    <div>
                      {item.originalPriceToman && item.originalPriceToman > item.priceToman && (
                        <span className="text-[11px] text-slate-400 line-through block font-medium">
                          {formatToman(item.originalPriceToman)}
                        </span>
                      )}
                      <span className="text-base font-black text-[#7C3AED]">
                        {formatToman(item.priceToman)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleOrder(item)}
                      disabled={!item.inStock}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        item.inStock
                          ? 'bg-[#7C3AED] hover:bg-violet-700 text-white shadow-xs hover:scale-102 active:scale-98'
                          : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{item.inStock ? 'ثبت سفارش فوری' : 'اتمام موجودی'}</span>
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
    </div>
  );
};
