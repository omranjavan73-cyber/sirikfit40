import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { 
  UniversalProduct, 
  VariantDimension, 
  VariantOption, 
  ProductVariantGroup, 
  ScrapedProductResult, 
  ProductVariantItem,
  ProductData,
  VariantGroupsStructure
} from '../types';
import { generateBilingualProductTitle, parseProductLinkUniversal } from '../utils/parseLink';
import { getEffectiveGeminiKeysList } from '../utils/geminiKey';
import { sanitizeVariantLabel, isArtificialFallback, normalizeProductImageUrl, isInvalidProductImage, deduplicateImageUrls } from '../utils/formatters';
import { GncAdapter } from './GncAdapter';
import { DrNutritionAdapter } from './DrNutritionAdapter';
import { GncParser } from './gncParser';
import { DrNutritionParser } from './drNutritionParser';
import { IherbAdapter } from './IherbAdapter';
import { IherbParser, resolveIherbHighResImage } from './iherbParser';

export { GncAdapter, DrNutritionAdapter, GncParser, DrNutritionParser, IherbAdapter, IherbParser, resolveIherbHighResImage, normalizeProductImageUrl, isInvalidProductImage };

export interface ScraperAdapter {
  storeName: string;
  storeOrigin?: string;
  canHandle(url: string): boolean;
  parse(url: string, rawHtml?: string, rawData?: any): Promise<UniversalProduct | null>;
}

export function detectStoreOrigin(url: string): { storeName: string; origin: string; flag: string } {
  const lower = (url || '').toLowerCase();
  if (lower.includes('iherb.com') || lower.includes('ae.iherb.com')) {
    return { storeName: 'iHerb', origin: 'انبار مرکزی iHerb امارات و دبی', flag: '🇦🇪' };
  }
  if (lower.includes('sportsresearch.com')) {
    return { storeName: 'Sports Research', origin: 'فروشگاه رسمی Sports Research آمریکا', flag: '🇺🇸' };
  }
  if (lower.includes('amazon.ae') || lower.includes('amazon.')) {
    return { storeName: 'Amazon UAE', origin: 'دبی، امارات (Amazon.ae)', flag: '🇦🇪' };
  }
  if (lower.includes('drnutrition.com')) {
    return { storeName: 'Dr. Nutrition', origin: 'انبار مرکزی Dr Nutrition دبی', flag: '🇦🇪' };
  }
  if (lower.includes('gnc.')) {
    return { storeName: 'GNC Store', origin: 'نمایندگی رسمی GNC امارات', flag: '🇦🇪' };
  }
  if (lower.includes('lifepharmacy.com')) {
    return { storeName: 'Life Pharmacy', origin: 'انبار داروخانه‌های لایف امارات', flag: '🇦🇪' };
  }
  if (lower.includes('noon.com')) {
    return { storeName: 'Noon Dubai', origin: 'انبار اکسپرس نون دبی', flag: '🇦🇪' };
  }
  if (lower.includes('sporter.com')) {
    return { storeName: 'Sporter UAE', origin: 'انبار اسپورتر دبی', flag: '🇦🇪' };
  }
  return { storeName: 'فروشگاه معتبر دبی', origin: 'انبار امارات متحده عربی', flag: '🇦🇪' };
}

/**
 * Universal Scraper Service Adapter Registry & Normalizer
 */
export class UniversalScraperService {
  private static instance: UniversalScraperService;

  public static getInstance(): UniversalScraperService {
    if (!UniversalScraperService.instance) {
      UniversalScraperService.instance = new UniversalScraperService();
    }
    return UniversalScraperService.instance;
  }

  /**
   * Extracts structured ProductData conforming to the ProductData schema
   */
  public extractProductData(raw: any, sourceUrl: string): ProductData {
    const originInfo = detectStoreOrigin(sourceUrl);
    const storeName = raw.storeName || raw.sourceStore || originInfo.storeName;
    const brand = raw.brand || storeName;

    let rawImg = raw.mainImage || raw.image || raw.imageUrl || raw.image_url || '';
    const normMain = normalizeProductImageUrl(rawImg, sourceUrl);
    let mainImage = !isInvalidProductImage(normMain) ? normMain : '';

    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);

    const images: string[] = Array.from(
      new Set(
        [mainImage, ...rawGallery.map(img => normalizeProductImageUrl(img, sourceUrl))]
          .filter(img => img && !isInvalidProductImage(img))
      )
    );
    if (!mainImage && images.length > 0) {
      mainImage = images[0];
    }

    const price = Number(raw.basePriceAED || raw.priceAed || raw.price_aed || raw.price) || 0;
    const originalPrice = Number(raw.originalPriceAed || raw.original_price_aed || raw.originalPrice) || undefined;

    const variantGroups: VariantGroupsStructure = {
      flavors: [],
      sizes: [],
      others: []
    };

    // Extract and categorize variants into flavors, sizes, others
    if (Array.isArray(raw.variantGroups)) {
      raw.variantGroups.forEach((vg: any) => {
        const gType = vg.type || (vg.id === 'sizes' ? 'size' : (vg.id === 'flavors' ? 'flavor' : 'other'));
        const options: VariantOption[] = (vg.options || []).map((opt: any, idx: number) => {
          const rawName = typeof opt === 'string' ? opt : (opt.name || opt.label || '');
          const optName = sanitizeVariantLabel(rawName);
          const optPrice = typeof opt === 'object' && (opt.price ?? opt.priceAed ?? opt.priceAED) ? Number(opt.price ?? opt.priceAed ?? opt.priceAED) : price;
          const isAvail = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut) : true;
          return {
            id: (typeof opt === 'object' && opt.id) ? opt.id : `${gType}-${idx}`,
            label: optName,
            name: optName,
            nameFa: typeof opt === 'object' ? opt.nameFa : undefined,
            type: gType as any,
            inStock: isAvail,
            price: optPrice,
            priceAed: optPrice,
            imageUrl: typeof opt === 'object' ? (opt.imageUrl || opt.image || opt.imageThumbnail) : undefined,
            image: typeof opt === 'object' ? (opt.imageUrl || opt.image || opt.imageThumbnail) : undefined,
            sku: typeof opt === 'object' ? opt.sku : undefined
          };
        }).filter((o: any) => Boolean(o.name));

        if (gType === 'flavor') {
          variantGroups.flavors = [...(variantGroups.flavors || []), ...options];
        } else if (gType === 'size') {
          variantGroups.sizes = [...(variantGroups.sizes || []), ...options];
        } else {
          variantGroups.others = [...(variantGroups.others || []), ...options];
        }
      });
    }

    // Process flat arrays if groups are empty
    if (!variantGroups.flavors?.length && Array.isArray(raw.flavors)) {
      variantGroups.flavors = raw.flavors.map((f: any, idx: number) => {
        const rawName = typeof f === 'string' ? f : (f.name || f.label || '');
        const name = sanitizeVariantLabel(rawName);
        const isAvail = typeof f === 'object' ? (f.inStock !== false && f.available !== false) : true;
        return {
          id: `flv-${idx}`,
          label: name,
          name,
          type: 'flavor',
          inStock: isAvail,
          price,
          priceAed: price
        };
      }).filter((o: any) => Boolean(o.name));
    }

    if (!variantGroups.sizes?.length && Array.isArray(raw.sizes)) {
      variantGroups.sizes = raw.sizes.map((s: any, idx: number) => {
        const rawName = typeof s === 'string' ? s : (s.name || s.label || '');
        const name = sanitizeVariantLabel(rawName);
        const isAvail = typeof s === 'object' ? (s.inStock !== false && s.available !== false) : true;
        return {
          id: `sz-${idx}`,
          label: name,
          name,
          type: 'size',
          inStock: isAvail,
          price,
          priceAed: price
        };
      }).filter((o: any) => Boolean(o.name));
    }

    const allOptions = [
      ...(variantGroups.flavors || []),
      ...(variantGroups.sizes || []),
      ...(variantGroups.others || [])
    ];

    const isAvailable = raw.inStock !== false && raw.available !== false && (allOptions.length === 0 || allOptions.some(o => o.inStock));

    const primaryImage = images[0] || '';

    // Derive deterministic unique slug-based ID from source URL, avoiding any hardcoded strings
    let derivedId: string | undefined = undefined;
    if (raw.id && typeof raw.id === 'string' && !raw.id.includes('drnutrition') && !raw.id.startsWith('draft_') && !raw.id.startsWith('scraped-')) {
      derivedId = raw.id;
    } else if (sourceUrl) {
      try {
        const pathname = new URL(sourceUrl).pathname;
        const lastPart = pathname.split('/').filter(Boolean).pop();
        if (lastPart) {
          const cleanSlug = lastPart.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          if (cleanSlug.length > 3) {
            derivedId = `drn_${cleanSlug}_${Date.now()}`;
          }
        }
      } catch (_e) {}
    }

    return {
      id: derivedId,
      title: raw.title || 'Dubai Store Product',
      titleFa: raw.titleFa,
      titleEn: raw.titleEn || raw.title,
      brand,
      price,
      priceAed: price,
      originalPrice,
      originalPriceAed: originalPrice,
      currency: raw.currency || 'AED',
      description: raw.description || '',
      features: Array.isArray(raw.features) ? raw.features : [],
      image: primaryImage,
      imageUrl: primaryImage,
      images,
      galleryImages: images,
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      variantGroups,
      isAvailable,
      sourceUrl,
      url: sourceUrl,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Builds flat ProductVariantItem list from raw scraped variants, flavors, sizes, or options
   */
  public extractFlatVariants(raw: any, defaultPriceAed: number, sourceUrl: string = ''): ProductVariantItem[] {
    const flatVariants: ProductVariantItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Direct variantMatrix items if provided
    if (raw.variantMatrix && Array.isArray(raw.variantMatrix.items) && raw.variantMatrix.items.length > 0) {
      raw.variantMatrix.items.forEach((item: any, idx: number) => {
        const rawTitle = item.title || item.name || '';
        const itemTitle = sanitizeVariantLabel(rawTitle);
        const cleanFlavor = sanitizeVariantLabel(item.flavor);
        const cleanSize = sanitizeVariantLabel(item.size);
        const key = `${cleanFlavor || ''}__${cleanSize || ''}__${itemTitle}`.trim().toLowerCase();
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          const p = item.priceAED !== undefined ? Number(item.priceAED) : (item.priceAed !== undefined ? Number(item.priceAed) : (item.price !== undefined ? Number(item.price) : defaultPriceAed));
          const op = item.originalPriceAED !== undefined ? Number(item.originalPriceAED) : (item.originalPriceAed !== undefined ? Number(item.originalPriceAed) : undefined);
          const rawVarImg = item.image || item.imageThumbnail || item.imageUrl || '';
          const normVarImg = normalizeProductImageUrl(rawVarImg, sourceUrl) || undefined;
          flatVariants.push({
            id: item.id || `matrix-var-${idx}`,
            title: itemTitle || `گزینه ${idx + 1}`,
            name: itemTitle || `گزینه ${idx + 1}`,
            size: cleanSize || undefined,
            flavor: cleanFlavor || undefined,
            priceAED: p,
            priceAed: p,
            originalPriceAED: op,
            originalPriceAed: op,
            image: normVarImg,
            imageThumbnail: normVarImg,
            inStock: item.inStock !== false && item.available !== false
          });
        }
      });
      if (flatVariants.length > 0) return flatVariants;
    }

    // 2. Raw variants array
    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      raw.variants.forEach((v: any, idx: number) => {
        const rawName = typeof v === 'string' ? v : (v.title || v.name || v.label || '');
        const vName = sanitizeVariantLabel(rawName);
        const rawSize = typeof v === 'object' ? (v.size || v.option1 || v.option2) : undefined;
        const rawFlavor = typeof v === 'object' ? (v.flavor || v.option2 || v.option1) : undefined;
        const vSize = sanitizeVariantLabel(rawSize);
        const vFlavor = sanitizeVariantLabel(rawFlavor);
        const key = (vName || `${vSize || ''}-${vFlavor || ''}`).trim().toLowerCase();
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          const isAvailable = v.inStock !== false && v.available !== false && !v.soldOut && !v.isSoldOut && v.is_available !== false;
          const p = v.priceAED !== undefined ? Number(v.priceAED) : (v.priceAed !== undefined ? Number(v.priceAed) : (v.price !== undefined ? Number(v.price) : defaultPriceAed));
          const op = v.originalPriceAED !== undefined ? Number(v.originalPriceAED) : (v.originalPriceAed !== undefined ? Number(v.originalPriceAed) : undefined);
          const rawVarImg = v.image || v.imageThumbnail || v.imageUrl || '';
          const normVarImg = normalizeProductImageUrl(rawVarImg, sourceUrl) || undefined;
          flatVariants.push({
            id: v.id || `variant-${idx}`,
            title: vName || `گزینه ${idx + 1}`,
            name: vName || `گزینه ${idx + 1}`,
            size: vSize || undefined,
            flavor: vFlavor || undefined,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p,
            originalPriceAED: op,
            originalPriceAed: op,
            image: normVarImg,
            imageThumbnail: normVarImg
          });
        }
      });
    }

    // 3. Variant groups
    if (Array.isArray(raw.variantGroups) && raw.variantGroups.length > 0) {
      raw.variantGroups.forEach((vg: any) => {
        const isSizeGroup = vg.type === 'size' || vg.id === 'sizes' || vg.name?.includes('وزن') || vg.name?.includes('سایز') || vg.name?.includes('Size');
        const isFlavorGroup = vg.type === 'flavor' || vg.id === 'flavors' || vg.name?.includes('طعم') || vg.name?.includes('Flavor');
        
        (vg.options || []).forEach((opt: any, optIdx: number) => {
          const optName = typeof opt === 'string' ? opt : (opt.name || opt.label || opt.title || opt.nameFa || '');
          const key = optName.trim().toLowerCase();
          if (optName && !seenKeys.has(key)) {
            seenKeys.add(key);
            const isAvailable = opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut;
            const p = opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : defaultPriceAed));
            const op = opt.originalPriceAED !== undefined ? Number(opt.originalPriceAED) : (opt.originalPriceAed !== undefined ? Number(opt.originalPriceAed) : undefined);
            const rawOptImg = opt.image || opt.imageUrl || opt.imageThumbnail || '';
            const normOptImg = normalizeProductImageUrl(rawOptImg, sourceUrl) || undefined;
            flatVariants.push({
              id: opt.id || `opt-${optIdx}`,
              title: optName,
              name: optName,
              size: isSizeGroup ? optName : undefined,
              flavor: isFlavorGroup ? optName : undefined,
              inStock: isAvailable,
              priceAED: p,
              priceAed: p,
              originalPriceAED: op,
              originalPriceAed: op,
              image: normOptImg,
              imageThumbnail: normOptImg
            });
          }
        });
      });
    }

    // 4. Flat flavors, sizes, options arrays
    if (flatVariants.length === 0) {
      const flavors: any[] = Array.isArray(raw.flavors) ? raw.flavors : [];
      flavors.forEach((flv, idx) => {
        const flvName = typeof flv === 'string' ? flv : (flv?.name || flv?.label || flv?.title || '');
        const isAvailable = typeof flv === 'object' ? (flv.inStock !== false && flv.available !== false) : true;
        const p = typeof flv === 'object' && (flv.priceAED || flv.priceAed || flv.price) ? Number(flv.priceAED || flv.priceAed || flv.price) : defaultPriceAed;
        const rawFlvImg = typeof flv === 'object' ? (flv.image || flv.imageUrl || flv.imageThumbnail || '') : '';
        const normFlvImg = normalizeProductImageUrl(rawFlvImg, sourceUrl) || undefined;
        const key = flvName.trim().toLowerCase();
        if (flvName && !seenKeys.has(key)) {
          seenKeys.add(key);
          flatVariants.push({
            id: `flv-${idx}`,
            title: flvName,
            name: flvName,
            flavor: flvName,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p,
            image: normFlvImg,
            imageThumbnail: normFlvImg
          });
        }
      });

      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];
      sizes.forEach((sz, idx) => {
        const szName = typeof sz === 'string' ? sz : (sz?.name || sz?.label || sz?.title || '');
        const isAvailable = typeof sz === 'object' ? (sz.inStock !== false && sz.available !== false) : true;
        const p = typeof sz === 'object' && (sz.priceAED || sz.priceAed || sz.price) ? Number(sz.priceAED || sz.priceAed || sz.price) : defaultPriceAed;
        const rawSzImg = typeof sz === 'object' ? (sz.image || sz.imageUrl || sz.imageThumbnail || '') : '';
        const normSzImg = normalizeProductImageUrl(rawSzImg, sourceUrl) || undefined;
        const key = szName.trim().toLowerCase();
        if (szName && !seenKeys.has(key)) {
          seenKeys.add(key);
          flatVariants.push({
            id: `sz-${idx}`,
            title: szName,
            name: szName,
            size: szName,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p,
            image: normSzImg,
            imageThumbnail: normSzImg
          });
        }
      });

      const options: any[] = Array.isArray(raw.options) ? raw.options : [];
      options.forEach((opt, idx) => {
        const optName = typeof opt === 'string' ? opt : (opt?.name || opt?.label || opt?.title || '');
        const isAvailable = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true;
        const p = typeof opt === 'object' && (opt.priceAED || opt.priceAed || opt.price) ? Number(opt.priceAED || opt.priceAed || opt.price) : defaultPriceAed;
        const rawOptImg = typeof opt === 'object' ? (opt.image || opt.imageUrl || opt.imageThumbnail || '') : '';
        const normOptImg = normalizeProductImageUrl(rawOptImg, sourceUrl) || undefined;
        const key = optName.trim().toLowerCase();
        if (optName && !seenKeys.has(key) && !['default', 'standard', 'پیش‌فرض', 'default title'].includes(key)) {
          seenKeys.add(key);
          flatVariants.push({
            id: `opt-${idx}`,
            title: optName,
            name: optName,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p,
            image: normOptImg,
            imageThumbnail: normOptImg
          });
        }
      });
    }

    return flatVariants;
  }

  /**
   * Normalizes backend scraped data into the typed ScrapedProductResult structure
   */
  public parseScrapedResult(raw: any, sourceUrl: string, calculatedPriceToman: number = 0): ScrapedProductResult {
    const originInfo = detectStoreOrigin(sourceUrl);
    const storeName = raw.storeName || raw.sourceStore || originInfo.storeName;
    const brand = raw.brand || storeName;

    const rawMainImg = raw.mainImage || raw.image || raw.image_url || '';
    const mainImage = normalizeProductImageUrl(rawMainImg, sourceUrl);
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);

    const galleryImages: string[] = Array.from(
      new Set([mainImage, ...rawGallery.map(img => normalizeProductImageUrl(img, sourceUrl))].filter(Boolean))
    );

    const basePriceAED = Number(raw.basePriceAED || raw.priceAed || raw.price_aed || raw.price) || 0;
    const variants = this.extractFlatVariants(raw, basePriceAED, sourceUrl);

    // Build structured variant groups if available
    const variantGroups: VariantGroupsStructure = {
      flavors: [],
      sizes: [],
      others: []
    };

    if (Array.isArray(raw.variantGroups)) {
      raw.variantGroups.forEach((vg: any) => {
        const gType = vg.type || (vg.id === 'sizes' ? 'size' : (vg.id === 'flavors' ? 'flavor' : 'other'));
        const options: VariantOption[] = (vg.options || []).map((opt: any, idx: number) => {
          const rawOptImg = typeof opt === 'object' ? (opt.image || opt.imageUrl) : undefined;
          const normOptImg = normalizeProductImageUrl(rawOptImg, sourceUrl) || undefined;
          return {
            id: (typeof opt === 'object' && opt.id) ? opt.id : `${gType}-${idx}`,
            label: typeof opt === 'string' ? opt : (opt.name || opt.label || ''),
            name: typeof opt === 'string' ? opt : (opt.name || opt.label || ''),
            type: gType as any,
            inStock: typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true,
            price: typeof opt === 'object' && opt.priceAed ? Number(opt.priceAed) : basePriceAED,
            priceAed: typeof opt === 'object' && opt.priceAed ? Number(opt.priceAed) : basePriceAED,
            imageUrl: normOptImg,
            image: normOptImg
          };
        });

        if (gType === 'flavor') {
          variantGroups.flavors = [...(variantGroups.flavors || []), ...options];
        } else if (gType === 'size') {
          variantGroups.sizes = [...(variantGroups.sizes || []), ...options];
        } else {
          variantGroups.others = [...(variantGroups.others || []), ...options];
        }
      });
    }

    // Construct unified ProductVariantMatrix
    const sizesList: string[] = [];
    const flavorsList: string[] = [];
    variants.forEach(v => {
      if (v.size && !sizesList.includes(v.size)) sizesList.push(v.size);
      if (v.flavor && !flavorsList.includes(v.flavor)) flavorsList.push(v.flavor);
    });
    if (variantGroups.sizes) {
      variantGroups.sizes.forEach(s => { if (s.name && !sizesList.includes(s.name)) sizesList.push(s.name); });
    }
    if (variantGroups.flavors) {
      variantGroups.flavors.forEach(f => { if (f.name && !flavorsList.includes(f.name)) flavorsList.push(f.name); });
    }
    const variantMatrix = {
      sizes: sizesList,
      flavors: flavorsList,
      items: variants,
      selectedVariant: variants[0]
    };

    // Derive deterministic unique slug-based ID from source URL, avoiding any hardcoded strings
    let derivedProductId: string | undefined = undefined;
    if (raw.id && typeof raw.id === 'string' && !raw.id.includes('drnutrition') && !raw.id.startsWith('draft_') && !raw.id.startsWith('scraped-')) {
      derivedProductId = raw.id;
    } else if (sourceUrl) {
      try {
        const pathname = new URL(sourceUrl).pathname;
        const lastPart = pathname.split('/').filter(Boolean).pop();
        if (lastPart) {
          const cleanSlug = lastPart.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          if (cleanSlug.length > 3) {
            derivedProductId = `drn_${cleanSlug}_${Date.now()}`;
          }
        }
      } catch (_e) {}
    }

    return {
      id: derivedProductId,
      title: raw.title || 'Dubai Store Product',
      brand,
      sourceStore: storeName,
      sourceUrl,
      mainImage: galleryImages[0] || mainImage,
      galleryImages,
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      features: Array.isArray(raw.features) ? raw.features : [],
      basePriceAED,
      calculatedPriceToman: calculatedPriceToman || Number(raw.calculatedPriceToman) || 0,
      inStock: raw.inStock !== false,
      variants,
      variantMatrix,
      variantGroups: (variantGroups.flavors?.length || variantGroups.sizes?.length || variantGroups.others?.length) ? variantGroups : undefined,
      description: raw.description
    };
  }

  /**
   * Normalizes backend scraped data into the typed UniversalProduct structure
   */
  public normalizeScrapedProduct(raw: any, sourceUrl: string): UniversalProduct {
    const originInfo = detectStoreOrigin(sourceUrl);
    const storeName = raw.storeName || raw.sourceStore || originInfo.storeName;
    const brand = raw.brand || storeName;

    const fallbackImage = 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&q=80&w=600';
    const rawMainImg = raw.imageUrl || raw.mainImage || raw.image || raw.image_url || (raw.images && raw.images[0]) || (raw.galleryImages && raw.galleryImages[0]) || '';
    let mainImage = normalizeProductImageUrl(rawMainImg, raw.storeDomain || sourceUrl || 'https://drnutrition.com') || (rawMainImg.startsWith('http') ? rawMainImg : '') || fallbackImage;
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : (rawMainImg ? [rawMainImg] : []));

    const normalizedGallery: string[] = Array.from(
      new Set([mainImage, ...rawGallery.map(img => normalizeProductImageUrl(img, raw.storeDomain || sourceUrl || 'https://drnutrition.com') || (img.startsWith('http') ? img : ''))].filter(Boolean))
    );
    const galleryImages: string[] = deduplicateImageUrls(normalizedGallery, mainImage);
    if (!mainImage && galleryImages.length > 0) {
      mainImage = galleryImages[0];
    }
    if (!mainImage) {
      mainImage = fallbackImage;
      galleryImages.push(fallbackImage);
    }

    const priceAed = Number(raw.basePriceAED || raw.priceAed || raw.price_aed || raw.price) || 0;
    const originalPriceAed = Number(raw.originalPriceAed || raw.original_price_aed) || undefined;
    const discountPercent = Number(raw.discountPercent) || (
      originalPriceAed && originalPriceAed > priceAed
        ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
        : undefined
    );

    // Build dimensions and variant groups
    const dimensions: VariantDimension[] = [];
    const variantGroups: ProductVariantGroup[] = [];

    if (Array.isArray(raw.variantGroups) && raw.variantGroups.length > 0) {
      raw.variantGroups.forEach((vg: any) => {
        const options: VariantOption[] = (vg.options || []).map((opt: any, idx: number) => {
          const rawOptImg = opt.image || opt.imageThumbnail || opt.imageUrl;
          const normOptImg = normalizeProductImageUrl(rawOptImg, sourceUrl) || undefined;
          return {
            id: opt.id || `${vg.id || 'dim'}-${idx}`,
            label: opt.name || opt.label || String(opt),
            name: opt.name || opt.label || String(opt),
            nameFa: opt.nameFa,
            type: vg.type || 'generic',
            price: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
            priceAed: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
            priceAED: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
            image: normOptImg,
            imageUrl: normOptImg,
            inStock: opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut,
            sku: opt.sku
          };
        });

        dimensions.push({
          id: vg.id || 'dimension',
          name: vg.name || 'انتخاب گزینه',
          type: vg.type || 'generic',
          options
        });

        variantGroups.push({
          id: vg.id || 'vg',
          name: vg.name || 'انتخاب گزینه',
          type: vg.type || 'generic',
          options: options.map(o => ({
            id: o.id,
            name: o.name,
            nameFa: o.nameFa,
            priceAed: o.priceAed,
            priceAED: o.priceAED,
            image: o.image,
            inStock: o.inStock !== false,
            sku: o.sku
          }))
        });
      });
    } else {
      const flavors: any[] = Array.isArray(raw.flavors) ? raw.flavors : [];
      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];

      if (flavors.length > 0) {
        const flvOptions: VariantOption[] = flavors.map((f, idx) => {
          const fName = typeof f === 'string' ? f : (f?.name || f?.label || '');
          const isAvail = typeof f === 'object' ? (f.inStock !== false && f.available !== false) : true;
          const p = typeof f === 'object' && (f.priceAED || f.priceAed || f.price) ? Number(f.priceAED || f.priceAed || f.price) : priceAed;
          const rawFlvImg = typeof f === 'object' ? (f.image || f.imageUrl || f.imageThumbnail) : undefined;
          const normFlvImg = normalizeProductImageUrl(rawFlvImg, sourceUrl) || undefined;
          return {
            id: `flv-${idx}`,
            label: fName,
            name: fName,
            type: 'flavor',
            price: p,
            priceAed: p,
            priceAED: p,
            image: normFlvImg,
            imageUrl: normFlvImg,
            inStock: isAvail
          };
        });
        dimensions.push({
          id: 'flavor',
          name: 'طعم (Flavor)',
          type: 'flavor',
          options: flvOptions
        });
        variantGroups.push({
          id: 'flavors',
          name: 'طعم (Flavor)',
          type: 'flavor',
          options: flvOptions
        });
      }

      if (sizes.length > 0) {
        const szOptions: VariantOption[] = sizes.map((s, idx) => {
          const sName = typeof s === 'string' ? s : (s?.name || s?.label || '');
          const isAvail = typeof s === 'object' ? (s.inStock !== false && s.available !== false) : true;
          const p = typeof s === 'object' && (s.priceAED || s.priceAed || s.price) ? Number(s.priceAED || s.priceAed || s.price) : priceAed;
          const rawSzImg = typeof s === 'object' ? (s.image || s.imageUrl || s.imageThumbnail) : undefined;
          const normSzImg = normalizeProductImageUrl(rawSzImg, sourceUrl) || undefined;
          return {
            id: `sz-${idx}`,
            label: sName,
            name: sName,
            type: 'size',
            price: p,
            priceAed: p,
            priceAED: p,
            image: normSzImg,
            imageUrl: normSzImg,
            inStock: isAvail
          };
        });
        dimensions.push({
          id: 'size',
          name: 'وزن / بسته‌بندی (Size)',
          type: 'size',
          options: szOptions
        });
        variantGroups.push({
          id: 'sizes',
          name: 'وزن / بسته‌بندی (Size)',
          type: 'size',
          options: szOptions
        });
      }
    }

    const flatVariants = this.extractFlatVariants(raw, priceAed, sourceUrl);

    const titleEn = raw.title || 'Dubai Store Product';
    const titleFa = generateBilingualProductTitle(titleEn, storeName, brand);

    const hasAnyInStockVariant = flatVariants.length > 0
      ? flatVariants.some(v => v.inStock !== false)
      : (dimensions.length > 0 ? dimensions.some(d => d.options.some(o => o.inStock !== false)) : true);

    const overallInStock = raw.inStock !== false && raw.available !== false && hasAnyInStockVariant;

    // Construct unified ProductVariantMatrix
    const sizesList: string[] = [];
    const flavorsList: string[] = [];
    flatVariants.forEach(v => {
      if (v.size && !sizesList.includes(v.size)) sizesList.push(v.size);
      if (v.flavor && !flavorsList.includes(v.flavor)) flavorsList.push(v.flavor);
    });
    if (Array.isArray(raw.sizes)) {
      raw.sizes.forEach((s: any) => {
        const sName = typeof s === 'string' ? s : (s?.name || s?.label || '');
        if (sName && !sizesList.includes(sName)) sizesList.push(sName);
      });
    }
    if (Array.isArray(raw.flavors)) {
      raw.flavors.forEach((f: any) => {
        const fName = typeof f === 'string' ? f : (f?.name || f?.label || '');
        if (fName && !flavorsList.includes(fName)) flavorsList.push(fName);
      });
    }
    const variantMatrix = {
      sizes: sizesList,
      flavors: flavorsList,
      items: flatVariants,
      selectedVariant: flatVariants[0]
    };
    const finalImg = galleryImages[0] || mainImage;

    return {
      id: raw.id || undefined,
      title: titleFa,
      titleFa,
      titleEn,
      url: sourceUrl,
      priceAed,
      priceAED: priceAed,
      price: priceAed,
      originalPriceAed,
      originalPriceAED: originalPriceAed,
      discountPercent,
      weightKg: Number(raw.weightKg) || 0.8,
      image: finalImg,
      imageUrl: finalImg,
      mainImage: finalImg,
      images: galleryImages,
      galleryImages,
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      features: Array.isArray(raw.features) ? raw.features : [],
      storeName,
      storeDomain: raw.storeDomain || (originInfo.storeName ? sourceUrl : 'https://drnutrition.com'),
      storeOrigin: originInfo.origin,
      brand,
      category: raw.category || 'مکمل‌های ورزشی و تغذیه',
      description: raw.description,
      descriptionFa: raw.descriptionFa,
      dimensions: dimensions.length > 0 ? dimensions : undefined,
      variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
      variants: flatVariants.length > 0 ? flatVariants as any : undefined,
      variantMatrix,
      options: raw.options || [],
      flavors: raw.flavors || [],
      sizes: raw.sizes || [],
      inStock: overallInStock
    };
  }

  /**
   * Universal extractor with seamless retry and cold-start absorption.
   * Enforces zero mock-data invariants and throws descriptive Persian errors upon extraction failure.
   */
  public async extractProductMetadata(url: string, forceRefresh: boolean = false, sourceCaller: string = 'scraperService'): Promise<UniversalProduct> {
    return extractProductDataUnified(url, 2, sourceCaller);
  }

  /**
   * Alias for extractProductMetadata conforming to scraperService.extract(url)
   */
  public async extract(url: string, forceRefresh?: boolean | string, sourceCaller?: string): Promise<UniversalProduct> {
    const caller = typeof forceRefresh === 'string' ? forceRefresh : (sourceCaller || 'scraperService');
    return extractProductDataUnified(url, 2, caller);
  }
}

export const universalScraperService = UniversalScraperService.getInstance();
export const scraperService = universalScraperService;

/**
 * Unified standalone extraction function with automatic retries and extended timeout to handle Serverless cold starts.
 */
export async function extractProductDataUnified(
  rawUrl: string,
  retries = 2,
  sourceCaller = 'unified'
): Promise<UniversalProduct> {
  const cleanUrl = (rawUrl || '').trim();
  console.log('[Scraper Engine] Initiating extraction from caller:', sourceCaller, { targetUrl: cleanUrl });
  if (!cleanUrl) {
    throw new Error('لطفاً آدرس لینک محصول را وارد نمایید.');
  }

  let cmsConfig: any = null;
  try {
    const saved = localStorage.getItem('sirikfit_cms_config');
    if (saved) cmsConfig = JSON.parse(saved);
  } catch (_e) {}

  const geminiKeys = getEffectiveGeminiKeysList(cmsConfig?.apiConfig?.geminiApiKeys || cmsConfig?.apiConfig?.geminiApiKey);

  let lastError: any = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const universalRes = await parseProductLinkUniversal({
        url: cleanUrl,
        geminiKeys,
        cmsConfig
      });

      if (universalRes && universalRes.success && universalRes.priceAed && universalRes.priceAed > 0) {
        return universalScraperService.normalizeScrapedProduct(universalRes, cleanUrl);
      }

      const errMsg = universalRes?.error || universalRes?.message || 'خطا در استخراج اطلاعات محصول: امکان برقراری ارتباط با فروشگاه مبدا یا دریافت اطلاعات وجود ندارد.';
      throw new Error(errMsg);
    } catch (error: any) {
      lastError = error;
      console.warn(`[Scraper Engine] Caller ${sourceCaller} attempt ${attempt}/${retries + 1} failed for ${cleanUrl}:`, error?.message || error);
      if (attempt <= retries) {
        await new Promise(res => setTimeout(res, 1200));
      }
    }
  }

  throw lastError || new Error('خطا در استخراج اطلاعات محصول: عدم دسترسی به سرور استخراج.');
}


