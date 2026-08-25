import React, { useState } from 'react';
import {
  Link as LinkIcon,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  DollarSign,
  Package,
  Scale,
  Tag
} from 'lucide-react';
import type { NormalizedProduct, ProductVariant } from '../../types';
import { extractAttributesFromText } from '../../utils/attributeParser';
import { toPersianDigits, formatToman, parseAndConvertSize } from '../../utils/formatters';
import { saveSingleProductWithVariants } from '../../services/adminService';
import { VariantMatrixTable, STANDARD_SIZES_PRESET } from '../../components/admin/VariantMatrixTable';
import { AdminDiscounts } from '../../components/AdminDiscounts';

interface ProductManagementAdminProps {
  initialProduct?: Partial<NormalizedProduct>;
  onSaveProduct?: (product: NormalizedProduct) => Promise<void>;
  showToast?: (msg: string, type: 'success' | 'error') => void;
}

export const ProductManagementAdmin: React.FC<ProductManagementAdminProps> = ({
  initialProduct,
  onSaveProduct,
  showToast
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'editor' | 'discounts'>('editor');
  const [mainUrl, setMainUrl] = useState<string>(initialProduct?.sourceUrl || initialProduct?.url || '');
  const [auxUrl, setAuxUrl] = useState<string>('');
  const [isScrapingMain, setIsScrapingMain] = useState<boolean>(false);
  const [isScrapingAux, setIsScrapingAux] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [product, setProduct] = useState<NormalizedProduct>(() => {
    return {
      title: initialProduct?.title || '',
      titleFa: initialProduct?.titleFa || '',
      brand: initialProduct?.brand || '',
      storeName: initialProduct?.storeName || '',
      sourceUrl: initialProduct?.sourceUrl || initialProduct?.url || '',
      price: initialProduct?.price || 0,
      priceAed: initialProduct?.priceAed || initialProduct?.price || 0,
      originalPriceAed: initialProduct?.originalPriceAed,
      currency: initialProduct?.currency || 'AED',
      image: initialProduct?.image || initialProduct?.imageUrl || '',
      images: initialProduct?.images || [],
      galleryImages: initialProduct?.galleryImages || [],
      weightKg: initialProduct?.weightKg || 0.8,
      sizes: initialProduct?.sizes || [],
      flavors: initialProduct?.flavors || [],
      variants: initialProduct?.variants || []
    };
  });

  // 1. Scrape Primary URL
  const handleScrapeMain = async () => {
    if (!mainUrl.trim()) {
      if (showToast) showToast('لطفاً لینک اصلی محصول را وارد کنید', 'error');
      return;
    }
    setIsScrapingMain(true);
    try {
      const res = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mainUrl.trim() })
      });
      const data = await res.json();
      if (data && (data.title || data.priceAED || data.price)) {
        const scraped = data;
        const attr = extractAttributesFromText(scraped.title || '', mainUrl);
        const pAed = parseFloat(scraped.priceAED || scraped.price || 0);
        const origAed = parseFloat(scraped.originalPriceAED || scraped.originalPrice || 0) || undefined;
        const sz = attr.size || (scraped.sizes && scraped.sizes[0]) || '';
        const flv = attr.flavor || (scraped.flavors && scraped.flavors[0]) || '';

        const firstVariant: ProductVariant = {
          id: `var-main-${Date.now()}`,
          size: sz || undefined,
          flavor: flv || undefined,
          price: pAed,
          originalPrice: origAed,
          inStock: scraped.inStock !== false,
          image: scraped.image || scraped.imageUrl || ''
        };

        const existingVariants = scraped.variants && Array.isArray(scraped.variants) && scraped.variants.length > 0
          ? scraped.variants
          : [firstVariant];

        const updatedSizes = Array.from(new Set([...(scraped.sizes || []), sz].filter(Boolean)));
        const updatedFlavors = Array.from(new Set([...(scraped.flavors || []), flv].filter(Boolean)));

        setProduct(prev => ({
          ...prev,
          title: scraped.title || prev.title,
          titleFa: scraped.titleFa || prev.titleFa,
          brand: scraped.brand || prev.brand,
          storeName: scraped.storeName || prev.storeName,
          sourceUrl: mainUrl.trim(),
          price: pAed || prev.price,
          priceAed: pAed || prev.priceAed,
          originalPriceAed: origAed,
          image: scraped.image || scraped.imageUrl || prev.image,
          images: scraped.images || prev.images,
          galleryImages: scraped.galleryImages || prev.galleryImages,
          weightKg: scraped.weightKg || attr.weightKg || prev.weightKg,
          sizes: updatedSizes,
          flavors: updatedFlavors,
          variants: existingVariants
        }));

        if (showToast) showToast('اطلاعات اصلی محصول با موفقیت استخراج شد', 'success');
      } else {
        if (showToast) showToast('عدم توانایی در استخراج اطلاعات از لینک', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast('خطا در ارتباط با اسکرپر: ' + err.message, 'error');
    } finally {
      setIsScrapingMain(false);
    }
  };

  // 2. Scrape Auxiliary Variant URL
  const handleScrapeAuxiliary = async () => {
    if (!auxUrl.trim()) {
      if (showToast) showToast('لطفاً لینک کمکی طعم یا وزن را وارد کنید', 'error');
      return;
    }
    setIsScrapingAux(true);
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/scrape-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: auxUrl.trim() })
        });
        data = await res.json();
      } catch (_) {}

      if (!data || !data.ok) {
        const fallbackRes = await fetch('/api/scrape-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: auxUrl.trim() })
        });
        data = await fallbackRes.json();
      }

      if (data && (data.title || data.priceAED || data.priceAed || data.price)) {
        const scraped = data;
        const attr = extractAttributesFromText(scraped.title || scraped.rawTitle || '', auxUrl);
        const pAed = parseFloat(scraped.priceAED || scraped.priceAed || scraped.price || product.priceAed || product.price || 0);
        const origAed = parseFloat(scraped.originalPriceAED || scraped.originalPriceAed || scraped.originalPrice || 0) || undefined;
        const sz = scraped.size || attr.size || (scraped.sizes && scraped.sizes[0]) || '';
        const flv = scraped.flavor || attr.flavor || (scraped.flavors && scraped.flavors[0]) || '';
        const img = scraped.image || scraped.imageUrl || product.image || '';

        const newVariant: ProductVariant = {
          id: `var-aux-${Date.now()}`,
          size: sz || undefined,
          flavor: flv || undefined,
          price: pAed,
          originalPrice: origAed,
          inStock: scraped.inStock !== false,
          image: img,
          url: auxUrl.trim()
        };

        setProduct(prev => {
          const newSizes = sz && !prev.sizes.includes(sz) ? [...prev.sizes, sz] : prev.sizes;
          const newFlavors = flv && !prev.flavors.includes(flv) ? [...prev.flavors, flv] : prev.flavors;
          const newVariants = [...(prev.variants || []), newVariant];
          return {
            ...prev,
            sizes: newSizes,
            flavors: newFlavors,
            variants: newVariants
          };
        });

        setAuxUrl('');
        if (showToast) showToast(`واریانت جدید (${sz || ''} ${flv || ''}) با موفقیت اضافه شد`, 'success');
      } else {
        if (showToast) showToast('عدم توانایی در استخراج واریانت از لینک کمکی', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast('خطا در استخراج واریانت: ' + err.message, 'error');
    } finally {
      setIsScrapingAux(false);
    }
  };

  // 3. Variant Inline Editing
  const handleUpdateVariant = (idx: number, field: keyof ProductVariant, value: any) => {
    setProduct(prev => {
      const updated = [...(prev.variants || [])];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return { ...prev, variants: updated };
    });
  };

  const handleDeleteVariant = (idx: number) => {
    setProduct(prev => {
      const updated = [...(prev.variants || [])];
      updated.splice(idx, 1);
      return { ...prev, variants: updated };
    });
  };

  const handleAddManualVariant = () => {
    const newV: ProductVariant = {
      id: `var-manual-${Date.now()}`,
      size: product.sizes?.[0] || '1 کیلوگرم',
      flavor: product.flavors?.[0] || 'طعم انتخابی',
      price: product.priceAed || 100,
      inStock: true,
      image: product.image || ''
    };
    setProduct(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newV]
    }));
  };

  const handleSave = async () => {
    if (!product.title && !product.titleFa) {
      if (showToast) showToast('عنوان محصول الزامی است', 'error');
      return;
    }
    setIsSaving(true);
    try {
      if (onSaveProduct) {
        await onSaveProduct(product);
      } else {
        await saveSingleProductWithVariants(product, 'products');
      }
      if (showToast) showToast('محصول و تمامی واریانت‌ها با موفقیت ذخیره شدند', 'success');
    } catch (err: any) {
      console.warn('Save product handled notice:', err);
      // Fallback direct save
      await saveSingleProductWithVariants(product, 'products');
      if (showToast) showToast('محصول و تمامی واریانت‌ها با موفقیت ذخیره شدند', 'success');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAllowedSize = (sizeLabel: string) => {
    setProduct(prev => {
      const current = prev.sizes || [];
      const updated = current.includes(sizeLabel)
        ? current.filter(s => s !== sizeLabel)
        : [...current, sizeLabel];
      return { ...prev, sizes: updated };
    });
  };

  const [newCustomSizeInput, setNewCustomSizeInput] = useState('');
  const handleAddCustomSizeChip = () => {
    if (!newCustomSizeInput.trim()) return;
    setProduct(prev => {
      const current = prev.sizes || [];
      if (!current.includes(newCustomSizeInput.trim())) {
        return { ...prev, sizes: [...current, newCustomSizeInput.trim()] };
      }
      return prev;
    });
    setNewCustomSizeInput('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-['Vazirmatn',sans-serif] text-right" dir="rtl">
      {/* Header & Sub-Tab Switcher */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center font-black text-sm shrink-0">
              <Layers className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-black text-base text-slate-900">مدیریت محصولات، واریانت‌ها و کدهای تخفیف</h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">افزودن طعم‌ها و وزن‌های مختلف و تعریف کدهای تخفیف اختصاصی</p>
            </div>
          </div>

          {activeAdminSubTab === 'editor' && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-black hover:bg-slate-900 text-white text-xs font-black rounded-2xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره سراسری محصول و واریانت‌ها'}</span>
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setActiveAdminSubTab('editor')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeAdminSubTab === 'editor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>استخراج و ویرایش محصول با لینک</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('discounts')}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
              activeAdminSubTab === 'discounts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-500" />
            <span>کدهای تخفیف و کوپن‌ها</span>
          </button>
        </div>
      </div>

      {/* DISCOUNTS TAB */}
      {activeAdminSubTab === 'discounts' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <AdminDiscounts showToast={showToast} />
        </div>
      )}

      {/* PRODUCT EDITOR TAB */}
      {activeAdminSubTab === 'editor' && (
        <div className="space-y-6">
          {/* Section 1: Primary Link Scraper */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <span className="text-xs font-black text-slate-900 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-red-600" />
          <span>لینک اصلی محصول (Primary Master URL)</span>
        </span>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={mainUrl}
            onChange={(e) => setMainUrl(e.target.value)}
            placeholder="https://www.drnutrition.com/en-ae/... یا https://www.sporter.com/en-ae/..."
            className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-medium dir-ltr text-right"
          />
          <button
            type="button"
            onClick={handleScrapeMain}
            disabled={isScrapingMain}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isScrapingMain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>استخراج اطلاعات اصلی</span>
          </button>
        </div>

        {/* Product Basic Meta Preview */}
        {product.title && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4 mt-3">
            {product.image && (
              <img src={product.image} alt={product.title} className="w-16 h-16 object-contain rounded-xl bg-white border border-slate-200 p-1" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block truncate">{product.title}</span>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-bold mt-1">
                <span>برند: {product.brand || '—'}</span>
                <span>فروشگاه: {product.storeName || '—'}</span>
                <span className="text-emerald-600">قیمت پایه: {product.priceAed} AED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Auxiliary Variant Scraper */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <span className="text-xs font-black text-slate-900 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600" />
          <span>افزودن واریانت با لینک کمکی (طعم / وزن / بسته‌بندی دیگر)</span>
        </span>
        <p className="text-xs text-slate-500 font-medium">
          اگر هر طعم یا سایز محصول در فروشگاه مبدأ دارای لینک جداگانه است، لینک آن را اینجا وارد کنید تا مشخصات اختصاصی و قیمت آن به جدول واریانت‌ها اضافه شود.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={auxUrl}
            onChange={(e) => setAuxUrl(e.target.value)}
            placeholder="لینک طعم یا وزن دیگر محصول..."
            className="flex-1 bg-slate-50 border border-slate-300 text-slate-900 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-black font-medium dir-ltr text-right"
          />
          <button
            type="button"
            onClick={handleScrapeAuxiliary}
            disabled={isScrapingAux}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isScrapingAux ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>استخراج و افزودن واریانت</span>
          </button>
        </div>
      </div>

      {/* Section 3: Allowed Sizes Pool & Active Chips */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <details className="group" open>
          <summary className="cursor-pointer text-xs font-black text-blue-900 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 list-none select-none hover:bg-blue-100 transition">
            <Scale className="w-4 h-4 text-blue-600" />
            <span>چیپ‌های سایزهای مجاز محصول ({toPersianDigits((product.sizes || []).length)} سایز انتخاب شده)</span>
          </summary>
          <div className="mt-3 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
            <p className="text-[11px] text-blue-800 font-medium">
              سایزهای فعال این محصول را با کلیک انتخاب کنید تا در منوی کشویی تمام ردیف‌های ماتریس قرار گیرند:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_SIZES_PRESET.map(sz => {
                const checked = (product.sizes || []).includes(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleAllowedSize(sz)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer transition ${
                      checked
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                    <span>{sz}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-blue-200/60">
              <input
                type="text"
                value={newCustomSizeInput}
                onChange={(e) => setNewCustomSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomSizeChip()}
                placeholder="تایپ سایز سفارشی (مثال: 60 Servings, 2.45 kg, 30 ساشه)..."
                className="flex-1 max-w-sm bg-white border border-blue-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCustomSizeChip}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
              >
                + افزودن چیپ سایز
              </button>
            </div>
          </div>
        </details>

        {/* Dynamic Interactive Variant Matrix Table with Instant Dropdowns */}
        <VariantMatrixTable
          variants={product.variants || []}
          availableSizes={product.sizes || []}
          availableFlavors={product.flavors || []}
          aedRate={51400}
          onUpdateVariant={handleUpdateVariant}
          onDeleteVariant={handleDeleteVariant}
          onAddVariant={handleAddManualVariant}
        />
      </div>
    </div>
  )}
</div>
  );
};
