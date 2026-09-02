import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  Trash2, 
  ExternalLink,
  Package,
  Sparkles
} from 'lucide-react';
import { toPersianDigits, formatToman, normalizeProductImageUrl } from '../../utils/formatters';
import type { Product } from '../../types/product';
import { 
  sortPopularProducts, 
  fetchPopularOrderFromFirestore, 
  saveManualPopularOrder, 
  removePopularProduct,
  normalizeProductId 
} from '../../services/popularProductsService';

export interface PopularOrderAdminProps {
  products: Product[];
  onOrderSaved?: (updatedProducts: Product[]) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PopularOrderAdmin: React.FC<PopularOrderAdminProps> = ({
  products,
  onOrderSaved,
  showToast
}) => {
  const [popularList, setPopularList] = useState<Product[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize and sort popular products using canonical popularSamplesOrder
  useEffect(() => {
    let isMounted = true;

    async function loadAndSort() {
      const canonicalOrder = await fetchPopularOrderFromFirestore();
      if (!isMounted) return;
      const sorted = sortPopularProducts(products, canonicalOrder);
      setPopularList(sorted);
    }

    loadAndSort();

    return () => {
      isMounted = false;
    };
  }, [products]);

  // Move item up in the list
  const moveUp = (index: number) => {
    if (index <= 0) return;
    setPopularList(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  // Move item down in the list
  const moveDown = (index: number) => {
    if (index >= popularList.length - 1) return;
    setPopularList(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Remove item from popular list
  const handleRemovePopular = async (prodId: string) => {
    const updated = popularList.filter(p => normalizeProductId(p.id) !== normalizeProductId(prodId));
    setPopularList(updated);

    try {
      await removePopularProduct(prodId);
      if (showToast) showToast('محصول از لیست پرطرفدارها حذف شد', 'info');
    } catch (err: any) {
      console.warn('Remove popular product error:', err);
    }
  };

  // Persist popularOrder using unified saveManualPopularOrder
  const handleSavePopularOrder = async () => {
    if (!popularList.length) {
      if (showToast) showToast('لیست پرطرفدارها خالی است', 'info');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await saveManualPopularOrder(popularList);

      const enriched = popularList.map((p, idx) => ({ ...p, popularOrder: idx, isPopular: true, isPopularSample: true }));
      if (onOrderSaved) {
        onOrderSaved(enriched);
      }

      setSaveSuccess(true);
      if (showToast) showToast('ترتیب پرطرفدارها با موفقیت در دیتابیس ذخیره شد', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving popular order batch:', err);
      if (showToast) showToast(`خطا در ذخیره ترتیب: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center font-black shadow-xs">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              ترتیب نمایش محصولات پرطرفدار (Popular Carousel)
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              ترتیب اولویت نمایش در کروسل بالای صفحه اصلی (محصول اول = اولین کارت در سمت راست)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-black px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl">
            {toPersianDigits(popularList.length)} محصول پرطرفدار
          </span>

          <button
            type="button"
            onClick={handleSavePopularOrder}
            disabled={isSaving || popularList.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>ذخیره شد ✓</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-emerald-200" />
                <span>ذخیره ترتیب پرطرفدارها</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* List items */}
      {popularList.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/50 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-500 text-xs font-bold space-y-2">
          <Flame className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
          <p>هیچ محصولی در وضعیت «پرطرفدار» قرار ندارد.</p>
          <p className="text-[11px] text-slate-400">
            برای افزودن محصول، در تب «پیشنهادهای ویژه» یا «انبار ایران» بر روی دکمه «★ پرطرفدار» کلیک کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {popularList.map((prod, idx) => {
            const displayImg = normalizeProductImageUrl(
              prod.imageUrl || prod.image,
              prod.sourceUrl || prod.url || 'https://drnutrition.com'
            );

            const isFirst = idx === 0;
            const isLast = idx === popularList.length - 1;

            return (
              <div
                key={prod.id || `popular-${idx}`}
                className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-2xl gap-3 hover:border-slate-300 dark:hover:border-zinc-700 transition"
              >
                {/* Left side: Rank number, thumbnail, info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    idx === 0 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200'
                  }`}>
                    {toPersianDigits(idx + 1)}
                  </div>

                  <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                    {displayImg ? (
                      <img
                        src={displayImg}
                        alt={prod.titleFa || prod.title}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder-product.png';
                        }}
                      />
                    ) : (
                      <Package className="w-5 h-5 text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-md">
                        {prod.titleFa || prod.title}
                      </h4>
                      {idx === 0 && (
                        <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold px-2 py-0.5 rounded-md shrink-0">
                          اول صفحه اصلی
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                      <span>{prod.storeName || prod.brand || 'دبی'}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {prod.priceToman ? formatToman(prod.priceToman) : (prod.priceAed ? `${toPersianDigits(prod.priceAed)} AED` : '')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Reorder Up/Down & Remove buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={isFirst}
                    title="انتقال به بالا (اولویت بیشتر)"
                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={isLast}
                    title="انتقال به پایین (اولویت کمتر)"
                    className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemovePopular(prod.id)}
                    title="حذف از پرطرفدارها"
                    className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-rose-600 dark:text-rose-400 flex items-center justify-center transition cursor-pointer shadow-2xs ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PopularOrderAdmin;
