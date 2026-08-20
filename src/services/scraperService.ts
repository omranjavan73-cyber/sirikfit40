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
import { generateBilingualProductTitle } from '../utils/parseLink';
import { GncAdapter } from './GncAdapter';
import { DrNutritionAdapter } from './DrNutritionAdapter';
import { GncParser } from './gncParser';
import { DrNutritionParser } from './drNutritionParser';

export { GncAdapter, DrNutritionAdapter, GncParser, DrNutritionParser };

export interface ScraperAdapter {
  storeName: string;
  storeOrigin?: string;
  canHandle(url: string): boolean;
  parse(url: string, rawHtml?: string, rawData?: any): Promise<UniversalProduct | null>;
}

export function detectStoreOrigin(url: string): { storeName: string; origin: string; flag: string } {
  const lower = (url || '').toLowerCase();
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

    const mainImage = raw.mainImage || raw.image || raw.image_url || '';
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);

    const images: string[] = Array.from(
      new Set([mainImage, ...rawGallery].filter(Boolean))
    );

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
          const optName = typeof opt === 'string' ? opt : (opt.name || opt.label || '');
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

    // Process flat arrays if groups are empty
    if (!variantGroups.flavors?.length && Array.isArray(raw.flavors)) {
      variantGroups.flavors = raw.flavors.map((f: any, idx: number) => {
        const name = typeof f === 'string' ? f : (f.name || f.label || '');
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
      });
    }

    if (!variantGroups.sizes?.length && Array.isArray(raw.sizes)) {
      variantGroups.sizes = raw.sizes.map((s: any, idx: number) => {
        const name = typeof s === 'string' ? s : (s.name || s.label || '');
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
      });
    }

    const allOptions = [
      ...(variantGroups.flavors || []),
      ...(variantGroups.sizes || []),
      ...(variantGroups.others || [])
    ];

    const isAvailable = raw.inStock !== false && raw.available !== false && (allOptions.length === 0 || allOptions.some(o => o.inStock));

    return {
      title: raw.title || 'Dubai Store Product',
      brand,
      price,
      originalPrice,
      currency: raw.currency || 'AED',
      description: raw.description || '',
      features: Array.isArray(raw.features) ? raw.features : [],
      images,
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      variantGroups,
      isAvailable,
      sourceUrl
    };
  }

  /**
   * Builds flat ProductVariantItem list from raw scraped variants, flavors, sizes, or options
   */
  public extractFlatVariants(raw: any, defaultPriceAed: number): ProductVariantItem[] {
    const flatVariants: ProductVariantItem[] = [];
    const seenKeys = new Set<string>();

    // 1. Direct variantMatrix items if provided
    if (raw.variantMatrix && Array.isArray(raw.variantMatrix.items) && raw.variantMatrix.items.length > 0) {
      raw.variantMatrix.items.forEach((item: any, idx: number) => {
        const itemTitle = item.title || item.name || '';
        const key = `${item.flavor || ''}__${item.size || ''}__${itemTitle}`.trim().toLowerCase();
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          const p = item.priceAED !== undefined ? Number(item.priceAED) : (item.priceAed !== undefined ? Number(item.priceAed) : (item.price !== undefined ? Number(item.price) : defaultPriceAed));
          const op = item.originalPriceAED !== undefined ? Number(item.originalPriceAED) : (item.originalPriceAed !== undefined ? Number(item.originalPriceAed) : undefined);
          flatVariants.push({
            id: item.id || `matrix-var-${idx}`,
            title: itemTitle || `گزینه ${idx + 1}`,
            name: itemTitle || `گزینه ${idx + 1}`,
            size: item.size,
            flavor: item.flavor,
            priceAED: p,
            priceAed: p,
            originalPriceAED: op,
            originalPriceAed: op,
            image: item.image || item.imageThumbnail || item.imageUrl,
            imageThumbnail: item.imageThumbnail || item.image || item.imageUrl,
            inStock: item.inStock !== false && item.available !== false
          });
        }
      });
      if (flatVariants.length > 0) return flatVariants;
    }

    // 2. Raw variants array
    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      raw.variants.forEach((v: any, idx: number) => {
        const vName = typeof v === 'string' ? v : (v.title || v.name || v.label || '');
        const vSize = typeof v === 'object' ? (v.size || v.option1 || v.option2) : undefined;
        const vFlavor = typeof v === 'object' ? (v.flavor || v.option2 || v.option1) : undefined;
        const key = (vName || `${vSize || ''}-${vFlavor || ''}`).trim().toLowerCase();
        if (key && !seenKeys.has(key)) {
          seenKeys.add(key);
          const isAvailable = v.inStock !== false && v.available !== false && !v.soldOut && !v.isSoldOut && v.is_available !== false;
          const p = v.priceAED !== undefined ? Number(v.priceAED) : (v.priceAed !== undefined ? Number(v.priceAed) : (v.price !== undefined ? Number(v.price) : defaultPriceAed));
          const op = v.originalPriceAED !== undefined ? Number(v.originalPriceAED) : (v.originalPriceAed !== undefined ? Number(v.originalPriceAed) : undefined);
          flatVariants.push({
            id: v.id || `variant-${idx}`,
            title: vName || `گزینه ${idx + 1}`,
            name: vName || `گزینه ${idx + 1}`,
            size: vSize,
            flavor: vFlavor,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p,
            originalPriceAED: op,
            originalPriceAed: op,
            image: v.image || v.imageThumbnail || v.imageUrl,
            imageThumbnail: v.imageThumbnail || v.imageUrl || v.image || undefined
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
              image: opt.image || opt.imageUrl || undefined,
              imageThumbnail: opt.image || opt.imageUrl || undefined
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
            priceAed: p
          });
        }
      });

      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];
      sizes.forEach((sz, idx) => {
        const szName = typeof sz === 'string' ? sz : (sz?.name || sz?.label || sz?.title || '');
        const isAvailable = typeof sz === 'object' ? (sz.inStock !== false && sz.available !== false) : true;
        const p = typeof sz === 'object' && (sz.priceAED || sz.priceAed || sz.price) ? Number(sz.priceAED || sz.priceAed || sz.price) : defaultPriceAed;
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
            priceAed: p
          });
        }
      });

      const options: any[] = Array.isArray(raw.options) ? raw.options : [];
      options.forEach((opt, idx) => {
        const optName = typeof opt === 'string' ? opt : (opt?.name || opt?.label || opt?.title || '');
        const isAvailable = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true;
        const p = typeof opt === 'object' && (opt.priceAED || opt.priceAed || opt.price) ? Number(opt.priceAED || opt.priceAed || opt.price) : defaultPriceAed;
        const key = optName.trim().toLowerCase();
        if (optName && !seenKeys.has(key) && !['default', 'standard', 'پیش‌فرض', 'default title'].includes(key)) {
          seenKeys.add(key);
          flatVariants.push({
            id: `opt-${idx}`,
            title: optName,
            name: optName,
            inStock: isAvailable,
            priceAED: p,
            priceAed: p
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

    const mainImage = raw.mainImage || raw.image || raw.image_url || '';
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);

    const galleryImages: string[] = Array.from(
      new Set([mainImage, ...rawGallery].filter(Boolean))
    );

    const basePriceAED = Number(raw.basePriceAED || raw.priceAed || raw.price_aed || raw.price) || 0;
    const variants = this.extractFlatVariants(raw, basePriceAED);

    // Build structured variant groups if available
    const variantGroups: VariantGroupsStructure = {
      flavors: [],
      sizes: [],
      others: []
    };

    if (Array.isArray(raw.variantGroups)) {
      raw.variantGroups.forEach((vg: any) => {
        const gType = vg.type || (vg.id === 'sizes' ? 'size' : (vg.id === 'flavors' ? 'flavor' : 'other'));
        const options: VariantOption[] = (vg.options || []).map((opt: any, idx: number) => ({
          id: (typeof opt === 'object' && opt.id) ? opt.id : `${gType}-${idx}`,
          label: typeof opt === 'string' ? opt : (opt.name || opt.label || ''),
          name: typeof opt === 'string' ? opt : (opt.name || opt.label || ''),
          type: gType as any,
          inStock: typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true,
          price: typeof opt === 'object' && opt.priceAed ? Number(opt.priceAed) : basePriceAED,
          priceAed: typeof opt === 'object' && opt.priceAed ? Number(opt.priceAed) : basePriceAED,
          imageUrl: typeof opt === 'object' ? (opt.image || opt.imageUrl) : undefined,
          image: typeof opt === 'object' ? (opt.image || opt.imageUrl) : undefined
        }));

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

    return {
      id: raw.id || `scraped-${Date.now()}`,
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

    const mainImage = raw.mainImage || raw.image || raw.image_url || '';
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);

    const galleryImages: string[] = Array.from(
      new Set([mainImage, ...rawGallery].filter(Boolean))
    );

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
        const options: VariantOption[] = (vg.options || []).map((opt: any, idx: number) => ({
          id: opt.id || `${vg.id || 'dim'}-${idx}`,
          label: opt.name || opt.label || String(opt),
          name: opt.name || opt.label || String(opt),
          nameFa: opt.nameFa,
          type: vg.type || 'generic',
          price: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
          priceAed: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
          priceAED: opt.priceAED !== undefined ? Number(opt.priceAED) : (opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed)),
          image: opt.image || opt.imageThumbnail || opt.imageUrl,
          imageUrl: opt.imageUrl || opt.image || opt.imageThumbnail,
          inStock: opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut,
          sku: opt.sku
        }));

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
          return {
            id: `flv-${idx}`,
            label: fName,
            name: fName,
            type: 'flavor',
            price: p,
            priceAed: p,
            priceAED: p,
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
          return {
            id: `sz-${idx}`,
            label: sName,
            name: sName,
            type: 'size',
            price: p,
            priceAed: p,
            priceAED: p,
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

    const flatVariants = this.extractFlatVariants(raw, priceAed);

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

    return {
      title: titleFa,
      titleFa,
      titleEn,
      url: sourceUrl,
      priceAed,
      originalPriceAed,
      discountPercent,
      weightKg: Number(raw.weightKg) || 0.8,
      image: galleryImages[0] || mainImage,
      images: galleryImages,
      galleryImages,
      videos: Array.isArray(raw.videos) ? raw.videos : [],
      features: Array.isArray(raw.features) ? raw.features : [],
      storeName,
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
}

export const universalScraperService = UniversalScraperService.getInstance();

