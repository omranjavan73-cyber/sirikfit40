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

export const BROWSER_HEADERS = getStandardScraperHeaders('https://www.drnutrition.com/en-ae/');

/**
 * Permanent, Multi-Tier Dr. Nutrition Extraction Engine
 * Tier 1: Standardized JSON-LD Schema (Google SEO Mandatory metadata)
 * Tier 2: Framework Hydration & Next.js pageProps (multi-flavor, multi-size configurable options)
 * Tier 3: Sanitized High-Res DOM Selectors
 * Tier 4: Jina Reader Proxy fallback (for extreme WAF/Cloudflare bypass)
 */
export async function scrapeDrNutrition(rawUrl: string): Promise<DrNutritionScraperResult> {
  const normalizedUrl = cleanAndNormalizeUrl(rawUrl) || rawUrl.trim();
  const headers = getStandardScraperHeaders(normalizedUrl);

  let html = '';
  try {
    const res = await axios.get(normalizedUrl, {
      headers,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });
    if (res.data && typeof res.data === 'string') {
      html = res.data;
    }
  } catch (err: any) {
    console.warn(`[drNutritionScraper] Direct HTTP fetch failed for ${normalizedUrl}:`, err?.message || err);
  }

  // Tier 4 Fallback: If blocked or empty response, fetch via Jina Reader
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
        timeout: 15000
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
  // TIER 1: Standardized Schema.org JSON-LD Extraction
  // -------------------------------------------------------------
  const jsonLdData = extractJsonLdSchema($, normalizedUrl);
  if (jsonLdData) {
    if (jsonLdData.name) titleEn = jsonLdData.name;
    if (jsonLdData.brand) brand = jsonLdData.brand;
    if (jsonLdData.priceAED > 0) priceAed = jsonLdData.priceAED;
    if (jsonLdData.originalPriceAED && jsonLdData.originalPriceAED > priceAed) originalPriceAed = jsonLdData.originalPriceAED;
    if (jsonLdData.image) mainImage = jsonLdData.image;
    if (jsonLdData.galleryImages?.length > 0) {
      jsonLdData.galleryImages.forEach(img => {
        if (img && !galleryImages.includes(img)) galleryImages.push(img);
      });
    }
    if (jsonLdData.inStock !== undefined) inStock = jsonLdData.inStock;
    if (jsonLdData.description) description = jsonLdData.description;
  }

  // -------------------------------------------------------------
  // TIER 2: Framework Hydration & Next.js pageProps Payload
  // -------------------------------------------------------------
  const { nextData, initialState, magentoInit } = extractEmbeddedJsonData($);

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

      // Price extraction
      const finalPriceCandidate = extractPriceNumber(
        product.final_price ?? product.special_price ?? product.sale_price ??
        product.price_range?.minimum_price?.final_price?.value ?? product.price ?? product.offer_price
      );
      const regularPriceCandidate = extractPriceNumber(
        product.regular_price ?? product.price_range?.minimum_price?.regular_price?.value ?? product.price
      );

      if (finalPriceCandidate > 0 && !priceAed) priceAed = finalPriceCandidate;
      if (regularPriceCandidate > priceAed && !originalPriceAed) originalPriceAed = regularPriceCandidate;

      // Images
      if (product.image?.url || product.image) {
        const u = sanitizeImageUrl(product.image?.url || product.image, normalizedUrl);
        if (u && !mainImage) mainImage = u;
      }
      if (Array.isArray(product.media_gallery || product.images)) {
        (product.media_gallery || product.images).forEach((m: any) => {
          const u = sanitizeImageUrl(m.url || m.file || m, normalizedUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      }

      // Swatch & Configurable Options Matrix
      const optGroups = Array.isArray(product.configurable_options) ? product.configurable_options :
                        (Array.isArray(product.options) ? product.options : (Array.isArray(product.attributes) ? product.attributes : []));

      if (Array.isArray(optGroups)) {
        optGroups.forEach((group: any) => {
          const groupCode = String(group.attribute_code || group.code || group.label || group.title || '').toLowerCase();
          const isFlavorGroup = groupCode.includes('flavor') || groupCode.includes('flavour') || groupCode.includes('طعم') || groupCode.includes('taste');
          const isSizeGroup = groupCode.includes('size') || groupCode.includes('weight') || groupCode.includes('serving') || groupCode.includes('سایز') || groupCode.includes('وزن') || groupCode.includes('حجم');

          const values = Array.isArray(group.values) ? group.values : (Array.isArray(group.options) ? group.options : []);
          values.forEach((v: any) => {
            const label = typeof v === 'string' ? v : (v.label || v.store_label || v.value_index || v.name || v.title);
            if (label && typeof label === 'string') {
              const cleanLabel = label.trim();
              if (isFlavorGroup) flavorsList.push(cleanLabel);
              else if (isSizeGroup) sizesList.push(cleanLabel);
              else {
                const lowerL = cleanLabel.toLowerCase();
                if (lowerL.includes('kg') || lowerL.includes('g') || lowerL.includes('lb') || lowerL.includes('serving') || lowerL.includes('سروینگ') || lowerL.includes('عددی')) {
                  sizesList.push(cleanLabel);
                } else {
                  flavorsList.push(cleanLabel);
                }
              }
            }
          });
        });
      }

      // Variants with prices
      if (Array.isArray(product.variants)) {
        product.variants.forEach((v: any, idx: number) => {
          const vPrice = extractPriceNumber(v.product?.final_price || v.price || priceAed);
          const vOrig = extractPriceNumber(v.product?.regular_price || v.regular_price || originalPriceAed);
          const vTitle = String(v.title || v.name || v.product?.name || `گزینه ${idx + 1}`).trim();
          structuredVariants.push({
            id: `var-${v.id || idx}`,
            title: vTitle,
            price: vPrice,
            priceAed: vPrice,
            priceAED: vPrice,
            originalPriceAed: vOrig > vPrice ? vOrig : undefined,
            inStock: v.product?.stock_status !== 'OUT_OF_STOCK' && v.available !== false
          });
        });
      }
    }
  }

  // Check Magento init scripts if NextData was absent or incomplete
  for (const initObj of magentoInit) {
    if (!initObj || typeof initObj !== 'object') continue;
    const priceBox = initObj['[data-role=priceBox]']?.priceBox?.priceConfig?.prices ||
                     initObj['#product_addtocart_form']?.priceBox?.priceConfig?.prices ||
                     initObj['*']?.priceBox?.priceConfig?.prices;
    if (priceBox) {
      if (priceBox.finalPrice?.amount && !priceAed) {
        const val = extractPriceNumber(priceBox.finalPrice.amount);
        if (val > 0) priceAed = val;
      }
      if (priceBox.oldPrice?.amount && !originalPriceAed) {
        const val = extractPriceNumber(priceBox.oldPrice.amount);
        if (val > 0) originalPriceAed = val;
      }
    }
  }

  // -------------------------------------------------------------
  // TIER 3: Sanitized Fallback DOM Extraction
  // -------------------------------------------------------------
  if (!titleEn) {
    titleEn = $('h1.product-title, h1[itemprop="name"], h1.page-title, h1').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().replace(/\s*\|\s*Dr\.?\s*Nutrition.*$/i, '').trim();
  }

  if (!priceAed) {
    const specialPriceElem = $('.special-price .price, .product-info-price .special-price, .price-wrapper[data-price-type="finalPrice"] .price');
    const oldPriceElem = $('.old-price .price, del .price, [data-price-type="oldPrice"] .price');
    const regularPriceElem = $('.price-box .price, .product-info-price .price, .price').not('.old-price *');

    if (specialPriceElem.length > 0) {
      priceAed = extractPriceNumber(specialPriceElem.first().text());
      if (oldPriceElem.length > 0) {
        originalPriceAed = extractPriceNumber(oldPriceElem.first().text());
      }
    } else if (regularPriceElem.length > 0) {
      priceAed = extractPriceNumber(regularPriceElem.first().text());
    }
  }

  if (!priceAed) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                      $('meta[name="twitter:data1"]').attr('content') ||
                      $('meta[itemprop="price"]').attr('content') ||
                      $('[itemprop="price"]').attr('content');
    priceAed = extractPriceNumber(metaPrice);
  }

  if (!mainImage) {
    const ogImg = $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content') ||
                  $('.gallery-placeholder img, [itemprop="image"], .fotorama__img, .product-image-photo').first().attr('src');
    mainImage = sanitizeImageUrl(ogImg || '', normalizedUrl);
  }

  if (mainImage && !galleryImages.includes(mainImage)) {
    galleryImages.unshift(mainImage);
  }

  // DOM Swatches with Active Detection
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
    priceAed,
    priceAED: priceAed,
    originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
    originalPriceAED: originalPriceAed > priceAed ? originalPriceAed : undefined,
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
