import type { ProductVariant } from '../types';
import { extractCleanUrl, normalizeProductImageUrl, deduplicateImageUrls, isArtificialFallback } from '../utils/formatters';
import { parseProductLinkUniversal, cleanProductTitle } from '../utils/parseLink';
import { sanitizeProductTitle } from '../utils/textSanitizer';
import { getEffectiveGeminiKeysList } from '../utils/geminiKey';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SharedExtractedProduct {
  success: boolean;
  error?: string;
  message?: string;
  id: string;
  title: string;
  titleFa: string;
  titleEn: string;
  priceAed: number;
  originalPriceAed?: number;
  discountPercent?: number;
  image: string;
  imageUrl: string;
  images: string[];
  galleryImages: string[];
  storeName: string;
  brand: string;
  category: string;
  weightKg: number;
  description?: string;
  sourceUrl: string;
  url: string;
  variants: ProductVariant[];
  variantGroups?: any[];
  flavors: string[];
  sizes: string[];
  options: string[];
  variantMatrix?: any;
  inStock: boolean;
}

/**
 * SHARED PRODUCT EXTRACTION ENGINE (Single Source of Truth)
 * Used identically across Homepage (HeroCalculator), Iran Inventory (IranWarehouseAdmin),
 * and Special Offers (DealsAdmin).
 */
export async function extractProductShared(
  inputUrl: string,
  explicitCms?: any,
  options?: { bypassCache?: boolean; forceFresh?: boolean }
): Promise<SharedExtractedProduct> {
  const targetUrl = extractCleanUrl((inputUrl || '').trim());
  if (!targetUrl) {
    return {
      success: false,
      error: 'آدرس لینک محصول الزامی است.',
      id: '',
      title: '',
      titleFa: '',
      titleEn: '',
      priceAed: 0,
      image: '',
      imageUrl: '',
      images: [],
      galleryImages: [],
      storeName: '',
      brand: '',
      category: '',
      weightKg: 0.8,
      sourceUrl: '',
      url: '',
      variants: [],
      flavors: [],
      sizes: [],
      options: [],
      inStock: false
    };
  }

  // 1. Resolve CMS configuration & API Keys with robust cold-start fallback
  let cmsConfig: any = explicitCms || null;
  if (!cmsConfig && typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('sirikfit_cms_config');
      if (saved) cmsConfig = JSON.parse(saved);
    } catch (_e) {}
  }

  if (!cmsConfig) {
    try {
      const snap = await getDoc(doc(db, 'settings', 'cms'));
      if (snap.exists()) {
        cmsConfig = snap.data();
      } else {
        const appSnap = await getDoc(doc(db, 'cms', 'app'));
        if (appSnap.exists()) cmsConfig = appSnap.data();
      }
    } catch (_docErr) {
      console.warn('[SharedExtractor] Firestore CMS fetch warning:', _docErr);
    }
  }

  const savedKeys = getEffectiveGeminiKeysList(cmsConfig?.apiConfig?.geminiApiKeys || cmsConfig?.apiConfig?.geminiApiKey);

  console.log('[SharedExtractor] Initiating shared extraction for URL:', targetUrl);

  // 2. Execute Universal Link Parser (Direct /api/parse-link microservice)
  const result = await parseProductLinkUniversal({
    url: targetUrl,
    geminiKeys: savedKeys,
    cmsConfig,
    bypassCache: options?.bypassCache ?? true,
    forceFresh: options?.forceFresh ?? true
  });

  if (!result || !result.success || !result.priceAed || result.priceAed <= 0) {
    return {
      success: false,
      error: result?.error || result?.message || 'امکان استخراج اطلاعات از این لینک وجود ندارد. لطفاً از صحت لینک اطمینان حاصل فرمایید.',
      id: '',
      title: '',
      titleFa: '',
      titleEn: '',
      priceAed: 0,
      image: '',
      imageUrl: '',
      images: [],
      galleryImages: [],
      storeName: '',
      brand: '',
      category: '',
      weightKg: 0.8,
      sourceUrl: targetUrl,
      url: targetUrl,
      variants: [],
      flavors: [],
      sizes: [],
      options: [],
      inStock: false
    };
  }

  // 3. Resolve Real Authentic Image & Guarantee Absolute HTTPS CDN URL
  const domainForImg = result.storeDomain || (targetUrl.includes('drnutrition.com') ? 'https://drnutrition.com' : targetUrl);
  const rawImage = result.imageUrl || result.image || result.mainImage || (Array.isArray(result.images) && result.images[0]) || (Array.isArray(result.galleryImages) && result.galleryImages[0]) || '';
  
  let resolvedImageUrl = String(rawImage || '').trim();
  if (resolvedImageUrl.startsWith('//')) {
    resolvedImageUrl = 'https:' + resolvedImageUrl;
  } else if (resolvedImageUrl.startsWith('/')) {
    resolvedImageUrl = 'https://drnutrition.com' + resolvedImageUrl;
  }

  const normMain = normalizeProductImageUrl(resolvedImageUrl, domainForImg) || resolvedImageUrl;
  console.log('[SharedExtractor] Authentic image resolved:', normMain);

  // 4. Resolve Gallery Images
  const rawGalleryList = (Array.isArray(result.images) && result.images.length > 0)
    ? result.images
    : (Array.isArray(result.galleryImages) && result.galleryImages.length > 0 ? result.galleryImages : (normMain ? [normMain] : []));

  const normalizedGallery = Array.from(
    new Set(
      [normMain, ...rawGalleryList.map((img: string) => {
        let s = String(img || '').trim();
        if (s.startsWith('//')) s = 'https:' + s;
        else if (s.startsWith('/')) s = 'https://drnutrition.com' + s;
        return normalizeProductImageUrl(s, domainForImg) || s;
      })].filter(Boolean)
    )
  );
  const galleryList = deduplicateImageUrls(normalizedGallery, normMain);

  // 5. Resolve Store & Titles
  const isDrNutrition = targetUrl.toLowerCase().includes('drnutrition.com');
  const isIherb = targetUrl.toLowerCase().includes('iherb.com') || targetUrl.toLowerCase().includes('ae.iherb.com');
  const resolvedStore = isIherb ? 'iHerb' : (isDrNutrition ? 'Dr. Nutrition' : (result.storeName || 'دبی'));
  const brandName = result.brand || resolvedStore;

  const rawTitle = (result.title || '').trim();
  const cleanRaw = sanitizeProductTitle(rawTitle);
  let titleFa = sanitizeProductTitle((result as any).titleFa || cleanRaw);
  let titleEn = sanitizeProductTitle((result as any).titleEn || '');
  const bracketMatch = rawTitle.match(/\(([^)]+)\)$/);
  if (bracketMatch) {
    titleEn = sanitizeProductTitle(bracketMatch[1]);
    titleFa = cleanRaw || sanitizeProductTitle(titleFa);
  } else if (!titleEn) {
    titleEn = sanitizeProductTitle(cleanProductTitle(rawTitle));
  }
  if (!titleFa) titleFa = titleEn;
  if (!titleEn) titleEn = titleFa;

  const cleanFlavors = (result.flavors || []).filter((f: string) => f && !isArtificialFallback(f));
  const cleanSizes = (result.sizes || []).filter((s: string) => s && !isArtificialFallback(s));
  const cleanOptions = (result.options || []).filter((o: string) => o && !isArtificialFallback(o));

  // 6. Map Real Product Variants
  const pAed = Number(result.priceAed) || 0;
  const origAed = Number(result.originalPriceAed) || undefined;

  let mappedVariants: ProductVariant[] = [];
  if (Array.isArray(result.variants) && result.variants.length > 0) {
    mappedVariants = result.variants.map((v: any, idx: number) => {
      const rawVImg = v.imageUrl || v.imageThumbnail || v.image || normMain;
      const vImg = normalizeProductImageUrl(rawVImg, domainForImg) || rawVImg;
      const vPrice = Number(v.priceAED ?? v.priceAed ?? v.price ?? pAed) || pAed;
      return {
        id: v.id || `var-${idx}-${Date.now()}`,
        size: v.size || (v.type === 'size' ? v.name : undefined) || cleanSizes[0] || undefined,
        flavor: v.flavor || (v.type === 'flavor' ? v.name : undefined) || cleanFlavors[0] || undefined,
        price: vPrice,
        priceAed: vPrice,
        originalPrice: v.originalPriceAED ?? v.originalPriceAed ?? origAed,
        originalPriceAed: v.originalPriceAED ?? v.originalPriceAed ?? origAed,
        image: vImg,
        imageUrl: vImg,
        inStock: v.inStock !== false
      };
    });
  } else if (cleanSizes.length > 0 || cleanFlavors.length > 0 || pAed > 0) {
    mappedVariants = [{
      id: `var-main-${Date.now()}`,
      size: cleanSizes[0] || undefined,
      flavor: cleanFlavors[0] || undefined,
      price: pAed,
      priceAed: pAed,
      originalPrice: origAed,
      originalPriceAed: origAed,
      image: normMain,
      imageUrl: normMain,
      inStock: true
    }];
  }

  const uniqueId = (result.id && !result.id.startsWith('scraped-')) ? result.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    success: true,
    id: uniqueId,
    title: titleFa || titleEn || 'محصول استخراج شده',
    titleFa: titleFa || titleEn || 'محصول استخراج شده',
    titleEn: titleEn || titleFa || 'Extracted Product',
    priceAed: pAed,
    originalPriceAed: origAed,
    discountPercent: result.discountPercent,
    image: normMain,
    imageUrl: normMain,
    images: galleryList,
    galleryImages: galleryList,
    storeName: resolvedStore,
    brand: brandName,
    category: result.category || '💊 مکمل‌های ورزشی',
    weightKg: Number(result.weightKg || 0.8) || 0.8,
    description: result.description,
    sourceUrl: targetUrl,
    url: targetUrl,
    variants: mappedVariants,
    variantGroups: result.variantGroups,
    variantMatrix: result.variantMatrix,
    flavors: cleanFlavors,
    sizes: cleanSizes,
    options: cleanOptions,
    inStock: result.inStock !== false
  };
}
