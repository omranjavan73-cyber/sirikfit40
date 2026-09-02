import React, { useState, useEffect } from 'react';
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
  PackageCheck,
  Flame,
  Scale,
  Tag,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import type { NormalizedProduct, ProductVariant, LocalInventoryItem, FeaturedDeal, PricingRulesConfig } from '../../types';
import { extractAttributesFromText } from '../../utils/attributeParser';
import { toPersianDigits, formatToman, parseAndConvertSize, normalizeProductImageUrl, extractCleanUrl, deduplicateImageUrls, isArtificialFallback } from '../../utils/formatters';
import { calculateLandedPrice } from '../../utils/pricingCalculator';
import { generateBilingualProductTitle, parseProductLinkUniversal } from '../../utils/parseLink';
import { getEffectiveGeminiKeysList } from '../../utils/geminiKey';
import { saveSingleProductWithVariants, saveIranWarehouseItems, saveSpecialDeals } from '../../services/adminService';
import { VariantMatrixTable, STANDARD_SIZES_PRESET } from '../../components/admin/VariantMatrixTable';
import { PRESET_FLAVORS } from '../../utils/variantPresets';
import { FlavorAutocompleteInput } from '../../components/admin/FlavorAutocompleteInput';
import { AdminDiscounts } from '../../components/AdminDiscounts';
import { LinkManagementTab } from '../../components/admin/LinkManagementTab';
import { IranWarehouseAdmin } from './IranWarehouseAdmin';
import { DealsAdmin } from './DealsAdmin';
import { PopularOrderAdmin } from './PopularOrderAdmin';
import { AdminTaxonomyManager } from '../../components/AdminTaxonomyManager';
import { STORE_LIST, getStoreConfig } from '../../constants/stores';
import { detectStoreOrigin, universalScraperService, scraperService, extractProductDataUnified } from '../../services/scraperService';
import { ProductForm } from '../../components/admin/ProductForm';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

import { sortNewestFirst } from '../../context/ProductContext';
import { 
  addPopularProductToBeginning, 
  removePopularProduct, 
  normalizeProductId 
} from '../../services/popularProductsService';

interface ProductManagementAdminProps {
  initialProduct?: Partial<NormalizedProduct>;
  onSaveProduct?: (product: NormalizedProduct) => Promise<void>;
  showToast?: (msg: string, type: 'success' | 'error') => void;
  inventory?: LocalInventoryItem[];
  deals?: FeaturedDeal[];
}

export const ProductManagementAdmin: React.FC<ProductManagementAdminProps> = ({
  initialProduct,
  onSaveProduct,
  showToast,
  inventory: propInventory,
  deals: propDeals
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'inventory' | 'deals' | 'popularSamples' | 'categories' | 'discounts' | 'links' | 'editor'
  >('links');
  const [linksAlertCount, setLinksAlertCount] = useState<number>(0);
  const [inventoryList, setInventoryList] = useState<LocalInventoryItem[]>(() => {
    if (propInventory && propInventory.length > 0) return sortNewestFirst(propInventory);
    try {
      const raw = localStorage.getItem('sirikfit_iran_warehouse');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return sortNewestFirst(parsed);
      }
    } catch (_e) {}
    return [];
  });
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(() => {
    if (propDeals && propDeals.length > 0) return sortNewestFirst(propDeals);
    try {
      const raw = localStorage.getItem('sirikfit_special_deals');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return sortNewestFirst(parsed);
      }
    } catch (_e) {}
    return [];
  });
  const [popularSamplesOrder, setPopularSamplesOrder] = useState<string[]>([]);
  const [isSavingPopular, setIsSavingPopular] = useState<boolean>(false);

  // Firestore listeners for inventory & deals if not passed as props
  useEffect(() => {
    if (propInventory && propInventory.length > 0) {
      setInventoryList(sortNewestFirst(propInventory));
      return;
    }
    const unsubInv = onSnapshot(collection(db, 'iran_warehouse'), (snap) => {
      const items: LocalInventoryItem[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as LocalInventoryItem));
      const sorted = sortNewestFirst(items);
      setInventoryList(sorted);
      try { localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(sorted)); } catch (_e) {}
    }, (err) => console.warn('Could not listen to iran_warehouse:', err));

    return () => unsubInv();
  }, [propInventory]);

  useEffect(() => {
    if (propDeals && propDeals.length > 0) {
      setDealsList(sortNewestFirst(propDeals));
      return;
    }
    const unsubDeals = onSnapshot(collection(db, 'special_deals'), (snap) => {
      const items: FeaturedDeal[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as FeaturedDeal));
      const sorted = sortNewestFirst(items);
      setDealsList(sorted);
      try { localStorage.setItem('sirikfit_special_deals', JSON.stringify(sorted)); } catch (_e) {}
    }, (err) => console.warn('Could not listen to special_deals:', err));

    return () => unsubDeals();
  }, [propDeals]);

  // Load CMS popular samples order
  useEffect(() => {
    getDoc(doc(db, 'settings', 'cms')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.popularSamplesOrder)) {
          setPopularSamplesOrder(data.popularSamplesOrder);
        }
      }
    }).catch((e) => console.warn('Could not load popularSamplesOrder:', e));
  }, []);

  const [pricingRules, setPricingRules] = useState<PricingRulesConfig | null>(null);
  const [liveAedRate, setLiveAedRate] = useState<number>(54500);

  // Live real-time listener for pricing_rules and exchange rate
  useEffect(() => {
    const unsubRules = onSnapshot(doc(db, 'settings', 'pricing_rules'), (snap) => {
      if (snap.exists()) {
        const rawData = snap.data();
        setPricingRules(rawData as PricingRulesConfig);
        const r = Number(rawData?.aedRate || rawData?.manualAedRate);
        if (r && r > 0) {
          setLiveAedRate(r);
        }
      }
    }, (err) => console.warn('Could not listen to pricing_rules:', err));

    const unsubGeneral = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        const genData = snap.data();
        const r = Number(genData?.manualAedRate || genData?.aedRate);
        if (r && r > 0) setLiveAedRate(r);
      }
    }, (err) => console.warn('Could not listen to settings/general:', err));

    return () => {
      unsubRules();
      unsubGeneral();
    };
  }, []);

  const [mainUrl, setMainUrl] = useState<string>(initialProduct?.sourceUrl || initialProduct?.url || '');
  const [auxUrl, setAuxUrl] = useState<string>('');
  const [isScrapingMain, setIsScrapingMain] = useState<boolean>(false);
  const [isScrapingAux, setIsScrapingAux] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [product, setProduct] = useState<NormalizedProduct>(() => {
    const rawInitImg = initialProduct?.image || initialProduct?.imageUrl || '';
    const normInitImg = normalizeProductImageUrl(rawInitImg, initialProduct?.sourceUrl || initialProduct?.url || 'https://drnutrition.com');
    const normImages = (initialProduct?.images || []).map((img: string) => normalizeProductImageUrl(img, initialProduct?.sourceUrl || initialProduct?.url || 'https://drnutrition.com')).filter(Boolean);
    const normGallery = (initialProduct?.galleryImages || []).map((img: string) => normalizeProductImageUrl(img, initialProduct?.sourceUrl || initialProduct?.url || 'https://drnutrition.com')).filter(Boolean);

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
      image: normInitImg,
      imageUrl: normInitImg,
      images: normImages.length > 0 ? normImages : (normInitImg ? [normInitImg] : []),
      galleryImages: normGallery.length > 0 ? normGallery : (normInitImg ? [normInitImg] : []),
      weightKg: initialProduct?.weightKg || 0.8,
      sizes: initialProduct?.sizes || [],
      flavors: initialProduct?.flavors || [],
      variants: initialProduct?.variants || []
    };
  });

  useEffect(() => {
    if (initialProduct && (initialProduct.id || initialProduct.title)) {
      const rawInitImg = initialProduct.image || initialProduct.imageUrl || '';
      const sourceUrl = initialProduct.sourceUrl || initialProduct.url || 'https://drnutrition.com';
      const normInitImg = normalizeProductImageUrl(rawInitImg, sourceUrl);
      const normImages = (initialProduct.images || []).map((img: string) => normalizeProductImageUrl(img, sourceUrl)).filter(Boolean);
      const normGallery = (initialProduct.galleryImages || []).map((img: string) => normalizeProductImageUrl(img, sourceUrl)).filter(Boolean);

      setMainUrl(initialProduct.sourceUrl || initialProduct.url || '');
      setProduct({
        id: initialProduct.id,
        title: initialProduct.title || '',
        titleFa: initialProduct.titleFa || '',
        titleEn: initialProduct.titleEn || '',
        brand: initialProduct.brand || '',
        storeName: initialProduct.storeName || '',
        sourceUrl: initialProduct.sourceUrl || initialProduct.url || '',
        price: initialProduct.price || 0,
        priceAed: initialProduct.priceAed || initialProduct.price || 0,
        priceToman: initialProduct.priceToman || 0,
        originalPriceAed: initialProduct.originalPriceAed,
        currency: initialProduct.currency || 'AED',
        image: normInitImg,
        imageUrl: normInitImg,
        images: normImages.length > 0 ? normImages : (normInitImg ? [normInitImg] : []),
        galleryImages: normGallery.length > 0 ? normGallery : (normInitImg ? [normInitImg] : []),
        weightKg: initialProduct.weightKg || 0.8,
        sizes: initialProduct.sizes || [],
        flavors: initialProduct.flavors || [],
        variants: (initialProduct.variants || []).map(v => ({
          ...v,
          image: v.image ? normalizeProductImageUrl(v.image, sourceUrl) : normInitImg,
          imageUrl: v.imageUrl ? normalizeProductImageUrl(v.imageUrl, sourceUrl) : (v.image ? normalizeProductImageUrl(v.image, sourceUrl) : normInitImg)
        }))
      });
    }
  }, [initialProduct?.id]);

  // 1. Scrape Primary URL / Extract Draft (Uses the EXACT SAME engine as Homepage)
  const handleExtractDraft = async (urlToExtract?: string) => {
    const rawTarget = urlToExtract || mainUrl;
    const targetUrl = extractCleanUrl(rawTarget);
    if (!targetUrl || !targetUrl.trim()) {
      if (showToast) showToast('لطفاً لینک اصلی محصول را وارد کنید', 'error');
      return;
    }
    setMainUrl(targetUrl);
    setIsScrapingMain(true);
    try {
      console.log('[Scraper Engine] Initiating extraction from caller: ProductManagementAdmin', { targetUrl });
      const data = await universalScraperService.extract(targetUrl);

      if (data && (data.title || data.priceAed || data.price || data.priceAED)) {
        const attr = extractAttributesFromText(data.titleEn || data.title || '', targetUrl);
        const pAed = parseFloat(String(data.priceAed || data.priceAED || data.price || 0));
        const origAed = parseFloat(String(data.originalPriceAed || data.originalPriceAED || 0)) || undefined;
        const sz = attr.size || (data.sizes && data.sizes[0]) || '';
        const flv = attr.flavor || (data.flavors && data.flavors[0]) || '';

        const originInfo = detectStoreOrigin(targetUrl);
        const isIherbLink = targetUrl.toLowerCase().includes('iherb.com') || targetUrl.toLowerCase().includes('ae.iherb.com');
        const isDrNutritionLink = targetUrl.toLowerCase().includes('drnutrition.com');
        const resolvedStore = isIherbLink ? 'iHerb' : (isDrNutritionLink ? 'Dr. Nutrition' : (data.storeName || originInfo?.storeName || 'Dr. Nutrition'));

        const titleEn = data.titleEn || data.title || '';
        const titleFa = data.titleFa || data.title || generateBilingualProductTitle(titleEn, resolvedStore, data.brand);

        // Auto-calculate base Toman price using live Dirham exchange rate from settings/pricing_rules
        const effectiveWeight = data.weightKg || attr.weightKg || 0.8;
        const landedCalc = calculateLandedPrice({
          priceAed: pAed,
          weightKg: effectiveWeight,
          pricingRules: pricingRules,
          aedRate: liveAedRate
        });
        const calculatedTomanPrice = landedCalc.finalToman;

        const storeDomain = data.storeDomain || (isDrNutritionLink ? 'https://drnutrition.com' : targetUrl);
        const rawImg = data.image || data.imageUrl || data.mainImage || (data.images && data.images[0]) || (data.galleryImages && data.galleryImages[0]) || '';
        const mainImg = normalizeProductImageUrl(rawImg, storeDomain);
        const rawList = (data.images && data.images.length > 0) ? data.images : (data.galleryImages || (mainImg ? [mainImg] : []));
        const galleryList = deduplicateImageUrls([mainImg, ...rawList.map((g: string) => normalizeProductImageUrl(g, storeDomain))], mainImg);
        const effectiveMainImg = mainImg || (galleryList.length > 0 ? galleryList[0] : '');

        const firstVariant: ProductVariant = {
          id: `var-main-${Date.now()}`,
          size: sz || undefined,
          flavor: flv || undefined,
          price: pAed,
          priceAed: pAed,
          priceToman: calculatedTomanPrice,
          originalPrice: origAed,
          originalPriceAed: origAed,
          inStock: data.inStock !== false,
          image: effectiveMainImg,
          imageUrl: effectiveMainImg
        };

        const existingVariants: ProductVariant[] = (data.variants && Array.isArray(data.variants) && data.variants.length > 0)
          ? data.variants.map((v: any, vIdx: number) => {
              const vPriceAed = parseFloat(String(v.priceAed || v.priceAED || v.price || pAed));
              const vLanded = calculateLandedPrice({
                priceAed: vPriceAed,
                weightKg: v.weightKg || effectiveWeight,
                pricingRules: pricingRules,
                aedRate: liveAedRate
              });
              const rawVImg = v.imageUrl || v.image || v.imageThumbnail || effectiveMainImg;
              const normVImg = normalizeProductImageUrl(rawVImg, storeDomain) || effectiveMainImg;
              return {
                id: v.id || `var-${vIdx}-${Date.now()}`,
                size: v.size || sz || undefined,
                flavor: v.flavor || flv || undefined,
                price: vPriceAed,
                priceAed: vPriceAed,
                priceToman: vLanded.finalToman,
                originalPrice: v.originalPriceAed || v.originalPriceAED || origAed,
                originalPriceAed: v.originalPriceAed || v.originalPriceAED || origAed,
                inStock: v.inStock !== false,
                image: normVImg,
                imageUrl: normVImg
              };
            })
          : [firstVariant];

        const updatedSizes = Array.from(new Set([...(data.sizes || []), sz].filter(Boolean)));
        const updatedFlavors = Array.from(new Set([...(data.flavors || []), flv].filter(Boolean)));

        setProduct(prev => ({
          ...prev,
          title: titleFa || titleEn || prev.title,
          titleFa: titleFa || prev.titleFa,
          titleEn: titleEn || prev.titleEn,
          brand: data.brand || prev.brand || 'Dr. Nutrition',
          storeName: resolvedStore || prev.storeName || 'Dr. Nutrition',
          sourceUrl: targetUrl,
          url: targetUrl,
          price: pAed || prev.price,
          priceAed: pAed || prev.priceAed,
          priceToman: calculatedTomanPrice || prev.priceToman,
          originalPriceAed: origAed,
          image: effectiveMainImg || prev.image,
          imageUrl: effectiveMainImg || (prev as any).imageUrl || prev.image,
          images: galleryList.length > 0 ? galleryList : (effectiveMainImg ? [effectiveMainImg] : prev.images),
          galleryImages: galleryList.length > 0 ? galleryList : (effectiveMainImg ? [effectiveMainImg] : prev.galleryImages),
          weightKg: effectiveWeight || prev.weightKg,
          sizes: updatedSizes,
          flavors: updatedFlavors,
          variants: existingVariants
        }));

        if (showToast) showToast(`اطلاعات محصول از ${resolvedStore} با موفقیت استخراج و نرخ تومان محاسبه شد`, 'success');
      } else {
        if (showToast) showToast('عدم توانایی در استخراج اطلاعات از لینک', 'error');
      }
    } catch (err: any) {
      if (showToast) showToast('خطا در ارتباط با اسکرپر: ' + err.message, 'error');
    } finally {
      setIsScrapingMain(false);
    }
  };

  const handleScrapeMain = () => handleExtractDraft();

  // 2. Scrape Auxiliary Variant URL (Uses the EXACT SAME engine as Homepage)
  const handleScrapeAuxiliary = async () => {
    const cleanAux = extractCleanUrl(auxUrl);
    if (!cleanAux) {
      if (showToast) showToast('لطفاً لینک کمکی طعم یا وزن را وارد کنید', 'error');
      return;
    }
    setIsScrapingAux(true);
    try {
      console.log('[Scraper Engine] Initiating auxiliary extraction: ProductManagementAdmin', { cleanAux });
      const data = await universalScraperService.extract(cleanAux);

      if (data && (data.title || data.priceAed || data.price || data.priceAED)) {
        const attr = extractAttributesFromText(data.titleEn || data.title || '', cleanAux);
        const pAed = parseFloat(String(data.priceAed || data.priceAED || data.price || product.priceAed || product.price || 0));
        const origAed = parseFloat(String(data.originalPriceAed || data.originalPriceAED || 0)) || undefined;
        const sz = (data.sizes && data.sizes[0]) || attr.size || '';
        const flv = (data.flavors && data.flavors[0]) || attr.flavor || '';
        const storeDomain = data.storeDomain || (cleanAux.includes('drnutrition.com') ? 'https://drnutrition.com' : cleanAux);
        const rawImg = data.imageUrl || data.image || data.mainImage || (data.images && data.images[0]) || (data.galleryImages && data.galleryImages[0]) || product.image || '';
        const img = normalizeProductImageUrl(rawImg, storeDomain) || product.image || '';

        const vLanded = calculateLandedPrice({
          priceAed: pAed,
          weightKg: data.weightKg || product.weightKg || 0.8,
          pricingRules: pricingRules,
          aedRate: liveAedRate
        });

        const newVariant: ProductVariant = {
          id: `var-aux-${Date.now()}`,
          size: sz || undefined,
          flavor: flv || undefined,
          price: pAed,
          priceAed: pAed,
          priceToman: vLanded.finalToman,
          originalPrice: origAed,
          originalPriceAed: origAed,
          inStock: data.inStock !== false,
          image: img,
          imageUrl: img,
          url: cleanAux
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
    const defaultPrice = product.priceAed || product.price || 0;
    const vLanded = calculateLandedPrice({
      priceAed: defaultPrice,
      weightKg: product.weightKg || 0.8,
      pricingRules: pricingRules,
      aedRate: liveAedRate
    });
    const newV: ProductVariant = {
      id: `var-manual-${Date.now()}`,
      size: product.sizes?.[0] || '1 کیلوگرم',
      flavor: product.flavors?.[0] || 'طعم انتخابی',
      price: defaultPrice,
      priceAed: defaultPrice,
      priceToman: vLanded.finalToman,
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
      const sourceUrl = product.sourceUrl || product.url || 'https://drnutrition.com';
      const normMainImg = normalizeProductImageUrl(product.image || (product as any).imageUrl || '', sourceUrl);

      // Sanitize variant rows: ignore placeholder labels, ensure string/number types
      const sanitizedVariants = (product.variants || [])
        .filter((r: any) => r && ((r.size && String(r.size).trim()) || (r.flavor && String(r.flavor).trim())))
        .map((r: any) => {
          const rawImg = (r.image && String(r.image).trim() !== '')
            ? String(r.image).trim()
            : ((r.imageUrl && String(r.imageUrl).trim() !== '') ? String(r.imageUrl).trim() : '');
          const img = rawImg ? (normalizeProductImageUrl(rawImg, sourceUrl) || rawImg) : (normMainImg || null);
          return {
            id: r.id || `var-${Math.random().toString(36).substring(2, 9)}`,
            flavor: (r.flavor && !r.flavor.includes('+ طعم سفارشی') && r.flavor !== '__custom__') ? String(r.flavor).trim() : 'پیش‌فرض',
            size: (r.size && !r.size.includes('+ تایپ سایز') && r.size !== '__custom__') ? String(r.size).trim() : 'استاندارد',
            priceAed: Number(r.priceAed ?? r.price ?? 0),
            priceToman: Number(r.priceToman || 0),
            image: img,
            imageUrl: img,
            inStock: r.inStock ?? true
          };
        });

      const isNew = !product.id || product.id.startsWith('draft_') || product.id.startsWith('prod_') || product.id.startsWith('scraped-') || product.id.startsWith('temp_');
      const uniqueId = isNew ? doc(collection(db, 'products')).id : product.id;

      const sanitizedProduct = {
        ...product,
        id: uniqueId,
        image: normMainImg || product.image,
        imageUrl: normMainImg || product.image,
        priceToman: Number(product.priceToman) || 0,
        priceAed: Number(product.priceAed) || 0,
        isPublished: product.isPublished !== false,
        isPopular: Boolean(product.isPopular),
        popularOrder: product.isPopular ? (typeof product.popularOrder === 'number' ? product.popularOrder : 0) : 9999,
        variants: sanitizedVariants,
        flavors: Array.from(new Set(sanitizedVariants.map(v => v.flavor))),
        sizes: Array.from(new Set(sanitizedVariants.map(v => v.size))),
        createdAt: isNew ? (product.createdAt || new Date().toISOString()) : (product.createdAt || new Date().toISOString()),
        updatedAt: new Date().toISOString()
      };

      if (onSaveProduct) {
        await onSaveProduct(sanitizedProduct);
      } else {
        await saveSingleProductWithVariants(sanitizedProduct, 'products');
      }
      setProduct(sanitizedProduct);
      if (showToast) showToast('محصول و تمامی واریانت‌ها با موفقیت ذخیره شدند', 'success');
    } catch (err: any) {
      console.error('Save product failed:', err);
      if (showToast) showToast('خطا در ذخیره‌سازی اطلاعات: ' + (err?.message || 'خطای سرور'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePopular = async (productId?: string) => {
    const idToUpdate = productId || product.id;
    const nextPop = !Boolean(product.isPopular);
    const nextOrder = nextPop ? 0 : 9999;
    setProduct((prev) => ({
      ...prev,
      isPopular: nextPop,
      isFeatured: nextPop,
      popularOrder: nextOrder
    }));

    if (idToUpdate) {
      try {
        if (nextPop) {
          await addPopularProductToBeginning(idToUpdate, 'products');
          if (showToast) showToast('محصول به عنوان اولین محصول پرطرفدار افزوده شد', 'success');
        } else {
          await removePopularProduct(idToUpdate, 'products');
          if (showToast) showToast('محصول از لیست پرطرفدارها حذف شد', 'success');
        }
      } catch (err) {
        console.warn('handleTogglePopular error:', err);
      }
    }
  };

  const handleTogglePublished = (productId?: string) => {
    const currentPub = product.isPublished !== undefined ? product.isPublished : product.isActive;
    const nextPub = !currentPub;
    setProduct((prev) => ({ ...prev, isPublished: nextPub, isActive: nextPub }));
    const idToUpdate = productId || product.id;
    if (idToUpdate) {
      try {
        updateDoc(doc(db, 'products', idToUpdate), {
          isPublished: nextPub,
          isActive: nextPub,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      } catch (_e) {}
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

  const toggleAllowedFlavor = (flavorLabel: string) => {
    setProduct(prev => {
      const current = prev.flavors || [];
      const updated = current.includes(flavorLabel)
        ? current.filter(f => f !== flavorLabel)
        : [...current, flavorLabel];
      return { ...prev, flavors: updated };
    });
  };

  const [newCustomFlavorInput, setNewCustomFlavorInput] = useState('');
  const handleAddCustomFlavorChip = () => {
    if (!newCustomFlavorInput.trim()) return;
    setProduct(prev => {
      const current = prev.flavors || [];
      if (!current.includes(newCustomFlavorInput.trim())) {
        return { ...prev, flavors: [...current, newCustomFlavorInput.trim()] };
      }
      return prev;
    });
    setNewCustomFlavorInput('');
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
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveAdminSubTab('inventory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'inventory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>انبار ایران</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeAdminSubTab === 'inventory' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}>
              {toPersianDigits(inventoryList.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('deals')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'deals'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>پیشنهادهای ویژه</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeAdminSubTab === 'deals' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}>
              {toPersianDigits(dealsList.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('popularSamples')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'popularSamples'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-500" />
            <span>ترتیب پرطرفدارها</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              activeAdminSubTab === 'popularSamples' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {toPersianDigits(dealsList.length + inventoryList.length)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('categories')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'categories'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>دسته‌بندی محصولات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('discounts')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'discounts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Tag className="w-4 h-4 text-emerald-500" />
            <span>کدهای تخفیف</span>
          </button>

          {/* DEDICATED 6TH TAB: 🔗 پایش و مدیریت لینک‌ها */}
          <button
            type="button"
            onClick={() => setActiveAdminSubTab('links')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer relative ${
              activeAdminSubTab === 'links'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Activity className="w-4 h-4 text-red-500" />
            <span>🔗 پایش و مدیریت لینک‌ها</span>
            {linksAlertCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                {toPersianDigits(linksAlertCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveAdminSubTab('editor')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSubTab === 'editor'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-blue-500" />
            <span>استخراج تکی با لینک</span>
          </button>
        </div>
      </div>

      {/* 1. INVENTORY TAB */}
      {activeAdminSubTab === 'inventory' && (
        <IranWarehouseAdmin
          items={inventoryList}
          onSaveItems={async (updated) => {
            setInventoryList(updated);
            await saveIranWarehouseItems(updated);
            if (showToast) showToast('انبار ایران با موفقیت ذخیره شد', 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* 2. DEALS TAB */}
      {activeAdminSubTab === 'deals' && (
        <DealsAdmin
          deals={dealsList}
          onSaveDeals={async (updated) => {
            setDealsList(updated);
            await saveSpecialDeals(updated);
            if (showToast) showToast('پیشنهادهای ویژه با موفقیت ذخیره شد', 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* 3. POPULAR SAMPLES TAB */}
      {activeAdminSubTab === 'popularSamples' && (
        <PopularOrderAdmin
          products={[
            ...dealsList.map(d => ({ ...d, targetSection: 'special_deals' })),
            ...inventoryList.map(i => ({ ...i, targetSection: 'iran_warehouse' }))
          ] as any}
          onOrderSaved={async (updated) => {
            const updatedMap = new Map(updated.map(p => [p.id, p]));
            const newDeals = dealsList.map(d => updatedMap.has(d.id) ? { ...d, ...updatedMap.get(d.id) } : d);
            const newInv = inventoryList.map(i => updatedMap.has(i.id) ? { ...i, ...updatedMap.get(i.id) } : i);
            setDealsList(newDeals);
            setInventoryList(newInv);
            try {
              await Promise.all([
                saveSpecialDeals(newDeals),
                saveIranWarehouseItems(newInv)
              ]);
            } catch (_err) {}
          }}
          showToast={showToast}
        />
      )}

      {/* 4. CATEGORIES TAB */}
      {activeAdminSubTab === 'categories' && (
        <AdminTaxonomyManager showToast={showToast} />
      )}

      {/* 5. DISCOUNTS TAB */}
      {activeAdminSubTab === 'discounts' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <AdminDiscounts showToast={showToast} />
        </div>
      )}

      {/* 6. DEDICATED LINK MANAGEMENT TAB */}
      {activeAdminSubTab === 'links' && (
        <LinkManagementTab showToast={showToast} onAlertCountChange={setLinksAlertCount} />
      )}

      {/* PRODUCT EDITOR TAB */}
      {activeAdminSubTab === 'editor' && (
        <div className="space-y-6">
          {/* Cold-Start Direct Extraction Draft Form */}
          <ProductForm
            activeTab="deals"
            aedRate={liveAedRate}
            showToast={showToast}
            onSave={async (draft) => {
              const nowIso = new Date().toISOString();
              const itemDraft = {
                ...draft,
                createdAt: (draft as any).createdAt || nowIso,
                sectionAddedAt: nowIso,
                updatedAt: nowIso
              };
              if (draft.targetSection === 'iran_warehouse') {
                const updated = [itemDraft as any, ...inventoryList.filter(p => p.id !== draft.id)];
                setInventoryList(updated);
                await saveIranWarehouseItems(updated);
              } else {
                const updated = [itemDraft as any, ...dealsList.filter(p => p.id !== draft.id)];
                setDealsList(updated);
                await saveSpecialDeals(updated);
              }
              if (showToast) showToast('محصول با موفقیت استخراج و در ابتدای لیست ثبت شد', 'success');
            }}
          />

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
            onChange={(e) => {
              const val = e.target.value;
              setMainUrl(val);
              const origin = detectStoreOrigin(val);
              if (origin?.storeName && (!product.storeName || product.storeName === 'فروشگاه معتبر دبی')) {
                setProduct(prev => ({ ...prev, storeName: origin.storeName }));
              }
            }}
            placeholder="https://ae.iherb.com/... یا https://www.drnutrition.com/en-ae/... یا https://www.sporter.com/en-ae/..."
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
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-3">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {(product.image || product.imageUrl || (product.galleryImages && product.galleryImages[0]) || (product.images && product.images[0])) ? (
                  <img
                    src={product.image || product.imageUrl || (product.galleryImages && product.galleryImages[0]) || (product.images && product.images[0])}
                    alt={product.titleEn || product.titleFa || product.title}
                    className="w-full h-full object-contain p-0.5"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[9px] text-slate-400">
                    بدون تصویر
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-xs font-black text-slate-900 block truncate">{product.title}</span>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-bold">
                  <span>برند: {product.brand || '—'}</span>
                  <span className="text-emerald-600 font-bold">قیمت پایه: {product.priceAed} AED</span>
                </div>
              </div>
            </div>

            {/* Store Selector & Badge Matrix Preview */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-600">فروشگاه:</span>
              <select
                value={product.storeName || 'iHerb'}
                onChange={(e) => setProduct(prev => ({ ...prev, storeName: e.target.value }))}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-black cursor-pointer"
              >
                {STORE_LIST.map(st => (
                  <option key={st.id} value={st.name}>
                    {st.name} {st.nameFa ? `(${st.nameFa})` : ''}
                  </option>
                ))}
              </select>
              {(() => {
                const cfg = getStoreConfig(product.storeName);
                return (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.pulseColor} animate-pulse`} />
                    {cfg.name}
                  </span>
                );
              })()}
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

      {/* Section 3: Allowed Flavors Pool & Active Chips */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <details className="group" open>
          <summary className="cursor-pointer text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5 flex items-center gap-2 list-none select-none hover:bg-amber-100 transition">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>چیپ‌های طعم‌های مجاز محصول ({toPersianDigits((product.flavors || []).length)} طعم انتخاب شده)</span>
          </summary>
          <div className="mt-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <p className="text-[11px] text-amber-800 font-medium">
              طعم‌های استاندارد و کامپاند این محصول را انتخاب کنید یا طعم سفارشی خود را با جستجوی هوشمند اضافه نمایید:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_FLAVORS.map(flv => {
                const checked = (product.flavors || []).includes(flv.name);
                return (
                  <button
                    key={flv.id}
                    type="button"
                    onClick={() => toggleAllowedFlavor(flv.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 cursor-pointer transition ${
                      checked
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5" />}
                    <span>{flv.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-amber-200/60">
              <FlavorAutocompleteInput
                value={newCustomFlavorInput}
                onChange={setNewCustomFlavorInput}
                onSelect={(selectedName) => {
                  setProduct(prev => {
                    const current = prev.flavors || [];
                    if (!current.includes(selectedName)) {
                      return { ...prev, flavors: [...current, selectedName] };
                    }
                    return prev;
                  });
                  setNewCustomFlavorInput('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddCustomFlavorChip();
                  }
                }}
                placeholder="تایپ طعم سفارشی (فارسی / انگلیسی)..."
                inputClassName="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomFlavorChip}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
              >
                + افزودن چیپ طعم
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* Section 4: Allowed Sizes Pool & Active Chips */}
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
                placeholder="تایپ سایز سفارشی (مثال: 5 lb (2.27 kg), 60 Servings, 2.45 kg)..."
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

        {/* Single Unified Status Control Toolbar */}
        <div className="flex items-center gap-2 py-2 w-full">
          {/* 1. Publication State Toggle (isPublished) */}
          <button
            type="button"
            onClick={() => handleTogglePublished(product.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              product.isPublished !== false
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            <span>{product.isPublished !== false ? '✓ منتشر شده در سایت (عمومی)' : '⊘ پیشنویس (مخفی از سایت)'}</span>
          </button>

          {/* 2. Homepage Featured Toggle (isPopular) */}
          <button
            type="button"
            onClick={() => handleTogglePopular(product.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              Boolean(product.isPopular)
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700'
            }`}
          >
            <span>{Boolean(product.isPopular) ? '★ پرطرفدار (نمایش در خانه)' : '☆ پرطرفدار (غیرفعال)'}</span>
          </button>
        </div>

        {/* Dynamic Interactive Variant Matrix Table with Instant Dropdowns */}
        <VariantMatrixTable
          variants={product.variants || []}
          availableSizes={product.sizes || []}
          availableFlavors={product.flavors || []}
          mainProductImage={product.image || product.imageUrl || (product.galleryImages && product.galleryImages[0]) || ''}
          aedRate={liveAedRate}
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
