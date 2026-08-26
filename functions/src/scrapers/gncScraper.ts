import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  cleanAndNormalizeUrl,
  getStandardScraperHeaders,
  extractJsonLdSchema,
  extractEmbeddedJsonData,
  sanitizeImageUrl,
  extractPriceNumber,
  deduplicateStrings,
  generateBilingualProductTitle,
  isOutOfStockElement,
  isArtificialFallback
} from './utils';

export interface GncScraperResult {
  success: boolean;
  ok?: boolean;
  titleFa: string;
  titleEn: string;
  title: string;
  brand: string;
  priceAed: number;
  priceAED?: number;
  originalPriceAed?: number;
  originalPriceAED?: number;
  discountPercent?: number;
  image: string;
  imageUrl: string;
  galleryImages: string[];
  inStock: boolean;
  retailer: 'GNC';
  store: string;
  storeName: string;
  sourceUrl: string;
  selectedFlavor?: string | null;
  selectedSize?: string | null;
  flavors: string[];
  sizes: string[];
  variants: any[];
  weightKg: number;
  description?: string;
  error?: string;
}

/**
 * Permanent, Multi-Tier GNC Extraction Engine
 * Tier 1: Shopify .json / .js API endpoint
 * Tier 2: Standardized JSON-LD Schema
 * Tier 3: Sanitized High-Res DOM Selectors
 */
export async function scrapeGnc(rawUrl: string): Promise<GncScraperResult> {
  const normalizedUrl = cleanAndNormalizeUrl(rawUrl) || rawUrl.trim();
  const headers = getStandardScraperHeaders(normalizedUrl);

  let titleEn = '';
  let brand = 'GNC';
  let priceAed = 0;
  let originalPriceAed = 0;
  let mainImage = '';
  const galleryImages: string[] = [];
  const flavorsList: string[] = [];
  const sizesList: string[] = [];
  const structuredVariants: any[] = [];
  let description = '';
  let inStock = true;

  // -------------------------------------------------------------
  // TIER 1: Shopify Product JSON API
  // -------------------------------------------------------------
  try {
    const jsonUrl = normalizedUrl.split('?')[0].replace(/\/$/, '') + '.json';
    const res = await axios.get(jsonUrl, { headers, timeout: 10000 });
    const p = res.data?.product;
    if (p && p.title) {
      titleEn = p.title;
      brand = p.vendor || 'GNC';
      description = p.body_html ? p.body_html.replace(/<[^>]*>/g, ' ').trim() : '';

      const variants = Array.isArray(p.variants) ? p.variants : [];
      const v0 = variants[0] || {};
      priceAed = extractPriceNumber(v0.price);
      originalPriceAed = extractPriceNumber(v0.compare_at_price);

      mainImage = sanitizeImageUrl(p.image?.src || (p.images && p.images[0]?.src), normalizedUrl);
      if (Array.isArray(p.images)) {
        p.images.forEach((im: any) => {
          const u = sanitizeImageUrl(im.src || im, normalizedUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      }

      (p.options || []).forEach((opt: any) => {
        const optName = String(opt.name || '').toLowerCase();
        if (optName.includes('flavor') || optName.includes('طعم')) {
          (opt.values || []).forEach((v: string) => flavorsList.push(String(v)));
        } else if (optName.includes('size') || optName.includes('weight') || optName.includes('سایز') || optName.includes('حجم')) {
          (opt.values || []).forEach((v: string) => sizesList.push(String(v)));
        }
      });

      variants.forEach((v: any, idx: number) => {
        const vPrice = extractPriceNumber(v.price) || priceAed;
        const vOrigPrice = extractPriceNumber(v.compare_at_price);
        structuredVariants.push({
          id: `var-${v.id || idx}`,
          size: v.option1 || v.title,
          flavor: v.option2 || undefined,
          price: vPrice,
          priceAed: vPrice,
          priceAED: vPrice,
          originalPriceAed: vOrigPrice > vPrice ? vOrigPrice : undefined,
          inStock: v.available !== false,
          image: sanitizeImageUrl(v.featured_image?.src || mainImage, normalizedUrl)
        });
      });

      if (v0.available === false) {
        inStock = variants.some((v: any) => v.available !== false);
      }
    }
  } catch (_shopErr) {}

  // -------------------------------------------------------------
  // TIER 2 & 3: Direct HTML Scraping Fallback (JSON-LD + DOM)
  // -------------------------------------------------------------
  if (!priceAed) {
    try {
      const res = await axios.get(normalizedUrl, { headers, timeout: 12000 });
      const html = res.data;
      if (html && typeof html === 'string') {
        const $ = cheerio.load(html);

        // JSON-LD
        const jsonLdData = extractJsonLdSchema($, normalizedUrl);
        if (jsonLdData) {
          if (!titleEn && jsonLdData.name) titleEn = jsonLdData.name;
          if (jsonLdData.brand) brand = jsonLdData.brand;
          if (jsonLdData.priceAED > 0) priceAed = jsonLdData.priceAED;
          if (jsonLdData.originalPriceAED && jsonLdData.originalPriceAED > priceAed) originalPriceAed = jsonLdData.originalPriceAED;
          if (!mainImage && jsonLdData.image) mainImage = jsonLdData.image;
          if (jsonLdData.galleryImages?.length > 0) {
            jsonLdData.galleryImages.forEach(img => {
              if (img && !galleryImages.includes(img)) galleryImages.push(img);
            });
          }
        }

        // DOM Fallback
        if (!titleEn) {
          titleEn = $('h1.product-single__title, h1.product__title, h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') || '';
        }
        if (!priceAed) {
          const priceText = $('.price__regular .price-item--regular, .product__price, [data-product-price], .price').first().text();
          priceAed = extractPriceNumber(priceText);
        }
        if (!mainImage) {
          const ogImg = $('meta[property="og:image"]').attr('content') ||
                        $('.product-single__photo img, .product__media img').first().attr('src');
          mainImage = sanitizeImageUrl(ogImg || '', normalizedUrl);
        }
      }
    } catch (_htmlErr) {}
  }

  if (mainImage && !galleryImages.includes(mainImage)) {
    galleryImages.unshift(mainImage);
  }

  const cleanFlavors = deduplicateStrings(flavorsList);
  const cleanSizes = deduplicateStrings(sizesList);
  const titleFa = generateBilingualProductTitle(titleEn, brand);

  const selectedFlavor: string | null = cleanFlavors.length > 0 ? cleanFlavors[0] : null;
  const selectedSize: string | null = cleanSizes.length > 0 ? cleanSizes[0] : null;

  // Filter structured variants: if single-SKU default, keep variants empty
  const validVariants = structuredVariants.filter(v => {
    const hasFlavor = v.flavor && !isArtificialFallback(v.flavor);
    const hasSize = v.size && !isArtificialFallback(v.size);
    return hasFlavor || hasSize;
  });

  let discountPercent: number | undefined;
  if (originalPriceAed > priceAed && originalPriceAed > 0) {
    discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
  }

  if (!priceAed || priceAed <= 0) {
    return {
      success: false,
      ok: false,
      titleFa,
      titleEn,
      title: titleEn,
      brand,
      priceAed: 0,
      image: mainImage,
      imageUrl: mainImage,
      galleryImages,
      inStock: false,
      retailer: 'GNC',
      store: 'GNC Store',
      storeName: 'GNC Store',
      sourceUrl: normalizedUrl,
      selectedFlavor,
      selectedSize,
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants: validVariants,
      weightKg: 0.8,
      error: 'امکان استخراج اطلاعات از فروشگاه GNC مقدور نشد.'
    };
  }

  return {
    success: true,
    ok: true,
    titleFa,
    titleEn,
    title: titleEn,
    brand,
    priceAed,
    priceAED: priceAed,
    originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
    originalPriceAED: originalPriceAed > priceAed ? originalPriceAed : undefined,
    discountPercent,
    image: mainImage,
    imageUrl: mainImage,
    galleryImages,
    inStock,
    retailer: 'GNC',
    store: 'GNC Store',
    storeName: 'GNC Store',
    sourceUrl: normalizedUrl,
    selectedFlavor,
    selectedSize,
    flavors: cleanFlavors,
    sizes: cleanSizes,
    variants: validVariants,
    weightKg: 0.8,
    description
  };
}
