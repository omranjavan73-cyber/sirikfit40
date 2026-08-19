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
  if (lower.includes('drnutrition.com') || lower.includes('drnutrition')) {
    return { storeName: 'Dr. Nutrition', origin: 'انبار مرکزی Dr Nutrition دبی', flag: '🇦🇪' };
  }
  if (lower.includes('gnc.') || lower.includes('gnc-') || lower.includes('gnc')) {
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
    const seenNames = new Set<string>();

    if (Array.isArray(raw.variants) && raw.variants.length > 0) {
      raw.variants.forEach((v: any, idx: number) => {
        const vName = typeof v === 'string' ? v : (v.name || v.label || v.title || '');
        if (vName && !seenNames.has(vName.trim().toLowerCase())) {
          seenNames.add(vName.trim().toLowerCase());
          const isAvailable = v.inStock !== false && v.available !== false && !v.soldOut && !v.isSoldOut && v.is_available !== false;
          flatVariants.push({
            id: v.id || `variant-${idx}`,
            name: vName,
            inStock: isAvailable,
            priceAED: v.priceAED !== undefined ? Number(v.priceAED) : (v.priceAed !== undefined ? Number(v.priceAed) : (v.price !== undefined ? Number(v.price) : defaultPriceAed)),
            imageThumbnail: v.imageThumbnail || v.imageUrl || v.image || undefined
          });
        }
      });
    }

    if (Array.isArray(raw.variantGroups) && raw.variantGroups.length > 0) {
      raw.variantGroups.forEach((vg: any) => {
        (vg.options || []).forEach((opt: any, optIdx: number) => {
          const optName = typeof opt === 'string' ? opt : (opt.name || opt.label || opt.nameFa || '');
          if (optName && !seenNames.has(optName.trim().toLowerCase())) {
            seenNames.add(optName.trim().toLowerCase());
            const isAvailable = opt.inStock !== false && opt.available !== false && !opt.soldOut && !opt.isSoldOut;
            flatVariants.push({
              id: opt.id || `opt-${optIdx}`,
              name: optName,
              inStock: isAvailable,
              priceAED: opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : defaultPriceAed),
              imageThumbnail: opt.image || opt.imageUrl || undefined
            });
          }
        });
      });
    }

    if (flatVariants.length === 0) {
      const flavors: any[] = Array.isArray(raw.flavors) ? raw.flavors : [];
      flavors.forEach((flv, idx) => {
        const flvName = typeof flv === 'string' ? flv : (flv?.name || flv?.label || '');
        const isAvailable = typeof flv === 'object' ? (flv.inStock !== false && flv.available !== false) : true;
        if (flvName && !seenNames.has(flvName.trim().toLowerCase())) {
          seenNames.add(flvName.trim().toLowerCase());
          flatVariants.push({
            id: `flv-${idx}`,
            name: flvName,
            inStock: isAvailable,
            priceAED: defaultPriceAed
          });
        }
      });

      const sizes: any[] = Array.isArray(raw.sizes) ? raw.sizes : [];
      sizes.forEach((sz, idx) => {
        const szName = typeof sz === 'string' ? sz : (sz?.name || sz?.label || '');
        const isAvailable = typeof sz === 'object' ? (sz.inStock !== false && sz.available !== false) : true;
        if (szName && !seenNames.has(szName.trim().toLowerCase())) {
          seenNames.add(szName.trim().toLowerCase());
          flatVariants.push({
            id: `sz-${idx}`,
            name: szName,
            inStock: isAvailable,
            priceAED: defaultPriceAed
          });
        }
      });

      const options: any[] = Array.isArray(raw.options) ? raw.options : [];
      options.forEach((opt, idx) => {
        const optName = typeof opt === 'string' ? opt : (opt?.name || opt?.label || '');
        const isAvailable = typeof opt === 'object' ? (opt.inStock !== false && opt.available !== false) : true;
        if (optName && !seenNames.has(optName.trim().toLowerCase()) && !['default', 'standard', 'پیش‌فرض'].includes(optName.trim().toLowerCase())) {
          seenNames.add(optName.trim().toLowerCase());
          flatVariants.push({
            id: `opt-${idx}`,
            name: optName,
            inStock: isAvailable,
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
          price: opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed),
          priceAed: opt.priceAed !== undefined ? Number(opt.priceAed) : (opt.price !== undefined ? Number(opt.price) : priceAed),
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
          return {
            id: `flv-${idx}`,
            label: fName,
            name: fName,
            type: 'flavor',
            price: priceAed,
            priceAed: priceAed,
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
          return {
            id: `sz-${idx}`,
            label: sName,
            name: sName,
            type: 'size',
            price: priceAed,
            priceAed: priceAed,
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
      options: raw.options || [],
      flavors: raw.flavors || [],
      sizes: raw.sizes || [],
      inStock: overallInStock
    };
  }
}

export const universalScraperService = UniversalScraperService.getInstance();

/**
 * Dedicated Dr. Nutrition HTML parser adapter (JSON-LD -> __NEXT_DATA__ -> Regex).
 * Searches ALL <script> tags for price/offers JSON, extracts meta title/image, and regex matches price.
 */
export function parseDrNutrition(html: string, url: string = ''): {
  ok?: boolean;
  success?: boolean;
  requireManualEntry?: boolean;
  title: string;
  price: number;
  image: string;
  brand: string;
  gallery: string[];
  inStock: boolean;
  source: string;
} | null {
  if (!html) return null;

  const normalizeDrPrice = (raw: any): number => {
    if (raw === undefined || raw === null) return 0;
    const s = String(raw).replace(/,/g, '').replace(/[^0-9.]/g, '');
    let p = parseFloat(s);
    if (isNaN(p) || p <= 0) return 0;
    if (p > 2000) p = p / 100;
    return Math.round(p * 100) / 100;
  };

  // Extract Title from og:title or <title>
  let title = '';
  const ogTitleMatch = html.match(/<meta\s+[^>]*property=["']og:title["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:title["']/i);
  if (ogTitleMatch?.[1]) title = ogTitleMatch[1].trim();
  if (!title) {
    const tMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (tMatch?.[1]) title = tMatch[1].trim();
  }

  // Extract Image from og:image
  let image = '';
  const ogImgMatch = html.match(/<meta\s+[^>]*property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:image["']/i);
  if (ogImgMatch?.[1]) image = ogImgMatch[1].trim();

  // Search ALL <script> tags for JSON containing "price" or "offers"
  let extractedPrice = 0;
  let extractedTitleFromScript = '';
  let extractedImageFromScript = '';
  let scriptSource = 'script-tags';

  const allScripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi));
  for (const sMatch of allScripts) {
    const scriptContent = sMatch[1];
    if (!scriptContent) continue;

    if (scriptContent.includes('"price"') || scriptContent.includes('"offers"') || scriptContent.includes('"lowPrice"') || scriptContent.includes('"sale_price"')) {
      if (scriptContent.trim().startsWith('{') || scriptContent.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(scriptContent.trim());
          const items: any[] = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
          for (const item of items) {
            if (!item) continue;
            if ((item.name || item.title) && !extractedTitleFromScript) {
              extractedTitleFromScript = String(item.name || item.title).trim();
            }
            if (item.image && !extractedImageFromScript) {
              const rawImg = Array.isArray(item.image) ? item.image[0] : item.image;
              extractedImageFromScript = typeof rawImg === 'string' ? rawImg : (rawImg?.url || rawImg?.src || '');
            }
            const offersList = item.offers ? (Array.isArray(item.offers) ? item.offers : [item.offers]) : [];
            for (const offer of offersList) {
              const pRaw = offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
              const p = normalizeDrPrice(pRaw);
              if (p > 0) {
                extractedPrice = p;
                scriptSource = 'script-json-parsed';
                break;
              }
            }
            if (extractedPrice > 0) break;
            if (item.price || item.special_price || item.lowPrice) {
              const p = normalizeDrPrice(item.price || item.special_price || item.lowPrice);
              if (p > 0) {
                extractedPrice = p;
                scriptSource = 'script-json-item';
                break;
              }
            }
          }
        } catch (_e) {}
      }

      if (extractedPrice === 0) {
        const scriptPriceMatch = scriptContent.match(/(?:"price"|"lowPrice"|"sale_price")\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i);
        if (scriptPriceMatch && scriptPriceMatch[1]) {
          const p = normalizeDrPrice(scriptPriceMatch[1]);
          if (p > 0) {
            extractedPrice = p;
            scriptSource = 'script-regex';
          }
        }
      }
    }
    if (extractedPrice > 0) break;
  }

  // Raw HTML fallback regex match for price if scripts didn't find one
  if (extractedPrice === 0) {
    const rawPriceMatch = html.match(/(?:"price"|"lowPrice"|"sale_price")\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i)
      || html.match(/(?:AED|درهم)\s*([0-9]+(?:\.[0-9]+)?)/i)
      || html.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:AED|درهم)/i);
    if (rawPriceMatch && rawPriceMatch[1]) {
      extractedPrice = normalizeDrPrice(rawPriceMatch[1]);
      scriptSource = 'raw-html-regex';
    }
  }

  const finalTitle = title || extractedTitleFromScript || 'Dr. Nutrition Product';
  const finalImage = image || extractedImageFromScript || '';

  if (extractedPrice > 0) {
    return {
      ok: true,
      success: true,
      requireManualEntry: false,
      title: finalTitle,
      price: extractedPrice,
      image: finalImage,
      brand: 'Dr. Nutrition',
      gallery: finalImage ? [finalImage] : [],
      inStock: true,
      source: scriptSource
    };
  }

  return null;
}


