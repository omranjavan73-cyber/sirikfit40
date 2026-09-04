import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Edit3,
  Star,
  Eye,
  EyeOff
} from 'lucide-react';
import type { NormalizedProduct, ProductVariant, LocalInventoryItem, FeaturedDeal, PricingRulesConfig } from '../../types';
import type { Product } from '../../types/product';
import { extractAttributesFromText } from '../../utils/attributeParser';
import { toPersianDigits, formatToman, parseAndConvertSize, normalizeProductImageUrl, extractCleanUrl, deduplicateImageUrls, isArtificialFallback } from '../../utils/formatters';
import { sanitizeProductTitle } from '../../utils/textSanitizer';
import { calculateLandedPrice } from '../../utils/pricingCalculator';
import { generateBilingualProductTitle, cleanProductTitle } from '../../utils/parseLink';
import { extractProductShared } from '../../services/sharedExtractor';
import { getEffectiveGeminiKeysList } from '../../utils/geminiKey';
import { saveSingleProductWithVariants, saveIranWarehouseItems, saveSpecialDeals } from '../../services/adminService';
import { sanitizePayloadForFirestore } from '../../utils/adminSaveHelper';
import { VariantMatrixTable, STANDARD_SIZES_PRESET } from '../../components/admin/VariantMatrixTable';
import { PRESET_FLAVORS } from '../../utils/variantPresets';
import { FlavorAutocompleteInput } from '../../components/admin/FlavorAutocompleteInput';
import { AdminDiscounts } from '../../components/AdminDiscounts';
import { LinkManagementTab } from '../../components/admin/LinkManagementTab';
import { IranWarehouseAdmin } from './IranWarehouseAdmin';
import { DealsAdmin } from './DealsAdmin';
import { PopularOrderAdmin } from './PopularOrderAdmin';
import { AdminTaxonomyManager } from '../../components/AdminTaxonomyManager';
import { TaxonomyCategory, DEFAULT_TAXONOMY } from '../../utils/taxonomyHelper';
import { STORE_LIST, getStoreConfig } from '../../constants/stores';
import { detectStoreOrigin } from '../../services/scraperService';
import { ProductForm } from '../../components/admin/ProductForm';
import { collection, onSnapshot, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase';
import { storage } from '../../config/firebase';

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
  settings?: any;
  cms?: any;
}

export const isCorruptedProduct = (p: any): boolean => {
  if (!p || !p.id) return true;
  const tFa = (p.titleFa || p.title || '').trim();
  const tEn = (p.titleEn || '').trim();
  const name = (p.name || '').trim();
  const fullTitle = tFa || tEn || name;

  if (!fullTitle || fullTitle === 'بدون عنوان' || fullTitle === 'محصول بدون عنوان') {
    return true;
  }
  return false;
};

export const ProductManagementAdmin: React.FC<ProductManagementAdminProps> = ({
  initialProduct,
  onSaveProduct,
  showToast,
  inventory: propInventory,
  deals: propDeals,
  settings,
  cms
}) => {
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<
    'inventory' | 'deals' | 'popularSamples' | 'categories' | 'discounts' | 'links' | 'editor'
  >('links');
  const [activeTab, setActiveTab] = useState<'deals' | 'iran_warehouse'>('deals');
  const [draftProduct, setDraftProduct] = useState<Product | null>(null);
  const draftProductRef = useRef<Product | null>(draftProduct);
  useEffect(() => {
    draftProductRef.current = draftProduct;
  }, [draftProduct]);
  const [isExtractingDraft, setIsExtractingDraft] = useState<boolean>(false);
  const [linksAlertCount, setLinksAlertCount] = useState<number>(0);

  useEffect(() => {
    if (activeAdminSubTab === 'deals') setActiveTab('deals');
    else if (activeAdminSubTab === 'inventory') setActiveTab('iran_warehouse');
  }, [activeAdminSubTab]);
  const [inventoryList, setInventoryList] = useState<LocalInventoryItem[]>(() => {
    if (Array.isArray(propInventory)) return sortNewestFirst(propInventory.filter(p => !isCorruptedProduct(p)));
    return [];
  });
  const [dealsList, setDealsList] = useState<FeaturedDeal[]>(() => {
    if (Array.isArray(propDeals)) return sortNewestFirst(propDeals.filter(p => !isCorruptedProduct(p)));
    return [];
  });
  const [popularSamplesOrder, setPopularSamplesOrder] = useState<string[]>([]);
  const [isSavingPopular, setIsSavingPopular] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);

  // ── Unified Reactive Products State & Dynamic Tab Counters (Prevents ghost counts) ──
  const products = useMemo<Product[]>(() => {
    const inv: Product[] = inventoryList.map(item => ({
      ...(item as any),
      targetSection: 'iran_warehouse',
      isActive: (item as any).isActive !== false
    }));
    const deals: Product[] = dealsList.map(item => ({
      ...(item as any),
      targetSection: 'deals',
      isActive: (item as any).isActive !== false
    }));
    const validProducts = [...inv, ...deals].filter(
      (p) => p.id && (p.titleFa?.trim() || p.titleEn?.trim() || p.title?.trim()) && p.titleFa !== 'محصول بدون عنوان' && p.title !== 'محصول بدون عنوان' && !isCorruptedProduct(p)
    );
    return validProducts.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt || a.sectionAddedAt || a.updatedAt || 0).getTime();
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt || b.sectionAddedAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [inventoryList, dealsList]);

  const iranWarehouseCount = useMemo(
    () => products.filter((p) => p.targetSection === 'iran_warehouse' && p.isActive !== false).length,
    [products]
  );
  const dealsCount = useMemo(
    () => products.filter((p) => p.targetSection === 'deals' && p.isActive !== false).length,
    [products]
  );
  const totalActiveProductsCount = useMemo(
    () => products.filter((p) => p.isActive !== false).length,
    [products]
  );
  const cleanList = useMemo<Product[]>(() => {
    return products.filter((p) => p.id && (p.titleFa?.trim() || p.titleEn?.trim()) && p.titleFa !== 'بدون عنوان' && p.titleFa !== 'محصول بدون عنوان');
  }, [products]);

  // ── Direct Image URL Input Handler ──
  const handleDirectImageUrlChange = (newUrl: string) => {
    const trimmed = newUrl.trim();
    if (draftProduct) {
      setDraftProduct(prev => prev ? {
        ...prev,
        imageUrl: trimmed,
        image: trimmed,
        images: trimmed ? [trimmed, ...(prev.images || []).filter(img => img !== trimmed)] : []
      } : null);
    }
    setProduct(prev => ({
      ...prev,
      imageUrl: trimmed,
      image: trimmed,
      images: trimmed ? [trimmed, ...(prev.images || []).filter(img => img !== trimmed)] : []
    }));
  };

  // ── Device Upload Handler (handleManualImageFileUpload) ──
  const handleManualImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Immediately set a local preview via URL.createObjectURL(file)
    const localPreviewUrl = URL.createObjectURL(file);
    if (draftProduct) {
      setDraftProduct(prev => prev ? {
        ...prev,
        imageUrl: localPreviewUrl,
        image: localPreviewUrl,
        images: [localPreviewUrl, ...(prev.images || []).filter(img => img !== localPreviewUrl)]
      } : null);
    }
    setProduct(prev => ({
      ...prev,
      imageUrl: localPreviewUrl,
      image: localPreviewUrl,
      images: [localPreviewUrl, ...(prev.images || []).filter(img => img !== localPreviewUrl)]
    }));

    // 2. Upload file binary to Firebase Storage under products/images/${Date.now()}_${file.name}
    setIsUploadingImage(true);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `products/images/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type || 'image/jpeg'
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);

      if (draftProduct) {
        setDraftProduct(prev => prev ? {
          ...prev,
          imageUrl: downloadUrl,
          image: downloadUrl,
          images: [downloadUrl, ...(prev.images || []).filter(img => img !== localPreviewUrl && img !== downloadUrl)]
        } : null);
      }
      setProduct(prev => ({
        ...prev,
        imageUrl: downloadUrl,
        image: downloadUrl,
        images: [downloadUrl, ...(prev.images || []).filter(img => img !== localPreviewUrl && img !== downloadUrl)]
      }));
      if (showToast) showToast('تصویر محصول با موفقیت در فضای ابری ذخیره شد', 'success');
    } catch (uploadErr: any) {
      console.error('[Firebase Storage Upload Error]:', uploadErr);
      // Graceful FileReader / Base64 fallback if Storage is unavailable or offline
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          if (draftProduct) {
            setDraftProduct(prev => prev ? {
              ...prev,
              imageUrl: base64data,
              image: base64data,
              images: [base64data, ...(prev.images || []).filter(img => img !== localPreviewUrl && img !== base64data)]
            } : null);
          }
          setProduct(prev => ({
            ...prev,
            imageUrl: base64data,
            image: base64data,
            images: [base64data, ...(prev.images || []).filter(img => img !== localPreviewUrl && img !== base64data)]
          }));
          if (showToast) showToast('تصویر به صورت محلی متصل شد', 'info');
        };
        reader.readAsDataURL(file);
      } catch (_fallbackErr) {
        if (showToast) showToast('خطا در بارگذاری تصویر: ' + (uploadErr?.message || 'نامشخص'), 'error');
      }
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Synchronized Real-Time Query Listeners for 'products' and section collections
  useEffect(() => {
    if (Array.isArray(propInventory)) {
      setInventoryList(sortNewestFirst(propInventory.filter(p => !isCorruptedProduct(p))));
    }
  }, [propInventory]);

  useEffect(() => {
    if (Array.isArray(propDeals)) {
      setDealsList(sortNewestFirst(propDeals.filter(p => !isCorruptedProduct(p))));
    }
  }, [propDeals]);

  useEffect(() => {
    if (!db) return;
    const target = activeTab === 'deals' ? 'deals' : 'iran_warehouse';

    // 1. Primary active query on centralized 'products' collection
    const qSection = query(
      collection(db, 'products'),
      where('targetSection', '==', target)
    );

    const unsubProducts = onSnapshot(qSection, (snap) => {
      const items: any[] = [];
      snap.forEach((d) => {
        const item = { id: d.id, ...d.data(), targetSection: target };
        if (item.id && !isCorruptedProduct(item)) {
          items.push(item);
        }
      });
      const sorted = sortNewestFirst(items);
      if (target === 'deals') {
        setDealsList(sorted);
        try { localStorage.setItem('sirikfit_special_deals', JSON.stringify(sorted)); } catch (_e) {}
      } else {
        setInventoryList(sorted);
        try { localStorage.setItem('sirikfit_iran_warehouse', JSON.stringify(sorted)); } catch (_e) {}
      }
    }, (err) => console.error(`[Live Sync Error] products [${target}]:`, err));

    return () => {
      unsubProducts();
    };
  }, [activeTab]);

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

  // ── Manual Product Draft Creation ──
  const handleCreateManualDraft = () => {
    const activeSection = activeTab === 'deals' ? 'deals' : 'iran_warehouse';
    const newDraft: Product = {
      id: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titleFa: '',
      titleEn: '',
      title: '',
      imageUrl: '',
      image: '',
      images: [],
      galleryImages: [],
      priceAed: 0,
      price: 0,
      priceToman: 0,
      manualPriceToman: null,
      isManualPrice: false,
      profitMargin: 20,
      shippingFeeAed: activeTab === 'iran_warehouse' ? 0 : 20,
      storeName: activeTab === 'iran_warehouse' ? 'انبار ایران (تحویل فوری)' : 'سیریک فیت',
      brand: activeTab === 'iran_warehouse' ? 'موجود در ایران' : 'سیریک فیت',
      targetSection: activeSection,
      category: DEFAULT_TAXONOMY[0]?.name || 'مکمل‌های ورزشی',
      subCategory: DEFAULT_TAXONOMY[0]?.subCategories?.[0]?.name || 'همه موارد',
      isActive: true,
      isPopular: false,
      variants: [],
      createdAt: new Date().toISOString()
    };
    setDraftProduct(newDraft);
    setProduct(newDraft as any);
    if (showToast) {
      showToast(`پیش‌نویس خام برای ${activeTab === 'deals' ? 'پیشنهادهای ویژه' : 'انبار ایران'} ایجاد شد`, 'info');
    }
  };

  // 1. Scrape Primary URL / Extract Draft (Strict clone of HeroCalculator pipeline)
  const handleExtractDraft = async (urlToExtract?: string) => {
    const rawTarget = urlToExtract || mainUrl;
    const targetUrl = extractCleanUrl(rawTarget);
    if (!targetUrl || !targetUrl.trim()) {
      if (showToast) showToast('لطفاً لینک اصلی محصول را وارد کنید', 'error');
      return;
    }
    setMainUrl(targetUrl);
    setIsScrapingMain(true);
    setIsExtractingDraft(true);
    try {
      console.log('[Scraper Engine] Initiating extraction from caller: ProductManagementAdmin', { targetUrl, activeTab });
      const extracted = await extractProductShared(targetUrl, cms, { bypassCache: true, forceFresh: true });

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
        setIsScrapingMain(false);
        setIsExtractingDraft(false);
        return;
      }

      const pAed = Number(extracted.priceAed || extracted.price);
      const origAed = extracted.originalPriceAed;

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

      const attr = extractAttributesFromText(extracted.title || '', targetUrl);
      const sz = extracted.sizes[0] || attr.size || '';
      const flv = extracted.flavors[0] || attr.flavor || '';

      const effectiveWeight = Number(extracted.weightKg) || attr.weightKg || 0.8;
      const landedCalc = calculateLandedPrice({
        priceAed: pAed,
        weightKg: effectiveWeight,
        pricingRules: pricingRules,
        aedRate: liveAedRate
      });
      const calculatedTomanPrice = landedCalc.finalToman;

      const targetSection = activeTab === 'deals' ? 'deals' : 'iran_warehouse';

      const firstVariant: ProductVariant = {
        id: `var-main-${Date.now()}`,
        size: sz || undefined,
        flavor: flv || undefined,
        price: pAed,
        priceAed: pAed,
        priceToman: calculatedTomanPrice,
        originalPrice: origAed,
        originalPriceAed: origAed,
        inStock: true,
        image: normMainImg,
        imageUrl: normMainImg
      };

      const populatedVariants: ProductVariant[] = extracted.variants.length > 0
        ? extracted.variants.map((v, idx) => {
            const vPrice = v.priceAed || pAed;
            const vLanded = calculateLandedPrice({
              priceAed: vPrice,
              weightKg: effectiveWeight,
              pricingRules: pricingRules,
              aedRate: liveAedRate
            });
            return {
              ...v,
              id: v.id || `var-${idx}-${Date.now()}`,
              priceToman: vLanded.finalToman,
              image: v.image ? (normalizeProductImageUrl(v.image, targetUrl) || v.image) : normMainImg,
              imageUrl: v.imageUrl ? (normalizeProductImageUrl(v.imageUrl, targetUrl) || v.imageUrl) : normMainImg
            };
          })
        : [firstVariant];

      const cleanTitleEn = sanitizeProductTitle(extracted.titleEn || extracted.title || '');
      const cleanTitleFa = sanitizeProductTitle(extracted.titleFa || extracted.title || '');
      const cleanTitle = cleanTitleFa || cleanTitleEn;

      const draft: Product = {
        id: extracted.id || `prod_${Date.now()}`,
        title: cleanTitle,
        titleFa: cleanTitleFa || cleanTitle,
        titleEn: cleanTitleEn,
        name: cleanTitle,
        priceAed: pAed,
        priceToman: calculatedTomanPrice,
        manualPriceToman: null,
        isManualPrice: false,
        originalPriceAed: origAed,
        discountPercent: extracted.discountPercent,
        image: normMainImg,
        imageUrl: normMainImg,
        images: extracted.images.length > 0 ? extracted.images : (normMainImg ? [normMainImg] : []),
        galleryImages: extracted.galleryImages.length > 0 ? extracted.galleryImages : (normMainImg ? [normMainImg] : []),
        storeName: extracted.storeName || 'Dr. Nutrition',
        brand: extracted.brand || 'Dr. Nutrition',
        category: extracted.category || 'مکمل‌های ورزشی',
        weightKg: effectiveWeight,
        description: extracted.description,
        sourceUrl: targetUrl,
        url: targetUrl,
        variants: populatedVariants,
        targetSection: targetSection,
        inStock: extracted.inStock !== false,
        isActive: false
      };

      setDraftProduct(draft);
      setProduct(draft as any);
      if (showToast) {
        showToast(`پیش‌نویس محصول استخراج شد (${pAed} درهم) - بخش: ${targetSection === 'deals' ? 'پیشنهادهای ویژه' : 'انبار ایران'}`, 'success');
      }
    } catch (err: any) {
      console.error('[handleExtractDraft Error]:', err);
      if (showToast) showToast(err?.message || 'خطا در استخراج اطلاعات از لینک', 'error');
    } finally {
      setIsScrapingMain(false);
      setIsExtractingDraft(false);
    }
  };

  const handleScrapeMain = () => handleExtractDraft();

  const handleCommitDraft = async (itemToCommit?: any) => {
    const item = itemToCommit || draftProduct || product;
    if (!item) return;

    const titleToCheck = sanitizeProductTitle(item.titleFa || item.title || item.titleEn || '').trim();
    const aedVal = Number(item.priceAed || item.price || 0);
    const manualToman = Number(item.manualPriceToman || (item.isManualPrice && item.priceToman));
    const finalToman = manualToman && manualToman > 0 ? manualToman : Number(item.priceToman || 0);

    // ANTI-CORRUPTION GUARD: Reject untitled or zero-price items from ever being committed
    if (!titleToCheck || titleToCheck === 'محصول بدون عنوان' || (aedVal <= 0 && finalToman <= 0)) {
      if (showToast) showToast('خطا: عنوان و قیمت محصول الزامی است (قیمت درهم یا تومان باید بیشتر از ۰ باشد).', 'error');
      return;
    }

    const targetSection: 'deals' | 'iran_warehouse' = (item.targetSection === 'iran_warehouse' || activeTab === 'iran_warehouse')
      ? 'iran_warehouse'
      : 'deals';
    const nowIso = new Date().toISOString();
    const sourceUrl = item.sourceUrl || item.url || (targetSection === 'iran_warehouse' ? 'https://sirikfit.ir/warehouse' : 'https://drnutrition.com');
    const rawMain = item.imageUrl || item.image || '';
    const normMain = rawMain ? (normalizeProductImageUrl(rawMain, item.storeDomain || sourceUrl) || rawMain) : '';
    const rawImages = Array.isArray(item.images) && item.images.length > 0 ? item.images : (normMain ? [normMain] : []);
    const normImages = Array.from(
      new Set([normMain, ...rawImages.map((img: string) => normalizeProductImageUrl(img, item.storeDomain || sourceUrl) || img)].filter(Boolean))
    );
    const gallery = deduplicateImageUrls(normImages, normMain);

    const resolvedPriceAed = aedVal > 0 ? aedVal : (finalToman > 0 && liveAedRate > 0 ? Math.round(finalToman / liveAedRate) : 0);
    const now = Date.now();
    const rawCreated = item.createdAt || item.sectionAddedAt;
    const createdAtMs = rawCreated ? (
      typeof rawCreated === 'number' && !isNaN(rawCreated) && rawCreated > 0
        ? rawCreated
        : (new Date(rawCreated).getTime() || now)
    ) : now;

    const docId = item.id && !item.id.startsWith('draft_') && !item.id.startsWith('temp_')
      ? item.id
      : `prod_${now}`;

    const cleanPayload: any = {
      ...item,
      id: docId,
      title: titleToCheck,
      titleFa: sanitizeProductTitle(item.titleFa || titleToCheck),
      titleEn: sanitizeProductTitle(item.titleEn || ''),
      imageUrl: normMain,
      image: normMain,
      images: gallery,
      galleryImages: gallery,
      priceAed: resolvedPriceAed,
      basePriceAed: resolvedPriceAed,
      price: resolvedPriceAed,
      priceToman: finalToman,
      manualPriceToman: manualToman > 0 ? manualToman : null,
      isManualPrice: Boolean(item.isManualPrice || manualToman > 0),
      createdAt: createdAtMs,
      updatedAt: now,
      sectionAddedAt: new Date(now).toISOString(),
      targetSection,
      isPopular: Boolean(item.isPopular),
      popularOrder: item.isPopular ? (typeof item.popularOrder === 'number' && item.popularOrder > 0 ? item.popularOrder : now) : -1,
      isActive: item.isActive !== false,
      isPublished: item.isPublished !== false,
      isDraft: false
    };

    try {
      // 1. Direct Atomic Firestore setDoc into centralized 'products' collection
      const safePayload = sanitizePayloadForFirestore(cleanPayload);
      await setDoc(doc(db, 'products', docId), safePayload, { merge: true });

      // 2. Direct Atomic Firestore setDoc into section collection
      const targetCol = targetSection === 'iran_warehouse' ? 'iran_warehouse' : 'special_deals';
      await setDoc(doc(db, targetCol, docId), safePayload, { merge: true });

      // 3. Update in-memory state & persist settings CMS array
      if (targetSection === 'iran_warehouse') {
        const updated = [cleanPayload, ...inventoryList.filter(p => p.id !== docId && !isCorruptedProduct(p))];
        setInventoryList(updated);
        saveIranWarehouseItems(updated).catch(() => {});
      } else {
        const updated = [cleanPayload, ...dealsList.filter(p => p.id !== docId && !isCorruptedProduct(p))];
        setDealsList(updated);
        saveSpecialDeals(updated).catch(() => {});
      }
      setDraftProduct(null);
      if (showToast) {
        showToast('محصول با موفقیت در فایراستور ذخیره و در بالای لیست درج شد', 'success');
      }
    } catch (saveErr: any) {
      console.error('[CRITICAL FIRESTORE SAVE ERROR]:', saveErr);
      if (showToast) {
        showToast(`خطا در ذخیره دیتابیس: ${saveErr.message || 'عدم دسترسی به فایراستور'}`, 'error');
      }
    }
  };

  const handleGlobalSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!draftProduct) {
      if (showToast) showToast('پیشنویسی یافت نشد', 'error');
      return;
    }

    const titleFa = draftProduct.titleFa?.trim() || '';
    const titleEn = draftProduct.titleEn?.trim() || '';

    if (!titleFa && !titleEn) {
      if (showToast) showToast('خطا: عنوان محصول نمیتواند خالی باشد', 'error');
      return;
    }

    const now = Date.now();
    const docId = draftProduct.id && !draftProduct.id.startsWith('draft_') && !draftProduct.id.startsWith('manual_')
      ? draftProduct.id 
      : `prod_${now}`;

    const targetSection: 'deals' | 'iran_warehouse' = activeTab === 'deals' ? 'deals' : 'iran_warehouse';

    const rawCreated = draftProduct.createdAt || (draftProduct as any).sectionAddedAt;
    const createdAtMs = rawCreated ? (
      typeof rawCreated === 'number' && !isNaN(rawCreated) && rawCreated > 0
        ? rawCreated
        : (new Date(rawCreated).getTime() || now)
    ) : now;

    const payload: Product = {
      ...draftProduct,
      id: docId,
      title: titleFa || titleEn,
      titleFa,
      titleEn,
      imageUrl: draftProduct.imageUrl || draftProduct.image || '',
      images: draftProduct.imageUrl ? [draftProduct.imageUrl] : (draftProduct.images || []),
      priceAed: Number(draftProduct.priceAed || 0),
      priceToman: Number(draftProduct.priceToman || draftProduct.manualPriceToman || 0),
      targetSection,
      isActive: draftProduct.isActive !== false,
      isPopular: Boolean(draftProduct.isPopular),
      popularOrder: draftProduct.isPopular ? (typeof draftProduct.popularOrder === 'number' && draftProduct.popularOrder > 0 ? draftProduct.popularOrder : now) : -1,
      createdAt: createdAtMs,
      updatedAt: now
    };

    try {
      const safePayload = sanitizePayloadForFirestore(payload);
      await setDoc(doc(db, 'products', docId), safePayload, { merge: true });

      const targetCol = targetSection === 'iran_warehouse' ? 'iran_warehouse' : 'special_deals';
      await setDoc(doc(db, targetCol, safePayload), { merge: true }).catch(() => {});

      if (targetSection === 'iran_warehouse') {
        const updated = [payload as any, ...inventoryList.filter(p => p.id !== docId)];
        setInventoryList(updated);
        saveIranWarehouseItems(updated).catch(() => {});
      } else {
        const updated = [payload as any, ...dealsList.filter(p => p.id !== docId)];
        setDealsList(updated);
        saveSpecialDeals(updated).catch(() => {});
      }

      setDraftProduct(null);
      if (showToast) showToast('محصول با موفقیت ذخیره شد', 'success');
    } catch (err: any) {
      console.error('Firestore Save Error:', err);
      if (showToast) showToast('خطا در ارتباط با دیتابیس', 'error');
    }
  };

  // ── ATOMIC FIRESTORE PRODUCT DELETION (Fixing Trash Icon) ──
  const handleDeleteProduct = async (productId: string) => {
    if (!productId) {
      if (showToast) showToast('شناسه محصول نامعتبر است', 'error');
      return;
    }
    if (!window.confirm('آیا از حذف دائمی این محصول از پایگاه داده اطمینان دارید؟')) {
      return;
    }
    try {
      const rawId = normalizeProductId(productId);
      const collectionsToPurge = ['products', 'iran_warehouse', 'special_deals', 'inventory', 'deals'];
      await Promise.all([
        ...collectionsToPurge.map(col => deleteDoc(doc(db, col, productId)).catch(() => {})),
        ...(rawId && rawId !== productId ? collectionsToPurge.map(col => deleteDoc(doc(db, col, rawId)).catch(() => {})) : [])
      ]);
      const newInv = inventoryList.filter(item => item.id !== productId && item.id !== rawId);
      const newDeals = dealsList.filter(item => item.id !== productId && item.id !== rawId);
      setInventoryList(newInv);
      setDealsList(newDeals);
      await Promise.all([
        saveIranWarehouseItems(newInv),
        saveSpecialDeals(newDeals)
      ]);
      if (draftProduct?.id === productId) setDraftProduct(null);
      if (showToast) showToast('محصول با موفقیت از پایگاه داده حذف شد', 'success');
    } catch (err: any) {
      console.error('[Firestore Delete Error]:', err);
      if (showToast) showToast(`خطا در حذف محصول: ${err.message || 'خطای سرور'}`, 'error');
    }
  };


  // 2. Scrape Auxiliary Variant URL (Mirrored directly from HeroCalculator)
  const handleScrapeAuxiliary = async () => {
    const cleanAux = extractCleanUrl(auxUrl);
    if (!cleanAux) {
      if (showToast) showToast('لطفاً لینک کمکی طعم یا وزن را وارد کنید', 'error');
      return;
    }
    setIsScrapingAux(true);
    try {
      console.log('[Scraper Engine] Initiating auxiliary extraction: ProductManagementAdmin', { cleanAux });
      const result = await extractProductShared(cleanAux, cms);

      if (result.success && result.priceAed && result.priceAed > 0) {
        const attr = extractAttributesFromText(result.title || '', cleanAux);
        const pAed = result.priceAed;
        const origAed = result.originalPriceAed;
        const sz = (result.sizes && result.sizes[0]) || attr.size || '';
        const flv = (result.flavors && result.flavors[0]) || attr.flavor || '';
        const img = result.image || result.imageUrl || product.image || '';

        const vLanded = calculateLandedPrice({
          priceAed: pAed,
          weightKg: result.weightKg || product.weightKg || 0.8,
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
          inStock: result.inStock !== false,
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
        if (showToast) showToast(result.error || 'عدم توانایی در استخراج واریانت از لینک کمکی', 'error');
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
    const titleFa = (product.titleFa || '').trim();
    const titleEn = (product.titleEn || product.title || '').trim();
    const hasValidTitle = Boolean(titleFa || titleEn) && titleFa !== 'محصول بدون عنوان' && titleEn !== 'محصول بدون عنوان';
    if (!hasValidTitle) {
      if (showToast) showToast('ثبت کالا امکان‌پذیر نیست: عنوان فارسی یا انگلیسی الزامی است', 'error');
      return;
    }

    const aedVal = Number(product.priceAed || product.price || 0);
    const tomanVal = Number(product.priceToman || product.manualPriceToman || 0);
    if (aedVal <= 0 && tomanVal <= 0) {
      if (showToast) showToast('ثبت کالا امکان‌پذیر نیست: قیمت کالا (درهم یا تومان) باید بیشتر از ۰ باشد', 'error');
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

      const rawImagesList = Array.isArray(product.images) && product.images.length > 0 ? product.images : (normMainImg ? [normMainImg] : []);
      const normGallery = deduplicateImageUrls(
        Array.from(new Set([normMainImg, ...rawImagesList.map((img: string) => normalizeProductImageUrl(img, sourceUrl) || img)].filter(Boolean))),
        normMainImg
      );

      const targetSection: 'deals' | 'iran_warehouse' = (product.targetSection === 'iran_warehouse' || activeTab === 'iran_warehouse') ? 'iran_warehouse' : 'deals';
      const sanitizedProduct = {
        ...product,
        id: uniqueId,
        targetSection,
        isActive: product.isActive ?? true,
        image: normMainImg || product.image,
        imageUrl: normMainImg || product.image,
        images: normGallery,
        galleryImages: normGallery,
        priceToman: Number(product.priceToman) || 0,
        priceAed: Number(product.priceAed) || 0,
        isPublished: product.isPublished !== false,
        isPopular: Boolean(product.isPopular),
        popularOrder: product.isPopular
          ? (typeof product.popularOrder === 'number' && product.popularOrder >= 0 ? product.popularOrder : Date.now())
          : -1,
        variants: sanitizedVariants,
        flavors: Array.from(new Set(sanitizedVariants.map(v => v.flavor))),
        sizes: Array.from(new Set(sanitizedVariants.map(v => v.size))),
        createdAt: isNew ? (product.createdAt || serverTimestamp()) : (product.createdAt || serverTimestamp()),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'products', uniqueId), sanitizedProduct, { merge: true });
      const targetCol = targetSection === 'iran_warehouse' ? 'iran_warehouse' : 'special_deals';
      await setDoc(doc(db, targetCol, uniqueId), sanitizedProduct, { merge: true });

      if (onSaveProduct) {
        await onSaveProduct(sanitizedProduct);
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

  const handleTogglePopular = async (
    e?: React.MouseEvent,
    targetItem?: Product | NormalizedProduct | Partial<Product> | string
  ) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const itemObj = typeof targetItem === 'object' && targetItem !== null ? targetItem : null;
    const targetId = typeof targetItem === 'string'
      ? targetItem
      : (itemObj?.id || draftProduct?.id || product.id);

    // Identify if target is an unsaved draft
    const isTargetDraft = !targetId ||
      targetId.startsWith('draft_') ||
      targetId.startsWith('manual_') ||
      itemObj === draftProduct ||
      (!products.some(p => p.id === targetId) && !inventoryList.some(i => i.id === targetId) && !dealsList.some(d => d.id === targetId));

    // 1. Invariant for New Drafts:
    // If toggling on an unsaved draft (draftProduct), ONLY mutate local component state.
    // Do NOT call Firestore until "ذخیره سراسری تنظیمات و محصولات" is clicked.
    if (isTargetDraft) {
      const currentDraftPop = Boolean(itemObj?.isPopular ?? draftProduct?.isPopular ?? product.isPopular);
      const nextDraftPop = !currentDraftPop;
      const nextDraftOrder = nextDraftPop ? 0 : -1;

      setDraftProduct((prev) => prev ? ({
        ...prev,
        isPopular: nextDraftPop,
        isPopularSample: nextDraftPop,
        isFeatured: nextDraftPop,
        popularOrder: nextDraftOrder
      }) : null);

      setProduct((prev) => ({
        ...prev,
        isPopular: nextDraftPop,
        isPopularSample: nextDraftPop,
        isFeatured: nextDraftPop,
        popularOrder: nextDraftOrder
      }));

      if (showToast) {
        showToast(nextDraftPop ? 'وضعیت پیش‌نویس: پرطرفدار (با ذخیره سراسری در دیتابیس ثبت می‌شود)' : 'وضعیت پیش‌نویس: عادی', 'info');
      }
      return;
    }

    // 2. Invariant for Existing Products:
    // If toggling an existing catalog item, perform an isolated optimistic Firestore update
    const existing = products.find(p => p.id === targetId) ||
      inventoryList.find(i => i.id === targetId) ||
      dealsList.find(d => d.id === targetId) ||
      (product.id === targetId ? product : null);

    const currentPop = Boolean(existing?.isPopular);
    const nextState = !currentPop;
    const now = Date.now();
    const nextOrder = nextState ? now : -1;

    // Optimistic local state update across all lists without resetting open rows, modals, or scroll
    setProducts((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: nextState, popularOrder: nextOrder } : p));
    setInventoryList((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: nextState, popularOrder: nextOrder } : p));
    setDealsList((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: nextState, popularOrder: nextOrder } : p));
    setProduct((prev) => prev.id === targetId ? { ...prev, isPopular: nextState, popularOrder: nextOrder } : prev);
    if (draftProduct?.id === targetId) {
      setDraftProduct((prev) => prev ? ({ ...prev, isPopular: nextState, popularOrder: nextOrder }) : null);
    }

    try {
      if (db && targetId) {
        const productRef = doc(db, 'products', targetId);
        await updateDoc(productRef, {
          isPopular: nextState,
          isPopularSample: nextState,
          isFeatured: nextState,
          popularOrder: nextOrder,
          updatedAt: serverTimestamp()
        }).catch((err) => {
          console.warn('[ProductManagementAdmin] updateDoc skipped:', err);
        });

        // Atomically sync in iran_warehouse and special_deals if existing
        updateDoc(doc(db, 'iran_warehouse', targetId), {
          isPopular: nextState,
          isPopularSample: nextState,
          popularOrder: nextOrder,
          updatedAt: serverTimestamp()
        }).catch(() => {});

        updateDoc(doc(db, 'special_deals', targetId), {
          isPopular: nextState,
          isPopularSample: nextState,
          popularOrder: nextOrder,
          updatedAt: serverTimestamp()
        }).catch(() => {});
      }

      if (showToast) {
        showToast(nextState ? 'به لیست پرطرفدارها افزوده شد' : 'از لیست پرطرفدارها حذف شد', 'success');
      }
    } catch (err: any) {
      console.error('[Popular Toggle DB Error]:', err);
      // Revert optimistic update on failure
      setProducts((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: currentPop, popularOrder: currentPop ? 0 : -1 } : p));
      setInventoryList((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: currentPop, popularOrder: currentPop ? 0 : -1 } : p));
      setDealsList((prev) => prev.map((p) => p.id === targetId ? { ...p, isPopular: currentPop, popularOrder: currentPop ? 0 : -1 } : p));
      setProduct((prev) => prev.id === targetId ? { ...prev, isPopular: currentPop } : prev);
      if (showToast) showToast('خطا در ذخیره وضعیت در دیتابیس', 'error');
    }
  };

  const handleTogglePublished = (productId?: string) => {
    const currentPub = (draftProduct?.isPublished ?? product.isPublished) !== undefined
      ? (draftProduct?.isPublished ?? product.isPublished)
      : (draftProduct?.isActive ?? product.isActive);
    const nextPub = !currentPub;
    setDraftProduct((prev) => prev ? ({ ...prev, isPublished: nextPub, isActive: nextPub }) : null);
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

          <div className="flex items-center gap-2">

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
              {toPersianDigits(iranWarehouseCount)}
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
              {toPersianDigits(dealsCount)}
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
              {toPersianDigits(totalActiveProductsCount)}
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
          settings={settings}
          cms={cms}
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
          settings={settings}
          cms={cms}
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
            activeTab={activeTab}
            aedRate={liveAedRate}
            showToast={showToast}
            onSave={async (draft) => {
              const now = Date.now();
              const nowIso = new Date(now).toISOString();
              const sourceUrl = draft.sourceUrl || draft.url || 'https://drnutrition.com';
              const rawImg = draft.imageUrl || draft.image || '';
              const normMain = normalizeProductImageUrl(rawImg, draft.storeDomain || sourceUrl) || rawImg;
              const rawImgs = Array.isArray(draft.images) && draft.images.length > 0 ? draft.images : (normMain ? [normMain] : []);
              const normGallery = deduplicateImageUrls(
                Array.from(new Set([normMain, ...rawImgs.map((img: string) => normalizeProductImageUrl(img, draft.storeDomain || sourceUrl) || img)].filter(Boolean))),
                normMain
              );

              const rawCreated = (draft as any).createdAt;
              const createdAtMs = rawCreated ? (
                typeof rawCreated === 'number' && !isNaN(rawCreated) && rawCreated > 0
                  ? rawCreated
                  : (new Date(rawCreated).getTime() || now)
              ) : now;

              const itemDraft = {
                ...draft,
                imageUrl: normMain,
                image: normMain,
                images: normGallery,
                galleryImages: normGallery,
                createdAt: createdAtMs,
                sectionAddedAt: nowIso,
                updatedAt: now,
                popularOrder: draft.isPopular ? (typeof draft.popularOrder === 'number' && draft.popularOrder > 0 ? draft.popularOrder : now) : -1
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-red-600" />
                <span>لینک اصلی محصول (Primary Master URL) یا افزودن دستی</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCreateManualDraft}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن محصول دستی</span>
                </button>
                {products.length > 0 && (
                  <select
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const found = products.find(p => p.id === id);
                      if (found) {
                        const editDraft: Product = {
                          ...found,
                          id: found.id,
                          title: found.title || (found as any).titleFa || '',
                          titleFa: (found as any).titleFa || found.title || '',
                          titleEn: (found as any).titleEn || '',
                          imageUrl: found.imageUrl || (found as any).image || '',
                          image: found.imageUrl || (found as any).image || '',
                          images: found.images && found.images.length > 0 ? found.images : [(found.imageUrl || (found as any).image || '')].filter(Boolean),
                          priceAed: found.priceAed || (found as any).price || 0,
                          priceToman: found.priceToman || 0,
                          manualPriceToman: found.manualPriceToman || null,
                          isManualPrice: Boolean(found.isManualPrice),
                          targetSection: (found as any).targetSection || activeTab
                        } as Product;
                        setDraftProduct(editDraft);
                        setProduct(editDraft as any);
                        if (showToast) showToast(`محصول «${editDraft.titleFa || editDraft.title}» جهت ویرایش بارگذاری شد`, 'info');
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-200 cursor-pointer max-w-[180px] truncate"
                  >
                    <option value="">ویرایش کالای موجود...</option>
                    {cleanList.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.titleFa || p.title || p.titleEn || p.id}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('deals')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                      activeTab === 'deals' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔥 پیشنهادهای ویژه (Deals)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('iran_warehouse')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                      activeTab === 'iran_warehouse' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏢 انبار ایران (Warehouse)
                  </button>
                </div>
              </div>
            </div>
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
            placeholder="https://ae.iherb.com/... یا https://www.sportsresearch.com/... یا https://www.drnutrition.com/en-ae/... یا https://www.sporter.com/en-ae/..."
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

        {/* Product Draft Card (Manual or Scraped) */}
        {(draftProduct || product.title) && (
          <div className="p-5 bg-gradient-to-br from-slate-50 to-white border border-emerald-200 rounded-3xl shadow-xs space-y-4 mt-3">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">
                  {draftProduct?.id?.startsWith('manual_')
                    ? 'ایجاد محصول دستی جدید'
                    : (draftProduct?.id && (inventoryList.some(i => i.id === draftProduct.id) || dealsList.some(d => d.id === draftProduct.id))
                      ? 'ویرایش مشخصات محصول موجود'
                      : 'پیش‌نویس محصول')}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {activeTab === 'deals' ? 'پیشنهادهای ویژه' : 'انبار ایران'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftProduct(null);
                  if (showToast) showToast('پیش‌نویس لغو شد', 'info');
                }}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2.5 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
              >
                انصراف و لغو پیش‌نویس
              </button>
            </div>

            {/* Thumbnail Preview & Live Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {(draftProduct?.imageUrl || draftProduct?.image || product.imageUrl || product.image) ? (
                  <img
                    src={draftProduct?.imageUrl || draftProduct?.image || product.imageUrl || product.image}
                    alt={draftProduct?.titleEn || 'Product'}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      e.currentTarget.classList.add('opacity-40');
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold">
                    بدون تصویر
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-sm font-black text-slate-900 block truncate">
                  {draftProduct?.titleFa || draftProduct?.title || product.title || 'عنوان محصول را وارد کنید'}
                </span>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-bold">
                  <span>برند: {draftProduct?.brand || product.brand || '—'}</span>
                  <span className="text-emerald-600 font-bold">قیمت درهم: {draftProduct?.priceAed || product.priceAed || 0} AED</span>
                  <span className="text-teal-700 font-black">قیمت فروش: {formatToman(draftProduct?.priceToman || product.priceToman || 0)} تومان</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mr-auto shrink-0">
                {/* Active/Publish Switch */}
                <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-bold text-slate-500">نمایش در سایت</span>
                  <input
                    type="checkbox"
                    checked={draftProduct?.isActive !== false}
                    onChange={(e) => setDraftProduct(prev => prev ? { ...prev, isActive: e.target.checked } : null)}
                    className="w-8 h-4 bg-slate-300 rounded-full appearance-none checked:bg-emerald-500 transition-colors relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:bg-white before:rounded-full before:top-[1px] before:left-[1px] checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                {/* Popular Switch */}
                <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-bold text-slate-500">پرطرفدار ★</span>
                  <input
                    type="checkbox"
                    checked={draftProduct?.isPopular || false}
                    onChange={(e) => setDraftProduct(prev => prev ? { ...prev, isPopular: e.target.checked } : null)}
                    className="w-8 h-4 bg-slate-300 rounded-full appearance-none checked:bg-amber-500 transition-colors relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:bg-white before:rounded-full before:top-[1px] before:left-[1px] checked:before:translate-x-4 before:transition-transform"
                  />
                </label>

                {/* Trash Toggle */}
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draftProduct?.id && !draftProduct.id.startsWith('draft_') && !draftProduct.id.startsWith('manual_')) {
                      await handleDeleteProduct(draftProduct.id);
                    } else {
                      setDraftProduct(null);
                      if (showToast) showToast('پیش‌نویس لغو شد', 'info');
                    }
                  }}
                  className="p-1.5 text-rose-500 hover:bg-rose-100 hover:text-rose-700 active:scale-95 rounded-lg transition cursor-pointer"
                  title="حذف / لغو پیش‌نویس"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Editable Fields Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              {/* Persian Title */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">عنوان فارسی محصول:</label>
                <input
                  type="text"
                  value={draftProduct?.titleFa || product.titleFa || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftProduct(p => {
                      const base = p || (product as Product);
                      const next = { ...base, titleFa: val, title: val };
                      draftProductRef.current = next;
                      return next;
                    });
                    setProduct(p => ({ ...p, titleFa: val, title: val }));
                  }}
                  placeholder="مثال: پروتئین وی ۱۰۰٪ گلد استاندارد ۲.۲۷ کیلوگرم..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* English Title */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">عنوان انگلیسی محصول:</label>
                <input
                  type="text"
                  value={draftProduct?.titleEn || product.titleEn || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDraftProduct(p => {
                      const base = p || (product as Product);
                      const next = { ...base, titleEn: val };
                      draftProductRef.current = next;
                      return next;
                    });
                    setProduct(p => ({ ...p, titleEn: val }));
                  }}
                  placeholder="e.g. Gold Standard 100% Whey Protein 2.27kg..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 dir-ltr text-right"
                />
              </div>

              {/* ── تنظیم تصویر محصول (Product Image Settings) ── */}
              <div className="sm:col-span-12 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-slate-900">تنظیم تصویر محصول (Product Image Settings)</span>
                  </div>
                  {isUploadingImage && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>در حال بارگذاری در Firebase Storage...</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Reactive Thumbnail Container */}
                  <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {(draftProduct?.imageUrl || draftProduct?.image || product.imageUrl || product.image) ? (
                      <img
                        src={draftProduct?.imageUrl || draftProduct?.image || product.imageUrl || product.image}
                        alt="پیش‌نمایش تصویر محصول"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain p-1.5 transition"
                        onError={(e) => {
                          e.currentTarget.classList.add('opacity-40');
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-[10px] text-slate-400 font-bold p-1 text-center">
                        <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                        <span>بدون تصویر</span>
                      </div>
                    )}
                  </div>

                  {/* Dual Input Controls: Direct URL + Device File Picker */}
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      درج آدرس مستقیم لینک تصویر یا بارگذاری فایل از موبایل / لپ‌تاپ:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={draftProduct?.imageUrl || draftProduct?.image || product.imageUrl || product.image || ''}
                        onChange={(e) => handleDirectImageUrlChange(e.target.value)}
                        placeholder="لینک تصویر را وارد کنید..."
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 dir-ltr text-right"
                      />
                      <label className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs active:scale-98">
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>انتخاب فایل از دستگاه</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleManualImageFileUpload}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Base AED Price */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">قیمت پایه (AED):</label>
                <input
                  type="number"
                  value={draftProduct?.priceAed !== undefined && draftProduct.priceAed !== 0 ? draftProduct.priceAed : (product.priceAed || '')}
                  onChange={(e) => {
                    const p = parseFloat(e.target.value) || 0;
                    const margin = draftProduct?.profitMargin || 20;
                    const shipping = draftProduct?.shippingFeeAed ?? (activeTab === 'iran_warehouse' ? 0 : 20);
                    const calcToman = p > 0 ? Math.round((p + shipping) * (1 + margin / 100) * liveAedRate) : (draftProduct?.priceToman || 0);
                    setDraftProduct(prev => {
                      const base = prev || (product as Product);
                      const next = {
                        ...base,
                        priceAed: p,
                        basePriceAed: p,
                        price: p,
                        priceToman: base.isManualPrice && base.manualPriceToman ? base.manualPriceToman : calcToman
                      };
                      draftProductRef.current = next;
                      return next;
                    });
                    setProduct(prev => ({
                      ...prev,
                      priceAed: p,
                      price: p,
                      priceToman: prev.isManualPrice && prev.manualPriceToman ? prev.manualPriceToman : calcToman
                    }));
                  }}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 dir-ltr text-center"
                />
              </div>

              {/* Profit Margin */}
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">درصد سود (%):</label>
                <input
                  type="number"
                  value={draftProduct?.profitMargin ?? 20}
                  onChange={(e) => {
                    const m = parseFloat(e.target.value) || 0;
                    const p = draftProduct?.priceAed || 0;
                    const shipping = draftProduct?.shippingFeeAed ?? (activeTab === 'iran_warehouse' ? 0 : 20);
                    const calcToman = p > 0 ? Math.round((p + shipping) * (1 + m / 100) * liveAedRate) : (draftProduct?.priceToman || 0);
                    setDraftProduct(prev => {
                      const base = prev || (product as Product);
                      const next = {
                        ...base,
                        profitMargin: m,
                        priceToman: base.isManualPrice && base.manualPriceToman ? base.manualPriceToman : calcToman
                      };
                      draftProductRef.current = next;
                      return next;
                    });
                  }}
                  placeholder="20"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 dir-ltr text-center"
                />
              </div>

              {/* Manual Selling Price Toman */}
              <div className="sm:col-span-6 space-y-1">
                <label className="text-[11px] font-bold text-emerald-700">قیمت نهایی فروش (تومان - دستی):</label>
                <div className="relative">
                  <input
                    type="number"
                    value={draftProduct?.priceToman || product.priceToman || ''}
                    onChange={(e) => {
                      const customVal = e.target.value === '' ? 0 : Number(e.target.value);
                      setDraftProduct((prev) => {
                        const base = prev || (product as Product);
                        const next = {
                          ...base,
                          priceToman: customVal,
                          manualPriceToman: customVal,
                          isManualPrice: true
                        };
                        draftProductRef.current = next;
                        return next;
                      });
                      setProduct((prev) => ({
                        ...prev,
                        priceToman: customVal,
                        manualPriceToman: customVal,
                        isManualPrice: true
                      }));
                    }}
                    placeholder="قیمت دستی به تومان"
                    className="w-full pl-12 pr-3 py-2 text-xs font-black text-emerald-700 bg-white border border-emerald-400 rounded-xl focus:ring-2 focus:ring-emerald-500 dir-ltr text-center"
                  />
                  <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">تومان</span>
                </div>
              </div>

              {/* Category */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">دسته‌بندی اصلی:</label>
                <select
                  value={draftProduct?.category || product.category || DEFAULT_TAXONOMY[0]?.name}
                  onChange={(e) => {
                    const catName = e.target.value;
                    if (draftProduct) setDraftProduct(p => p ? { ...p, category: catName, mainCategory: catName } : null);
                    setProduct(p => ({ ...p, category: catName, mainCategory: catName }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {DEFAULT_TAXONOMY.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* SubCategory */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">زیر‌دسته:</label>
                <select
                  value={draftProduct?.subCategory || product.subCategory || ''}
                  onChange={(e) => {
                    const subName = e.target.value;
                    if (draftProduct) setDraftProduct(p => p ? { ...p, subCategory: subName, subcategory: subName } : null);
                    setProduct(p => ({ ...p, subCategory: subName, subcategory: subName }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {(() => {
                    const currentCatName = draftProduct?.category || product.category || DEFAULT_TAXONOMY[0]?.name;
                    const catObj = DEFAULT_TAXONOMY.find(c => c.name === currentCatName) || DEFAULT_TAXONOMY[0];
                    return (catObj?.subCategories || []).map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Store Name */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-slate-700">فروشگاه مبدا / تامین‌کننده:</label>
                <select
                  value={draftProduct?.storeName || product.storeName || (activeTab === 'iran_warehouse' ? 'انبار ایران (تحویل فوری)' : 'سیریک فیت')}
                  onChange={(e) => {
                    const st = e.target.value;
                    if (draftProduct) setDraftProduct(p => p ? { ...p, storeName: st } : null);
                    setProduct(p => ({ ...p, storeName: st }));
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="انبار ایران (تحویل فوری)">انبار ایران (تحویل فوری)</option>
                  <option value="سیریک فیت">سیریک فیت</option>
                  {STORE_LIST.map(st => (
                    <option key={st.id} value={st.name}>{st.name} {st.nameFa ? `(${st.nameFa})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Commit Draft Button Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraftProduct(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleGlobalSave}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ذخیره سراسری تنظیمات و محصولات</span>
                </button>
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
