import React, { useState } from 'react';
import type { LocalInventoryItem } from '../types';
import { formatToman } from '../utils/formatters';

interface LocalInventorySectionProps {
  items?: LocalInventoryItem[];
  onSelectLocalProduct: (item: LocalInventoryItem) => void;
  onOpenFullModal?: () => void;
}

export const LocalInventorySection: React.FC<LocalInventorySectionProps> = ({
  items = [],
  onSelectLocalProduct,
  onOpenFullModal
}) => {
  const [addedItemId, setAddedItemId] = useState<string | null>(null);
  const visibleItems = items.filter(item => item.inStock !== false);

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
              onClick={() => onSelectLocalProduct(item)}
              className="bg-white border border-neutral-200 hover:border-black rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs transition cursor-pointer"
            >
              {/* Left Side: Price + 'ثبت سفارش' Button */}
              <div className="flex flex-col items-start shrink-0 min-w-[100px]">
                <span className="font-black text-xs sm:text-sm text-neutral-900 mb-1.5 dir-rtl">
                  {formatToman(item.priceToman)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLocalProduct(item);
                    setAddedItemId(item.id);
                    setTimeout(() => setAddedItemId(null), 1500);
                  }}
                  className={`font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs text-center w-full ${
                    addedItemId === item.id ? 'bg-emerald-600 text-white' : 'bg-black hover:bg-neutral-800 text-white'
                  }`}
                >
                  {addedItemId === item.id ? '✓ اضافه شد!' : 'افزودن به سبد خرید'}
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
    </section>
  );
};
