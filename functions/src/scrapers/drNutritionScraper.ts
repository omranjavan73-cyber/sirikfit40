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
  isArtificialFallback,
  extractDrNutritionHandle
} from './utils';

export interface DrNutritionScraperResult {
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
  retailer: 'DrNutrition';
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

export interface DrNutritionScraperOptions {
  timeoutMs?: number;
  userAgent?: string;
}

export const isStruckOrOldPrice = ($: cheerio.CheerioAPI, el: any): boolean => {
  const node = $(el);
  if (node.is('del, s, strike, [data-price-type="oldPrice"], .old-price, .original-price, .line-through, .strikethrough, .price-box__old')) {
    return true;
  }
  if (node.closest('del, s, strike, [data-price-type="oldPrice"], .old-price, .original-price, .line-through, .strikethrough, .price-box__old').length > 0) {
    return true;
  }
  const cls = String(node.attr('class') || '').toLowerCase();
  if (cls.includes('old') || cls.includes('original') || cls.includes('strike') || cls.includes('line-through')) {
    return true;
  }
  return false;
};

/**
 * Permanent, Multi-Tier Dr. Nutrition Extraction Engine
 * Tier 1: Direct Product JSON Endpoint (/products/[handle].json) - Clean bypass of HTML bot protection
 * Tier 2: Standardized JSON-LD Schema (Google SEO Mandatory metadata)
 * Tier 3: Framework Hydration & Next.js pageProps (multi-flavor, multi-size configurable options)
 * Tier 4: Sanitized High-Res DOM Selectors with Strikethrough Elimination
 * Tier 5: Jina Reader Proxy fallback
 */
export async function scrapeDrNutrition(rawUrl: string, options?: DrNutritionScraperOptions): Promise<DrNutritionScraperResult> {
  const normalizedUrl = cleanAndNormalizeUrl(rawUrl) || rawUrl.trim();
  const headers = getStandardScraperHeaders(normalizedUrl, options?.userAgent);
  const timeout = options?.timeoutMs || 15000;

  // -------------------------------------------------------------
  // TIER 1: Direct Product JSON Endpoint (/products/[handle].json)
  // -------------------------------------------------------------
  const handle = extractDrNutritionHandle(normalizedUrl);
  if (handle) {
    const jsonCandidates = [
      `https://www.drnutrition.com/en-ae/products/${handle}.json`,
      `https://www.drnutrition.com/products/${handle}.json`,
      `https://www.drnutrition.com/en-ae/product/${handle}.json`
    ];

    for (const jsonUrl of jsonCandidates) {
      try {
        const jsonRes = await axios.get(jsonUrl, {
          headers: {
            ...headers,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-AE,en;q=0.9'
          },
          timeout: Math.min(timeout, 8000),
          validateStatus: (s) => s < 400
        });

        if (jsonRes.data && (jsonRes.data.product || jsonRes.data.title)) {
          const product = jsonRes.data.product || jsonRes.data;
          const titleEn = String(product.title || product.name || '').trim();
          const brand = String(product.vendor || product.brand || 'Dr. Nutrition').trim();
          const rawVariants = Array.isArray(product.variants) ? product.variants : [];
          const v0 = rawVariants[0] || {};

          let rawPrice = v0.price ?? product.price;
          let rawComparePrice = v0.compare_at_price ?? product.compare_at_price;

          let priceAed = extractPriceNumber(rawPrice);
          if (priceAed > 1000 || (!String(rawPrice).includes('.') && priceAed >= 1000)) priceAed = priceAed / 100;

          let originalPriceAed = rawComparePrice ? extractPriceNumber(rawComparePrice) : 0;
          if (originalPriceAed > 1000 || (!String(rawComparePrice).includes('.') && originalPriceAed >= 1000)) originalPriceAed = originalPriceAed / 100;

          // Mathematical Invariant
          if (priceAed > 0 && originalPriceAed > 0) {
            const minP = Math.min(priceAed, originalPriceAed);
            const maxP = Math.max(priceAed, originalPriceAed);
            priceAed = minP;
            originalPriceAed = maxP > minP ? maxP : 0;
          }

          if (titleEn && priceAed > 0) {
            const galleryImages: string[] = [];
            if (Array.isArray(product.images)) {
              product.images.forEach((img: any) => {
                const src = typeof img === 'string' ? img : (img?.src || img?.url);
                if (src) {
                  const s = sanitizeImageUrl(src, normalizedUrl);
                  if (s && !galleryImages.includes(s)) galleryImages.push(s);
                }
              });
            }

            let rawImg = product.image?.src || product.image || (galleryImages.length > 0 ? galleryImages[0] : '');
            if (typeof rawImg === 'object' && rawImg?.src) rawImg = rawImg.src;
            const mainImg = sanitizeImageUrl(String(rawImg || (galleryImages[0] || '')), normalizedUrl);
            if (mainImg && !galleryImages.includes(mainImg)) galleryImages.unshift(mainImg);

            const flavorsList: string[] = [];
            const sizesList: string[] = [];
            const structuredVariants: any[] = [];

            if (Array.isArray(product.options)) {
              product.options.forEach((opt: any) => {
                const optName = String(opt.name || '').toLowerCase();
                const values = Array.isArray(opt.values) ? opt.values : [];
                values.forEach((val: any) => {
                  const valStr = String(val || '').trim();
                  if (valStr && !isArtificialFallback(valStr)) {
                    if (optName.includes('flavor') || optName.includes('طعم')) flavorsList.push(valStr);
                    else if (optName.includes('size') || optName.includes('weight') || optName.includes('حجم')) sizesList.push(valStr);
                  }
                });
              });
            }

            if (rawVariants.length > 0) {
              rawVariants.forEach((v: any, vIdx: number) => {
                let vPrice = priceAed;
                if (v.price) {
                  let vp = extractPriceNumber(v.price);
                  if (vp > 1000 || (!String(v.price).includes('.') && vp >= 1000)) vp = vp / 100;
                  if (vp > 0) vPrice = vp;
                }
                const vTitle = String(v.title || v.option1 || '').trim();
                const vImg = v.featured_image?.src ? sanitizeImageUrl(v.featured_image.src, normalizedUrl) : undefined;

                if (vTitle && !isArtificialFallback(vTitle)) {
                  const isSize = vTitle.toLowerCase().includes('kg') || vTitle.toLowerCase().includes('g') || vTitle.toLowerCase().includes('lb') || vTitle.toLowerCase().includes('serving') || vTitle.toLowerCase().includes('عددی');
                  if (isSize) {
                    if (!sizesList.includes(vTitle)) sizesList.push(vTitle);
                  } else {
                    if (!flavorsList.includes(vTitle)) flavorsList.push(vTitle);
                  }
                  structuredVariants.push({
                    id: String(v.id || `var-${vIdx}`),
                    title: vTitle,
                    price: vPrice,
                    priceAed: vPrice,
                    priceAED: vPrice,
                    image: vImg,
                    inStock: v.available !== false
                  });
                }
              });
            }

            const cleanFlavors = deduplicateStrings(flavorsList);
            const cleanSizes = deduplicateStrings(sizesList);
            const titleFa = generateBilingualProductTitle(titleEn, brand);
            const finalOriginalPrice = originalPriceAed > priceAed ? originalPriceAed : undefined;
            const discountPercent = finalOriginalPrice ? Math.round(((finalOriginalPrice - priceAed) / finalOriginalPrice) * 100) : undefined;

            return {
              success: true,
              ok: true,
              titleFa,
              titleEn,
              title: titleEn,
              brand,
              priceAed,
              priceAED: priceAed,
              originalPriceAed: finalOriginalPrice,
              originalPriceAED: finalOriginalPrice,
              discountPercent,
              image: mainImg,
              imageUrl: mainImg,
              galleryImages,
              inStock: v0.available !== false,
              retailer: 'DrNutrition',
              store: 'Dr. Nutrition',
              storeName: 'Dr. Nutrition',
              sourceUrl: normalizedUrl,
              selectedFlavor: cleanFlavors.length > 0 ? cleanFlavors[0] : null,
              selectedSize: cleanSizes.length > 0 ? cleanSizes[0] : null,
              flavors: cleanFlavors,
              sizes: cleanSizes,
              variants: structuredVariants,
              weightKg: 0.8,
              description: product.body_html ? String(product.body_html).replace(/<[^>]*>/g, ' ').trim() : undefined
            };
          }
        }
      } catch (_jsonErr) {}
    }
  }

  // -------------------------------------------------------------
  // TIER 2: Direct HTML Fetch & Fallback Pipeline
  // -------------------------------------------------------------
  let html = '';
  try {
    const res = await axios.get(normalizedUrl, {
      headers,
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });
    if (res.data && typeof res.data === 'string') {
      html = res.data;
    }
  } catch (err: any) {
    console.warn(`[drNutritionScraper] Direct HTTP fetch failed for ${normalizedUrl}:`, err?.message || err);
  }

  // Tier 5 Fallback: If blocked or empty response, fetch via Jina Reader
  if (!html || html.length < 300 || html.includes('Attention Required! | Cloudflare') || html.includes('cf-browser-verification')) {
    try {
      console.log(`[drNutritionScraper] Attempting Jina Reader proxy for ${normalizedUrl}`);
      const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
      const jinaRes = await axios.get(jinaUrl, {
        headers: {
          ...headers,
          'X-With-Images-Summary': 'true',
          'X-No-Cache': 'true'
        },
        timeout
      });
      if (jinaRes.data && typeof jinaRes.data === 'string') {
        html = jinaRes.data;
      }
    } catch (_jinaErr) {}
  }

  if (!html || html.length < 100) {
    return {
      success: false,
      ok: false,
      titleFa: '',
      titleEn: '',
      title: '',
      brand: 'Dr. Nutrition',
      priceAed: 0,
      image: '',
      imageUrl: '',
      galleryImages: [],
      inStock: false,
      retailer: 'DrNutrition',
      store: 'Dr. Nutrition',
      storeName: 'Dr. Nutrition',
      sourceUrl: normalizedUrl,
      flavors: [],
      sizes: [],
      variants: [],
      weightKg: 0.8,
      error: 'امکان برقراری ارتباط با وبسایت دکتر نیوتریشن میسر نشد.'
    };
  }

  const $ = cheerio.load(html);

  let titleEn = '';
  let brand = 'Dr. Nutrition';
  const activePrices: number[] = [];
  const oldPrices: number[] = [];
  let mainImage = '';
  const galleryImages: string[] = [];
  const flavorsList: string[] = [];
  const sizesList: string[] = [];
  const structuredVariants: any[] = [];
  let description = '';
  let inStock = true;

  // Schema.org JSON-LD Extraction
  const jsonLdData = extractJsonLdSchema($, normalizedUrl);
  if (jsonLdData) {
    if (jsonLdData.name) titleEn = jsonLdData.name;
    if (jsonLdData.brand) brand = jsonLdData.brand;
    if (jsonLdData.priceAED > 0) activePrices.push(jsonLdData.priceAED);
    if (jsonLdData.originalPriceAED && jsonLdData.originalPriceAED > 0) oldPrices.push(jsonLdData.originalPriceAED);
    if (jsonLdData.image) mainImage = jsonLdData.image;
    if (jsonLdData.galleryImages?.length > 0) {
      jsonLdData.galleryImages.forEach(img => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }
    if (jsonLdData.inStock !== undefined) inStock = jsonLdData.inStock;
    if (jsonLdData.description) description = jsonLdData.description;
  }

  // Framework Hydration & Next.js pageProps
  const { nextData } = extractEmbeddedJsonData($);
  if (nextData) {
    const pageProps = nextData?.props?.pageProps || {};
    const product = pageProps.product || pageProps.productData || pageProps.initialData?.product || pageProps.item;
    if (product) {
      if (!titleEn && product.name) titleEn = product.name;
      if (product.brand || product.brand_name || product.manufacturer) {
        brand = product.brand || product.brand_name || product.manufacturer || brand;
      }
      if (!description && (product.description?.html || product.description)) {
        description = String(product.description?.html || product.description).replace(/<[^>]*>/g, ' ').trim();
      }

      const finalPriceCandidate = extractPriceNumber(
        product.final_price ?? product.special_price ?? product.sale_price ??
        product.price_range?.minimum_price?.final_price?.value ?? product.offer_price
      );
      const regularPriceCandidate = extractPriceNumber(
        product.regular_price ?? product.price_range?.minimum_price?.regular_price?.value ?? product.price
      );

      if (finalPriceCandidate > 0) activePrices.push(finalPriceCandidate);
      if (regularPriceCandidate > 0) {
        if (finalPriceCandidate > 0 && regularPriceCandidate > finalPriceCandidate) oldPrices.push(regularPriceCandidate);
        else activePrices.push(regularPriceCandidate);
      }
    }
  }

  // Sanitized DOM extraction
  if (!titleEn) {
    titleEn = $('h1.product-title, h1[itemprop="name"], h1.page-title, h1').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().replace(/\s*\|\s*Dr\.?\s*Nutrition.*$/i, '').trim();
  }

  const specialPriceElem = $('.special-price .price, .product-info-price .special-price, .price-wrapper[data-price-type="finalPrice"] .price');
  specialPriceElem.each((_, el) => {
    if (!isStruckOrOldPrice($, el)) {
      const p = extractPriceNumber($(el).text());
      if (p > 0) activePrices.push(p);
    }
  });

  const oldPriceElem = $('.old-price .price, del .price, [data-price-type="oldPrice"] .price, .line-through');
  oldPriceElem.each((_, el) => {
    const p = extractPriceNumber($(el).text());
    if (p > 0) oldPrices.push(p);
  });

  $('.price-box .price, .product-info-price .price, [itemprop="price"]').each((_, el) => {
    if (!isStruckOrOldPrice($, el)) {
      const p = extractPriceNumber($(el).text() || $(el).attr('content'));
      if (p > 0) activePrices.push(p);
    }
  });

  const metaPrice = extractPriceNumber(
    $('meta[property="product:price:amount"]').attr('content') ||
    $('meta[name="twitter:data1"]').attr('content') ||
    $('meta[itemprop="price"]').attr('content')
  );
  if (metaPrice > 0) activePrices.push(metaPrice);

  if (!mainImage) {
    const ogImg = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  $('.gallery-placeholder img, [itemprop="image"], .fotorama__img, .product-image-photo').first().attr('src');
    mainImage = sanitizeImageUrl(ogImg || '', normalizedUrl);
  }

  if (mainImage && !galleryImages.includes(mainImage)) {
    galleryImages.unshift(mainImage);
  }

  // DOM Swatches
  let activeFlavor: string | null = null;
  let activeSize: string | null = null;

  $('.swatch-attribute, .product-options-wrapper .field').each((_, el) => {
    const code = String($(el).attr('data-attribute-code') || $(el).attr('attribute-code') || '').toLowerCase();
    $(el).find('.swatch-option, button, .option-item').each((__, optEl) => {
      const label = $(optEl).text().trim() || $(optEl).attr('data-option-label') || $(optEl).attr('data-option-tooltip-value') || '';
      if (label && !isOutOfStockElement($(optEl).toString(), label) && !isArtificialFallback(label)) {
        if (code.includes('flavor') || code.includes('طعم')) {
          flavorsList.push(label);
          if ($(optEl).hasClass('selected') || $(optEl).hasClass('active') || $(optEl).attr('aria-selected') === 'true') {
            activeFlavor = label;
          }
        } else if (code.includes('size') || code.includes('weight') || code.includes('حجم')) {
          sizesList.push(label);
          if ($(optEl).hasClass('selected') || $(optEl).hasClass('active') || $(optEl).attr('aria-selected') === 'true') {
            activeSize = label;
          }
        }
      }
    });
  });

  if (html.includes('Out of stock') || html.includes('ناموجود') || isOutOfStockElement(html)) {
    inStock = false;
  }

  const cleanFlavors = deduplicateStrings(flavorsList);
  const cleanSizes = deduplicateStrings(sizesList);

  const selectedFlavor: string | null = cleanFlavors.length > 0 
    ? ((activeFlavor && cleanFlavors.includes(activeFlavor)) ? activeFlavor : cleanFlavors[0])
    : null;
  const selectedSize: string | null = cleanSizes.length > 0
    ? ((activeSize && cleanSizes.includes(activeSize)) ? activeSize : cleanSizes[0])
    : null;

  const validVariants = structuredVariants.filter(v => {
    const hasFlavor = v.flavor && !isArtificialFallback(v.flavor);
    const hasSize = v.size && !isArtificialFallback(v.size);
    return hasFlavor || hasSize;
  });

  const titleFa = generateBilingualProductTitle(titleEn, brand);

  // Mathematical Invariant
  const validActivePrices = activePrices.filter(p => p > 0);
  const validOldPrices = oldPrices.filter(p => p > 0);

  let finalPriceAed = 0;
  let finalOriginalPriceAed: number | undefined = undefined;

  if (validActivePrices.length > 0 && validOldPrices.length > 0) {
    const minActive = Math.min(...validActivePrices);
    const maxOld = Math.max(...validOldPrices);
    finalPriceAed = Math.min(minActive, maxOld);
    finalOriginalPriceAed = Math.max(minActive, maxOld) > finalPriceAed ? Math.max(minActive, maxOld) : undefined;
  } else if (validActivePrices.length > 0) {
    finalPriceAed = Math.min(...validActivePrices);
  } else if (validOldPrices.length > 0) {
    finalPriceAed = Math.min(...validOldPrices);
  }

  let discountPercent: number | undefined;
  if (finalOriginalPriceAed && finalOriginalPriceAed > finalPriceAed && finalOriginalPriceAed > 0) {
    discountPercent = Math.round(((finalOriginalPriceAed - finalPriceAed) / finalOriginalPriceAed) * 100);
  }

  if (!finalPriceAed || finalPriceAed <= 0) {
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
      retailer: 'DrNutrition',
      store: 'Dr. Nutrition',
      storeName: 'Dr. Nutrition',
      sourceUrl: normalizedUrl,
      selectedFlavor,
      selectedSize,
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants: validVariants,
      weightKg: 0.8,
      error: 'استخراج قیمت زنده از دکتر نیوتریشن ناموفق بود.'
    };
  }

  return {
    success: true,
    ok: true,
    titleFa,
    titleEn,
    title: titleEn,
    brand,
    priceAed: finalPriceAed,
    priceAED: finalPriceAed,
    originalPriceAed: finalOriginalPriceAed,
    originalPriceAED: finalOriginalPriceAed,
    discountPercent,
    image: mainImage,
    imageUrl: mainImage,
    galleryImages,
    inStock,
    retailer: 'DrNutrition',
    store: 'Dr. Nutrition',
    storeName: 'Dr. Nutrition',
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
