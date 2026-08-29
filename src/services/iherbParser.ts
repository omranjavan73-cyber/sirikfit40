import type {
  UniversalProduct,
  ProductVariantMatrix,
  ProductVariantItem,
  VariantDimension,
  VariantOption,
  ProductVariantGroup
} from '../types';
import { generateBilingualProductTitle } from '../utils/parseLink';
import { deduplicateImageUrls } from '../utils/formatters';
import { isOutOfStockElement } from './gncParser';

export { isOutOfStockElement };

/**
 * High-precision image CDN resolver for iHerb.
 * On iHerb's CDN (images.iherb.com), thumbnail/medium images are stored under /m/, /s/, /t/, /v/, /c/.
 * The full, uncompressed high-res master photo is under /l/ (large).
 */
export function resolveIherbHighResImage(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim();
  if (clean.startsWith('//')) clean = 'https:' + clean;

  if (clean.includes('iherb.com') || clean.includes('images-iherb.com')) {
    clean = clean.replace(/(\/images\.iherb\.com\/)(?:m|s|t|v|c)(\/[a-z0-9_-]+\.(?:jpg|png|webp|jpeg))/i, '$1l$2');
    clean = clean.replace(/(\/)(?:m|s|t|v|c)(\/[a-z0-9_-]+\.(?:jpg|png|webp|jpeg))/i, '$1l$2');
    try {
      const u = new URL(clean);
      u.searchParams.delete('w');
      u.searchParams.delete('h');
      u.searchParams.delete('width');
      u.searchParams.delete('height');
      clean = u.toString();
    } catch (_e) {}
  }
  return clean;
}

/**
 * iHerb Dedicated Parser - High-precision DOM, JSON-LD, and Variant Extraction
 */
export class IherbParser {
  public static readonly storeName = 'iHerb';
  public static readonly storeOrigin = 'انبار مرکزی iHerb امارات و دبی';

  public static canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return lower.includes('iherb.com') || lower.includes('ae.iherb.com');
  }

  public static normalizeUrl(url: string): string {
    if (!url || typeof url !== 'string') return '';
    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname.toLowerCase().includes('iherb.com')) {
        parsed.hostname = 'ae.iherb.com';
      }
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      return parsed.toString();
    } catch (_e) {
      return url.trim();
    }
  }

  public static cleanPrice(raw: any): number {
    try {
      if (raw === undefined || raw === null) return 0;
      if (typeof raw === 'number') {
        return Math.round(raw * 100) / 100;
      }
      const str = String(raw)
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
        .replace(/,/g, '')
        .replace(/[^0-9.]/g, '');
      const num = parseFloat(str);
      return isNaN(num) || num < 0 ? 0 : Math.round(num * 100) / 100;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * Parse HTML or raw structured data into UniversalProduct
   */
  public static async parse(
    targetUrl: string,
    rawHtml?: string,
    rawData?: any
  ): Promise<UniversalProduct | null> {
    const normalizedUrl = this.normalizeUrl(targetUrl);

    // If structured rawData is already provided
    if (rawData && (rawData.title || rawData.titleEn || rawData.price || rawData.priceAed)) {
      return this.fromRawData(rawData, normalizedUrl);
    }

    if (!rawHtml || typeof rawHtml !== 'string' || rawHtml.length < 50) {
      return null;
    }

    let titleEn = '';
    let brand = '';
    let priceAed = 0;
    let originalPriceAed: number | undefined = undefined;
    const galleryImages: string[] = [];
    let inStock = true;
    let description = '';
    const flavorsList: string[] = [];
    const sizesList: string[] = [];
    const flatVariants: ProductVariantItem[] = [];

    // 1. Parse JSON-LD scripts (<script type="application/ld+json">)
    const jsonLdRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = jsonLdRegex.exec(rawHtml)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);
        for (const item of items) {
          if (!item) continue;
          const type = String(item['@type'] || '');
          if (type === 'Product' || type === 'IndividualProduct' || item.offers || item.sku) {
            if (!titleEn && (item.name || item.headline)) {
              titleEn = String(item.name || item.headline).trim();
            }
            if (!brand) {
              if (typeof item.brand === 'string') brand = item.brand.trim();
              else if (item.brand && typeof item.brand.name === 'string') brand = item.brand.name.trim();
            }
            if (!description && item.description) {
              description = String(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
            }
            if (item.image) {
              const imgs = Array.isArray(item.image) ? item.image : [item.image];
              imgs.forEach((imgObj: any) => {
                const src = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.contentUrl || '');
                if (src) {
                  const hr = resolveIherbHighResImage(src);
                  if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
                }
              });
            }
            if (item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
              for (const off of offers) {
                if (!off) continue;
                const p = this.cleanPrice(off.price ?? off.lowPrice ?? off.priceAmount);
                if (p > 0 && priceAed === 0) priceAed = p;
                const op = this.cleanPrice(off.highPrice ?? off.regularPrice);
                if (op > priceAed) originalPriceAed = op;
                if (off.availability) {
                  const a = String(off.availability).toLowerCase();
                  if (a.includes('outofstock') || a.includes('discontinued') || a.includes('soldout')) {
                    inStock = false;
                  }
                }
              }
            }
          }
        }
      } catch (_e) {}
    }

    // 2. DOM Fallback Selectors
    if (!titleEn) {
      const titleMatch = rawHtml.match(/<h1\b[^>]*class=["'][^"']*\bproduct-title\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                         rawHtml.match(/<h1\b[^>]*id=["']name["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                         rawHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
      if (titleMatch && titleMatch[1]) {
        titleEn = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }

    if (!brand) {
      const brandMatch = rawHtml.match(/<[^>]*class=["'][^"']*\bproduct-brand\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
                         rawHtml.match(/<div\b[^>]*id=["']brand["'][^>]*>([\s\S]*?)<\/div>/i);
      if (brandMatch && brandMatch[1]) {
        brand = brandMatch[1].replace(/<[^>]+>/g, '').trim();
      }
    }
    if (!brand && titleEn) {
      const parts = titleEn.split(',');
      if (parts.length > 1 && parts[0].trim().length < 40) {
        brand = parts[0].trim();
      }
    }
    if (!brand) brand = 'iHerb';

    // Price DOM Fallbacks (.our-price, .product-price-amount, b[itemprop="price"])
    if (priceAed === 0) {
      const priceRegexes = [
        /<[^>]*class=["'][^"']*\bour-price\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
        /<[^>]*class=["'][^"']*\bproduct-price-amount\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
        /<b\b[^>]*itemprop=["']price["'][^>]*>([\s\S]*?)<\/b>/i,
        /<[^>]*itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i,
        /<[^>]*class=["'][^"']*\bprice-inner\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i
      ];
      for (const rx of priceRegexes) {
        const m = rawHtml.match(rx);
        if (m && m[1]) {
          const p = this.cleanPrice(m[1]);
          if (p > 0) {
            priceAed = p;
            break;
          }
        }
      }
    }

    // Image DOM Fallbacks
    if (galleryImages.length === 0) {
      const imgRegexes = [
        /<img\b[^>]*id=["']main-image["'][^>]*src=["']([^"']+)["']/i,
        /<img\b[^>]*class=["'][^"']*\bhero-image\b[^"']*["'][^>]*src=["']([^"']+)["']/i,
        /<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      ];
      for (const rx of imgRegexes) {
        const m = rawHtml.match(rx);
        if (m && m[1]) {
          const hr = resolveIherbHighResImage(m[1]);
          if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
        }
      }
    }

    const mainImage = galleryImages[0] || '';
    const titleFa = generateBilingualProductTitle(titleEn, 'iHerb', brand);

    let discountPercent: number | undefined = undefined;
    if (originalPriceAed && originalPriceAed > priceAed) {
      discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
    }

    const variantMatrix: ProductVariantMatrix = {
      sizes: sizesList,
      flavors: flavorsList,
      items: flatVariants,
      selectedVariant: flatVariants[0]
    };

    return {
      title: titleFa,
      titleFa,
      titleEn: titleEn || 'iHerb Product',
      url: normalizedUrl,
      priceAed,
      originalPriceAed,
      discountPercent,
      weightKg: 0.8,
      image: mainImage,
      images: galleryImages,
      galleryImages,
      storeName: 'iHerb',
      storeOrigin: this.storeOrigin,
      brand,
      category: 'مکمل‌های ورزشی و تغذیه',
      description,
      variantMatrix,
      flavors: flavorsList,
      sizes: sizesList,
      inStock
    };
  }

  /**
   * Helper to normalize raw API/scraper output into UniversalProduct
   */
  private static fromRawData(raw: any, sourceUrl: string): UniversalProduct {
    const titleEn = raw.titleEn || raw.title || 'iHerb Product';
    const brand = raw.brand || 'iHerb';
    const titleFa = raw.titleFa || generateBilingualProductTitle(titleEn, 'iHerb', brand);
    const priceAed = this.cleanPrice(raw.priceAed || raw.priceAED || raw.price || raw.basePriceAED);
    const originalPriceAed = this.cleanPrice(raw.originalPriceAed || raw.originalPriceAED) || undefined;
    const discountPercent = raw.discountPercent || (
      originalPriceAed && originalPriceAed > priceAed
        ? Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100)
        : undefined
    );

    const mainImage = resolveIherbHighResImage(raw.image || raw.imageUrl || raw.mainImage || '');
    const rawGallery: string[] = Array.isArray(raw.galleryImages)
      ? raw.galleryImages
      : (Array.isArray(raw.images) ? raw.images : []);
    const galleryImages = Array.from(new Set([mainImage, ...rawGallery.map(resolveIherbHighResImage)].filter(Boolean)));

    const variants = Array.isArray(raw.variants) ? raw.variants : [];
    const sizes = Array.isArray(raw.sizes) ? raw.sizes : [];
    const flavors = Array.isArray(raw.flavors) ? raw.flavors : [];

    const variantMatrix: ProductVariantMatrix = raw.variantMatrix || {
      sizes,
      flavors,
      items: variants,
      selectedVariant: variants[0]
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
      storeName: 'iHerb',
      storeOrigin: this.storeOrigin,
      brand,
      category: raw.category || 'مکمل‌های ورزشی و تغذیه',
      description: raw.description,
      variantMatrix,
      variants,
      flavors,
      sizes,
      inStock: raw.inStock !== false
    };
  }
}
