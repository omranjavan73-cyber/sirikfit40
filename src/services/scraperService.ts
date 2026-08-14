import type { UniversalProduct, VariantDimension, VariantOption, ProductVariantGroup, ScrapedProductResult, ProductVariantItem } from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';

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
   * Builds flat ProductVariantItem list from raw scraped variants, flavors, sizes, or options
   */
  public extractFlatVariants(raw: any, defaultPriceAed: number): ProductVariantItem[] {
    const flatVariants: ProductVariantItem[] = [];
    const seenNames = new Set<string>();

    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      raw.variants.forEach((v: any, idx: number) => {
        const vName = typeof v === 'string' ? v : (v.name || v.title || '');
        if (vName && !seenNames.has(vName.trim().toLowerCase())) {
          const isAvailable = v.inStock !== false && 
                              v.available !== false && 
                              !v.soldOut && 
                              !v.isSoldOut && 
                              v.is_available !== false &&
                              (v.inventory_quantity === undefined || v.inventory_quantity > 0);
          if (!isAvailable) {
            return;
          }
          seenNames.add(vName.trim().toLowerCase());
          flatVariants.push({
            id: v.id || `variant-${idx}`,
            name: vName,
            inStock: true,
            priceAED: v.priceAED !== undefined ? Number(v.priceAED) : (v.priceAed !== undefined ? Number(v.priceAed) : defaultPriceAed),
            imageThumbnail: v.imageThumbnail || v.image || undefined
          });
        }
      });
    }

    if (Array.isArray(raw.variantGroups) && raw.variantGroups.length > 0) {
      raw.variantGroups.forEach((vg: any) => {
        (vg.options || []).forEach((opt: any, optIdx: number) => {
          const optName = typeof opt === 'string' ? opt : (opt.name || opt.nameFa || '');
          if (optName && !seenNames.has(optName.trim().toLowerCase())) {
            const isAvailable = opt.inStock !== false && 
                                opt.available !== false && 
                                !opt.soldOut && 
                                !opt.isSoldOut &&
                                (opt.inventory_quantity === undefined || opt.inventory_quantity > 0);
            if (!isAvailable) {
              return;
            }
            seenNames.add(optName.trim().toLowerCase());
            flatVariants.push({
              id: opt.id || `opt-${optIdx}`,
              name: optName,
              inStock: true,
              priceAED: opt.priceAed !== undefined ? Number(opt.priceAed) : defaultPriceAed,
              imageThumbnail: opt.image || undefined
            });
          }
        });
      });
    }

    if (flatVariants.length === 0) {
      const flavors: any[] = Array.isArray(raw.flavors) ? raw.flavors : [];
      flavors.forEach((flv, idx) => {
        const flvName = typeof flv === 'string' ? flv : (flv?.name || '');
        const isAvailable = typeof flv === 'object' ? (flv.inStock !== false && flv.available !== false && !flv.soldOut && !flv.isSoldOut) : true;
        if (!isAvailable) return;
        if (flvName && !seenNames.has(flvName.trim().toLowerCase())) {
          seenNames.add(flvName.trim().toLowerCase());
          flatVariants.push({
            id: `flv-${idx}`,
            name: flvName,
            inStock: true,
            priceAED: defaultPriceAed
          });
        }
      });

      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];
      sizes.forEach((sz, idx) => {
        const szName = typeof sz === 'string' ? sz : (sz?.name || '');
        const isAvailable = typeof sz === 'object' ? (sz.inStock !== false && sz.available !== false && !sz.soldOut && !sz.isSoldOut) : true;
        if (!isAvailable) return;
        if (szName && !seenNames.has(szName.trim().toLowerCase())) {
          seenNames.add(szName.trim().toLowerCase());
          flatVariants.push({
            id: `sz-${idx}`,
            name: szName,
            inStock: true,
            priceAED: defaultPriceAed
          });
        }
      });

      const options: any[] = Array.isArray(raw.options) ? raw.options : [];
      options.forEach((opt, idx) => {
        const optName = typeof opt === 'string' ? opt : (opt?.name || '');
        const isAvailable = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut) : true;
        if (!isAvailable) return;
        if (optName && !seenNames.has(optName.trim().toLowerCase()) && !['default', 'standard', 'پیش‌فرض'].includes(optName.trim().toLowerCase())) {
          seenNames.add(optName.trim().toLowerCase());
          flatVariants.push({
            id: `opt-${idx}`,
            name: optName,
            inStock: true,
            priceAED: defaultPriceAed
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

    return {
      id: raw.id || `scraped-${Date.now()}`,
      title: raw.title || 'Dubai Store Product',
      brand,
      sourceStore: storeName,
      sourceUrl,
      mainImage: galleryImages[0] || mainImage,
      galleryImages,
      basePriceAED,
      calculatedPriceToman: calculatedPriceToman || Number(raw.calculatedPriceToman) || 0,
      inStock: raw.inStock !== false,
      variants,
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
        const options: VariantOption[] = (vg.options || [])
          .map((opt: any, idx: number) => ({
            id: opt.id || `${vg.id || 'dim'}-${idx}`,
            name: opt.name || String(opt),
            nameFa: opt.nameFa,
            priceAed: opt.priceAed !== undefined ? Number(opt.priceAed) : priceAed,
            image: opt.image || opt.imageThumbnail,
            inStock: opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut,
            sku: opt.sku
          }))
          .filter((o: VariantOption) => o.inStock !== false);

        if (options.length > 0) {
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
              image: o.image,
              inStock: true,
              sku: o.sku
            }))
          });
        }
      });
    } else {
      const flavors: any[] = Array.isArray(raw.flavors) ? raw.flavors : [];
      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];

      if (flavors.length > 0) {
        const flvOptions: VariantOption[] = flavors.map((f, idx) => {
          const fName = typeof f === 'string' ? f : (f?.name || '');
          const isAvail = typeof f === 'object' ? (f.inStock !== false && f.available !== false && !f.soldOut && !f.isSoldOut) : true;
          return {
            id: `flv-${idx}`,
            name: fName,
            priceAed: priceAed,
            inStock: isAvail
          };
        }).filter(o => o.inStock !== false);

        if (flvOptions.length > 0) {
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
      }

      if (sizes.length > 0) {
        const szOptions: VariantOption[] = sizes.map((s, idx) => {
          const sName = typeof s === 'string' ? s : (s?.name || '');
          const isAvail = typeof s === 'object' ? (s.inStock !== false && s.available !== false && !s.soldOut && !s.isSoldOut) : true;
          return {
            id: `sz-${idx}`,
            name: sName,
            priceAed: priceAed,
            inStock: isAvail
          };
        }).filter(o => o.inStock !== false);

        if (szOptions.length > 0) {
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
    }

    const flatVariants = this.extractFlatVariants(raw, priceAed);

    const titleEn = raw.title || 'Dubai Store Product';
    const titleFa = generateBilingualProductTitle(titleEn, storeName, brand);

    const hasAnyInStockVariant = flatVariants.length > 0
      ? flatVariants.some(v => v.inStock !== false)
      : (dimensions.length > 0 ? dimensions.some(d => d.options.some(o => o.inStock !== false)) : true);

    const overallInStock = raw.inStock !== false && raw.available !== false && hasAnyInStockVariant;

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
      storeName,
      storeOrigin: originInfo.origin,
      brand,
      category: raw.category || 'مکمل‌های ورزشی و تغذیه',
      description: raw.description,
      descriptionFa: raw.descriptionFa,
      dimensions: dimensions.length > 0 ? dimensions : undefined,
      variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
      variants: flatVariants,
      options: raw.options || [],
      flavors: raw.flavors || [],
      sizes: raw.sizes || [],
      inStock: overallInStock
    };
  }
}

export const universalScraperService = UniversalScraperService.getInstance();
