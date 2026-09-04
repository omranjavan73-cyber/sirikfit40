import React, { useState } from 'react';
import { Sparkles, RefreshCw, Save, Image as ImageIcon, Link as LinkIcon, DollarSign, Layers, Plus, Upload } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import type { Product } from '../../types/product';
import { extractCleanUrl, deduplicateImageUrls, formatToman, toPersianDigits, isArtificialFallback } from '../../utils/formatters';
import { sanitizeProductTitle } from '../../utils/textSanitizer';
import { parseProductLinkUniversal, generateBilingualProductTitle, cleanProductTitle, extractDraftProduct } from '../../utils/parseLink';
import { extractProductShared } from '../../services/sharedExtractor';
import { getEffectiveGeminiKeysList } from '../../utils/geminiKey';
import { normalizeProductImageUrl } from '../../utils/urlHelper';
import { universalScraperService } from '../../services/scraperService';

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
  const [selectedSection, setSelectedSection] = useState<'deals' | 'iran_warehouse'>(
    (initialProduct?.targetSection as any) || (activeTab === 'iran_warehouse' ? 'iran_warehouse' : 'deals')
  );
  const [inputUrl, setInputUrl] = useState<string>(initialProduct?.url || initialProduct?.sourceUrl || '');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setProductDraft(prev => ({ ...prev, imageUrl: localUrl, image: localUrl, images: [localUrl] }));
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `products/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      setProductDraft(prev => ({ ...prev, imageUrl: downloadUrl, image: downloadUrl, images: [downloadUrl] }));
      if (showToast) showToast('تصویر با موفقیت در فضای ابری ذخیره شد', 'success');
    } catch (err: any) {
      console.error('[Storage Upload Error]:', err);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const b64 = reader.result as string;
          setProductDraft(prev => ({ ...prev, imageUrl: b64, image: b64, images: [b64] }));
          if (showToast) showToast('تصویر به صورت محلی متصل شد', 'info');
        };
        reader.readAsDataURL(file);
      } catch (_e) {
        if (showToast) showToast('خطا در بارگذاری تصویر', 'error');
      }
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const [productDraft, setProductDraft] = useState<Product>(() => {
    const rawInitImg = initialProduct?.imageUrl || initialProduct?.image || '';
    const normInitImg = normalizeProductImageUrl(rawInitImg, initialProduct?.storeDomain || initialProduct?.url || 'https://drnutrition.com');
    const normGallery = (initialProduct?.images || []).map((img: string) => normalizeProductImageUrl(img, initialProduct?.storeDomain || initialProduct?.url || 'https://drnutrition.com')).filter(Boolean);

    return {
      id: initialProduct?.id || `prod_${Date.now()}`,
      titleFa: initialProduct?.titleFa || initialProduct?.title || '',
      titleEn: initialProduct?.titleEn || '',
      title: initialProduct?.title || initialProduct?.titleFa || '',
      imageUrl: normInitImg,
      image: normInitImg,
      images: normGallery.length > 0 ? normGallery : (normInitImg ? [normInitImg] : []),
      galleryImages: normGallery.length > 0 ? normGallery : (normInitImg ? [normInitImg] : []),
      priceAed: Number(initialProduct?.priceAed || initialProduct?.price || 0),
      priceToman: Number(initialProduct?.priceToman || 0),
      storeName: initialProduct?.storeName || 'Dr. Nutrition',
      targetSection: initialProduct?.targetSection || (activeTab === 'iran_warehouse' ? 'iran_warehouse' : 'deals'),
      isActive: initialProduct?.isActive !== false,
      isDraft: Boolean(initialProduct?.isDraft),
      profitMargin: initialProduct?.profitMargin ?? 20,
      shippingFeeAed: initialProduct?.shippingFeeAed ?? 20,
      category: initialProduct?.category || 'supplements',
      subCategory: initialProduct?.subCategory || 'all',
      variants: initialProduct?.variants || [],
      createdAt: initialProduct?.createdAt || new Date().toISOString()
    };
  });

  const handleExtractDraft = async () => {
    const targetUrl = extractCleanUrl(inputUrl);
    if (!targetUrl || !targetUrl.trim()) {
      if (showToast) showToast('لطفاً لینک معتبر محصول را وارد کنید', 'error');
      return;
    }
    setInputUrl(targetUrl);

    setIsExtracting(true);
    try {
      console.log('[Scraper Engine] Initiating extraction from caller: ProductForm', { targetUrl, section: selectedSection });
      const extracted = await extractProductShared(targetUrl, undefined, { bypassCache: true, forceFresh: true });

      // STRICT PRE-DRAFT VALIDATION GUARD (Anti-Corruption Invariant)
      const isValidPayload = Boolean(
        extracted &&
        extracted.success &&
        (extracted.titleFa || extracted.titleEn || extracted.title) &&
        (extracted.titleFa !== 'محصول بدون عنوان' && extracted.title !== 'محصول بدون عنوان') &&
        Number(extracted.priceAed || extracted.price || 0) > 0
      );

      if (!isValidPayload) {
        if (showToast) showToast('خطا: اطلاعات کالا به درستی دریافت نشد. ایجاد پیش‌نویس متوقف شد.', 'error');
        setIsExtracting(false);
        return;
      }

      const resolvedPriceAed = Number(extracted.priceAed || extracted.price) || 0;
      const computedToman = Math.round((resolvedPriceAed + 20) * (1 + 0.20) * aedRate);

      // 1:1 Logic Clone from HeroCalculator for Absolute HTTPS CDN Image Resolution
      const rawImage = extracted.imageUrl || extracted.image || (extracted.images && extracted.images[0]) || '';
      let resolvedImageUrl = rawImage.trim();
      if (resolvedImageUrl.startsWith('//')) {
        resolvedImageUrl = `https:${resolvedImageUrl}`;
      } else if (resolvedImageUrl.startsWith('/')) {
        const domain = targetUrl.includes('drnutrition') ? 'https://drnutrition.com' : 'https://www.lifepharmacy.com';
        resolvedImageUrl = `${domain}${resolvedImageUrl}`;
      }
      const normMainImg = normalizeProductImageUrl(resolvedImageUrl, targetUrl) || resolvedImageUrl;

      const cleanTitleEn = sanitizeProductTitle(extracted.titleEn || extracted.title || '');
      const cleanTitleFa = sanitizeProductTitle(extracted.titleFa || extracted.title || '');
      const cleanTitle = cleanTitleFa || cleanTitleEn;

      const draftPayload: Product = {
        id: extracted.id || `prod_${Date.now()}`,
        titleFa: cleanTitleFa || cleanTitle,
        titleEn: cleanTitleEn,
        title: cleanTitle,
        imageUrl: normMainImg,
        image: normMainImg,
        images: extracted.images.length > 0 ? extracted.images : (normMainImg ? [normMainImg] : []),
        galleryImages: extracted.galleryImages.length > 0 ? extracted.galleryImages : (normMainImg ? [normMainImg] : []),
        priceAed: resolvedPriceAed,
        price: resolvedPriceAed,
        priceToman: computedToman,
        manualPriceToman: null,
        isManualPrice: false,
        originalPriceAed: extracted.originalPriceAed,
        discountPercent: extracted.discountPercent,
        weightKg: extracted.weightKg || 0.8,
        storeName: extracted.storeName || 'Dr. Nutrition',
        brand: extracted.brand || extracted.storeName || 'Dr. Nutrition',
        targetSection: selectedSection,
        isActive: true,
        isDraft: false,
        profitMargin: 20,
        shippingFeeAed: 20,
        category: extracted.category || productDraft.category || 'supplements',
        subCategory: productDraft.subCategory || 'all',
        flavors: extracted.flavors,
        sizes: extracted.sizes,
        variants: extracted.variants.map((v, idx) => ({
          ...v,
          id: v.id || `var-${idx}-${Date.now()}`,
          priceAed: v.priceAed || resolvedPriceAed,
          priceAED: v.priceAed || resolvedPriceAed,
          imageUrl: v.imageUrl || extracted.imageUrl,
          image: v.image || extracted.image,
          inStock: v.inStock !== false
        })),
        description: extracted.description || 'محصول اورجینال سفارش داده شده مستقیماً از نمایندگی‌های معتبر دبی.',
        createdAt: new Date().toISOString(),
        url: targetUrl,
        sourceUrl: targetUrl
      };

      setProductDraft(draftPayload);
      if (showToast) {
        showToast(`پیش‌نویس محصول استخراج شد (${resolvedPriceAed} درهم)`, 'success');
      }
    } catch (err: any) {
      console.error('[ProductForm handleExtractDraft Error]:', err);
      if (showToast) showToast(err?.message || 'خطا در استخراج اطلاعات از لینک', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasTitle = Boolean(productDraft.titleFa || productDraft.title || productDraft.titleEn);
    if (!hasTitle) {
      if (showToast) showToast('عنوان فارسی یا انگلیسی محصول الزامی است', 'error');
      return;
    }
    const hasPrice = (Number(productDraft.priceAed) > 0) || (Number(productDraft.priceToman) > 0);
    if (!hasPrice) {
      if (showToast) showToast('قیمت معتبر (درهم یا تومان) الزامی است', 'error');
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
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setSelectedSection('deals');
              setProductDraft(prev => ({ ...prev, targetSection: 'deals' }));
            }}
            className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
              selectedSection === 'deals' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔥 پیشنهادهای ویژه
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedSection('iran_warehouse');
              setProductDraft(prev => ({ ...prev, targetSection: 'iran_warehouse' }));
            }}
            className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
              selectedSection === 'iran_warehouse' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 انبار ایران
          </button>
        </div>
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
          <button
            type="button"
            onClick={() => {
              setInputUrl('');
              setProductDraft({
                id: `manual_${Date.now()}`,
                titleFa: '',
                titleEn: '',
                title: '',
                imageUrl: '',
                images: [],
                priceAed: 0,
                price: 0,
                priceToman: 0,
                manualPriceToman: null,
                isManualPrice: false,
                profitMargin: 20,
                shippingFeeAed: selectedSection === 'iran_warehouse' ? 0 : 20,
                storeName: selectedSection === 'iran_warehouse' ? 'انبار ایران (تحویل فوری)' : 'سیریک فیت',
                brand: selectedSection === 'iran_warehouse' ? 'موجود در انبار ایران' : 'سیریک فیت',
                targetSection: selectedSection,
                category: 'مکمل‌های ورزشی',
                subCategory: 'all',
                isActive: true,
                isDraft: false,
                variants: [],
                createdAt: new Date().toISOString()
              });
              if (showToast) showToast('فرم آماده ثبت دستی کالا شد', 'info');
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>محصول دستی</span>
          </button>
        </div>
      </div>

      {/* Thumbnail & Title Preview Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div className="w-14 h-14 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white flex items-center justify-center overflow-hidden shrink-0">
          {(productDraft.imageUrl || productDraft.image) ? (
            <img
              src={productDraft.imageUrl || productDraft.image}
              alt={productDraft.titleEn || productDraft.titleFa || 'Product thumbnail'}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="w-full h-full object-contain p-0.5"
              onError={(e) => {
                const failedUrl = productDraft.imageUrl || productDraft.image;
                console.error('[Image Load Failed - ProductForm]:', failedUrl);
                if (failedUrl && !failedUrl.includes('images.weserv.nl') && !failedUrl.startsWith('data:')) {
                  e.currentTarget.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(failedUrl);
                } else {
                  e.currentTarget.classList.add('opacity-40');
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[9px] text-slate-400">
              بدون تصویر
            </div>
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
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">تصویر کالا (لینک یا فایل):</label>
            {isUploadingImage && (
              <span className="text-[10px] font-bold text-emerald-600 animate-pulse">در حال ذخیره...</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={productDraft.imageUrl || productDraft.image || ''}
              onChange={(e) => setProductDraft((prev) => ({ ...prev, imageUrl: e.target.value, image: e.target.value }))}
              placeholder="https://..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-black dir-ltr text-right"
            />
            <label className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center cursor-pointer shrink-0 border border-slate-200">
              <Upload className="w-3.5 h-3.5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                disabled={isUploadingImage}
                className="hidden"
              />
            </label>
          </div>
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <label className="text-xs font-black text-slate-700">قیمت نهایی فروش (تومان):</label>
          <div className="relative w-44">
            <input
              type="number"
              value={productDraft.priceToman || ''}
              onChange={(e) => {
                const customVal = e.target.value === '' ? 0 : Number(e.target.value);
                setProductDraft((prev) => ({
                  ...prev,
                  priceToman: customVal,
                  manualPriceToman: customVal,
                  isManualPrice: true
                }));
              }}
              placeholder="قیمت دستی به تومان"
              className="w-full pl-12 pr-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
            />
            <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold">تومان</span>
          </div>
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
