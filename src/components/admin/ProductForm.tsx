import React, { useState } from 'react';
import { Sparkles, RefreshCw, Save, Image as ImageIcon, Link as LinkIcon, DollarSign, Layers } from 'lucide-react';
import type { Product } from '../../types/product';
import { scraperService, normalizeProductImageUrl } from '../../services/scraperService';
import { formatToman, toPersianDigits } from '../../utils/formatters';

export interface ProductFormProps {
  initialProduct?: Partial<Product>;
  activeTab?: 'deals' | 'iran_warehouse';
  onSave?: (product: Product) => Promise<void> | void;
  onCancel?: () => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
  aedRate?: number;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct,
  activeTab = 'deals',
  onSave,
  onCancel,
  showToast,
  aedRate = 54500
}) => {
  const [inputUrl, setInputUrl] = useState<string>(initialProduct?.url || initialProduct?.sourceUrl || '');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [productDraft, setProductDraft] = useState<Product>(() => ({
    id: initialProduct?.id || `prod_${Date.now()}`,
    titleFa: initialProduct?.titleFa || initialProduct?.title || '',
    titleEn: initialProduct?.titleEn || '',
    title: initialProduct?.title || initialProduct?.titleFa || '',
    imageUrl: initialProduct?.imageUrl || initialProduct?.image || '',
    image: initialProduct?.image || initialProduct?.imageUrl || '',
    images: initialProduct?.images || (initialProduct?.imageUrl ? [initialProduct.imageUrl] : []),
    priceAed: Number(initialProduct?.priceAed || initialProduct?.price || 0),
    priceToman: Number(initialProduct?.priceToman || 0),
    storeName: initialProduct?.storeName || 'Dr. Nutrition',
    targetSection: initialProduct?.targetSection || (activeTab === 'deals' ? 'deals' : 'iran_warehouse'),
    isActive: initialProduct?.isActive !== false,
    isDraft: Boolean(initialProduct?.isDraft),
    profitMargin: initialProduct?.profitMargin ?? 20,
    shippingFeeAed: initialProduct?.shippingFeeAed ?? 20,
    category: initialProduct?.category || 'supplements',
    subCategory: initialProduct?.subCategory || 'all',
    variants: initialProduct?.variants || [],
    createdAt: initialProduct?.createdAt || new Date().toISOString()
  }));

  const handleExtractDraft = async () => {
    if (!inputUrl.trim()) {
      if (showToast) showToast('لطفاً لینک معتبر محصول را وارد کنید', 'error');
      return;
    }

    setIsExtracting(true);
    try {
      const extractedData: any = await scraperService.extract(inputUrl.trim());

      const rawImg = extractedData.imageUrl || extractedData.image || (extractedData.images && extractedData.images[0]) || '';
      const resolvedImage = normalizeProductImageUrl(rawImg, extractedData.storeDomain || inputUrl.trim() || 'https://drnutrition.com');
      const resolvedPriceAed = Number(extractedData.priceAed || extractedData.price || 0);
      const computedToman = Math.round((resolvedPriceAed + 20) * (1 + 0.20) * aedRate);

      const newProductDraft: Product = {
        id: extractedData.id || `prod_${Date.now()}`,
        titleFa: extractedData.titleFa || extractedData.title || '',
        titleEn: extractedData.titleEn || extractedData.title || '',
        title: extractedData.titleFa || extractedData.title || '',
        imageUrl: resolvedImage,
        image: resolvedImage,
        images: resolvedImage ? [resolvedImage] : [],
        galleryImages: resolvedImage ? [resolvedImage] : [],
        priceAed: resolvedPriceAed,
        price: resolvedPriceAed,
        priceToman: computedToman,
        storeName: extractedData.storeName || 'Dr. Nutrition',
        targetSection: activeTab === 'deals' ? 'deals' : 'iran_warehouse',
        isActive: true,
        isDraft: false,
        profitMargin: 20,
        shippingFeeAed: 20,
        category: extractedData.category || productDraft.category || 'supplements',
        subCategory: productDraft.subCategory || 'all',
        variants: extractedData.variants || [],
        createdAt: new Date().toISOString(),
        url: inputUrl.trim(),
        sourceUrl: inputUrl.trim()
      };

      setProductDraft(newProductDraft);
      if (showToast) showToast('اطلاعات محصول و پیش‌نویس با موفقیت استخراج شد', 'success');
    } catch (err: any) {
      console.error('Extraction error:', err);
      if (showToast) showToast('خطا در استخراج اطلاعات: ' + (err?.message || 'لینک نامعتبر'), 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productDraft.titleFa && !productDraft.title) {
      if (showToast) showToast('عنوان فارسی محصول الزامی است', 'error');
      return;
    }
    if (!productDraft.priceAed || productDraft.priceAed <= 0) {
      if (showToast) showToast('قیمت معتبر درهم الزامی است', 'error');
      return;
    }

    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          ...productDraft,
          isActive: true,
          isDraft: false
        });
      }
      if (showToast) showToast('محصول با موفقیت ثبت شد', 'success');
    } catch (err: any) {
      if (showToast) showToast('خطا در ثبت محصول: ' + (err?.message || 'نامشخص'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5 text-right font-['Vazirmatn',sans-serif]" dir="rtl">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-sm text-slate-900">استخراج و ویرایش پیش‌نویس محصول</h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-black bg-blue-50 text-blue-700">
          {activeTab === 'deals' ? '🔥 بخش پیشنهادها' : '🏢 انبار ایران'}
        </span>
      </div>

      {/* URL Input & Extract Action */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">لینک محصول در فروشگاه مبدا (امارات / دبی):</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.drnutrition.com/... یا https://ae.iherb.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-black dir-ltr text-right pl-9"
            />
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
          <button
            type="button"
            onClick={handleExtractDraft}
            disabled={isExtracting}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isExtracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isExtracting ? 'در حال استخراج...' : 'استخراج پیش‌نویس'}</span>
          </button>
        </div>
      </div>

      {/* Thumbnail & Title Preview Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="w-20 h-20 bg-white border border-slate-200 rounded-2xl p-1 shrink-0 flex items-center justify-center overflow-hidden">
          {(productDraft.imageUrl || productDraft.image) ? (
            <img
              src={productDraft.imageUrl || productDraft.image}
              alt={productDraft.titleFa || 'Product thumbnail'}
              className="w-full h-full object-contain"
            />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-300" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
              {productDraft.storeName || 'Dr. Nutrition'}
            </span>
            <span className="text-[10px] font-bold text-emerald-600">
              {productDraft.priceAed ? `${toPersianDigits(productDraft.priceAed)} AED` : 'قیمت وارد نشده'}
            </span>
          </div>
          <h4 className="text-xs font-black text-slate-900 truncate">
            {productDraft.titleFa || productDraft.title || 'عنوان محصول پس از استخراج اینجا نمایش داده می‌شود'}
          </h4>
          {productDraft.titleEn && (
            <p className="text-[11px] text-slate-500 font-mono truncate dir-ltr text-right">
              {productDraft.titleEn}
            </p>
          )}
        </div>
      </div>

      {/* Editable Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">عنوان فارسی محصول:</label>
          <input
            type="text"
            value={productDraft.titleFa || ''}
            onChange={(e) => setProductDraft((prev) => ({ ...prev, titleFa: e.target.value, title: e.target.value }))}
            placeholder="عنوان فارسی..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">عنوان انگلیسی محصول:</label>
          <input
            type="text"
            value={productDraft.titleEn || ''}
            onChange={(e) => setProductDraft((prev) => ({ ...prev, titleEn: e.target.value }))}
            placeholder="English Title..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-black dir-ltr text-right"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">لینک مستقیم تصویر (imageUrl):</label>
          <input
            type="text"
            value={productDraft.imageUrl || productDraft.image || ''}
            onChange={(e) => setProductDraft((prev) => ({ ...prev, imageUrl: e.target.value, image: e.target.value }))}
            placeholder="https://..."
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-black dir-ltr text-right"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">قیمت به درهم (AED):</label>
          <input
            type="number"
            value={productDraft.priceAed || ''}
            onChange={(e) => {
              const p = parseFloat(e.target.value) || 0;
              const toman = Math.round((p + (productDraft.shippingFeeAed || 20)) * (1 + (productDraft.profitMargin || 20) / 100) * aedRate);
              setProductDraft((prev) => ({ ...prev, priceAed: p, price: p, priceToman: toman }));
            }}
            placeholder="0"
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-black dir-ltr text-center"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="text-xs font-black text-emerald-700">
          <span>قیمت محاسبه‌شده تومان: </span>
          <span>{formatToman(productDraft.priceToman || 0)} تومان</span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              انصراف
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />}
            <span>ذخیره پیش‌نویس</span>
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;
