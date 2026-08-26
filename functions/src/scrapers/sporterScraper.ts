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

export interface SporterScraperResult {
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
  retailer: 'Sporter';
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
 * Permanent, Multi-Tier Sporter Extraction Engine
 * Tier 1: Standardized JSON-LD Schema (Google SEO Mandatory metadata)
 * Tier 2: Framework Hydration & Magento init scripts (swatch renderer & price configuration)
 * Tier 3: Sanitized High-Res DOM Selectors
 * Tier 4: Jina Reader Proxy fallback (for extreme WAF/Cloudflare bypass)
 */
export async function scrapeSporter(rawUrl: string): Promise<SporterScraperResult> {
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
    console.warn(`[sporterScraper] Direct HTTP fetch failed for ${normalizedUrl}:`, err?.message || err);
  }

  // Tier 4 Fallback: If blocked or empty response, fetch via Jina Reader
  if (!html || html.length < 300 || html.includes('Attention Required! | Cloudflare') || html.includes('cf-browser-verification')) {
    try {
      console.log(`[sporterScraper] Attempting Jina Reader proxy for ${normalizedUrl}`);
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
      brand: 'Sporter UAE',
      priceAed: 0,
      image: '',
      imageUrl: '',
      galleryImages: [],
      inStock: false,
      retailer: 'Sporter',
      store: 'Sporter UAE',
      storeName: 'Sporter UAE',
      sourceUrl: normalizedUrl,
      flavors: [],
      sizes: [],
      variants: [],
      weightKg: 1.0,
      error: 'امکان اتصال به وبسایت اسپورتر فراهم نشد.'
    };
  }

  const $ = cheerio.load(html);

  // Data Holders
  let titleEn = '';
  let brand = 'Sporter UAE';
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
  // TIER 2: Framework Hydration & Magento State Extraction
  // -------------------------------------------------------------
  const { nextData, initialState, magentoInit } = extractEmbeddedJsonData($);

  // Next.js Props Extraction
  if (nextData) {
    const pageProps = nextData?.props?.pageProps || {};
    const product = pageProps.product || pageProps.initialState?.product || pageProps.data?.product || pageProps.initialData?.product;
    if (product) {
      if (!titleEn && product.name) titleEn = product.name;
      if (product.brand || product.manufacturer) brand = product.brand || product.manufacturer || brand;
      if (!description && product.description?.html) description = product.description.html.replace(/<[^>]*>/g, ' ').trim();

      const priceRange = product.price_range?.minimum_price;
      if (priceRange) {
        const finalVal = extractPriceNumber(priceRange.final_price?.value);
        const regVal = extractPriceNumber(priceRange.regular_price?.value);
        if (finalVal > 0 && !priceAed) priceAed = finalVal;
        if (regVal > 0 && !originalPriceAed && regVal > priceAed) originalPriceAed = regVal;
      } else if (product.special_price || product.final_price || product.price) {
        const sp = extractPriceNumber(product.special_price || product.final_price);
        const rp = extractPriceNumber(product.price || product.regular_price);
        if (sp > 0 && !priceAed) priceAed = sp;
        if (rp > sp && !originalPriceAed) originalPriceAed = rp;
        else if (rp > 0 && !priceAed) priceAed = rp;
      }

      if (product.image?.url || product.small_image?.url || product.thumbnail?.url) {
        const u = sanitizeImageUrl(product.image?.url || product.small_image?.url || product.thumbnail?.url, normalizedUrl);
        if (u && !mainImage) mainImage = u;
      }
      if (Array.isArray(product.media_gallery)) {
        product.media_gallery.forEach((m: any) => {
          const u = sanitizeImageUrl(m.url || m.file, normalizedUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      }

      if (Array.isArray(product.configurable_options || product.variants)) {
        (product.configurable_options || product.variants).forEach((opt: any) => {
          const optLabel = String(opt.label || opt.attribute_code || '').toLowerCase();
          if (Array.isArray(opt.values)) {
            opt.values.forEach((val: any) => {
              const valLabel = String(val.label || val.store_label || '').trim();
              if (valLabel) {
                if (optLabel.includes('flavor') || optLabel.includes('طعم')) flavorsList.push(valLabel);
                else if (optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم')) sizesList.push(valLabel);
              }
            });
          }
        });
      }
    }
  }

  // Magento init scripts extraction (prices & swatch options)
  for (const initObj of magentoInit) {
    if (!initObj || typeof initObj !== 'object') continue;

    // Price Box Config
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

    // Swatch Renderer Config (Flavors, Sizes & Variants)
    const swatchRenderer = initObj['[data-role=swatch-options]']?.['Magento_Swatches/js/swatch-renderer'] ||
                           initObj['#product_addtocart_form']?.['Magento_Swatches/js/swatch-renderer'] ||
                           initObj['*']?.['Magento_Swatches/js/swatch-renderer'] ||
                           initObj['*']?.['spConfig'];
    const jsonConfig = swatchRenderer?.jsonConfig || swatchRenderer;

    if (jsonConfig?.attributes) {
      Object.values(jsonConfig.attributes).forEach((attr: any) => {
        const code = String(attr.code || attr.label || '').toLowerCase();
        if (Array.isArray(attr.options)) {
          attr.options.forEach((opt: any) => {
            const optLabel = String(opt.label || opt.store_label || '').trim();
            if (optLabel) {
              if (code.includes('flavor') || code.includes('طعم')) flavorsList.push(optLabel);
              else if (code.includes('size') || code.includes('weight') || code.includes('حجم')) sizesList.push(optLabel);
            }
          });
        }
      });
    }

    if (jsonConfig?.optionPrices) {
      Object.entries(jsonConfig.optionPrices).forEach(([optId, pInfo]: [string, any]) => {
        const vPrice = extractPriceNumber(pInfo.finalPrice?.amount || pInfo.price?.amount);
        const vOrig = extractPriceNumber(pInfo.oldPrice?.amount);
        if (vPrice > 0) {
          structuredVariants.push({
            id: `var-${optId}`,
            price: vPrice,
            priceAed: vPrice,
            priceAED: vPrice,
            originalPriceAed: vOrig > vPrice ? vOrig : undefined,
            inStock: true
          });
        }
      });
    }
  }

  // -------------------------------------------------------------
  // TIER 3: Sanitized Fallback DOM Extraction
  // -------------------------------------------------------------
  if (!titleEn) {
    titleEn = $('h1.page-title, [data-ui-id="page-title-wrapper"], h1.product-name, h1').first().text().trim() ||
              $('meta[property="og:title"]').attr('content') ||
              $('title').text().replace(/\s*\|\s*Sporter.*$/i, '').trim();
  }

  if (!priceAed) {
    const specialPriceElem = $('[data-price-type="finalPrice"] .price, .special-price .price, .product-info-price .special-price');
    const oldPriceElem = $('[data-price-type="oldPrice"] .price, .old-price .price, .product-info-price .old-price, del .price, s .price');
    const regularPriceElem = $('[data-price-type="basePrice"] .price, .price-box .price, .product-info-price .price');

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
                      $('[itemprop="price"]').text();
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

  // DOM Swatch Extraction with Active Detection
  let activeFlavor: string | null = null;
  let activeSize: string | null = null;

  $('.swatch-attribute').each((_, el) => {
    const code = String($(el).attr('data-attribute-code') || $(el).attr('attribute-code') || '').toLowerCase();
    $(el).find('.swatch-option').each((__, optEl) => {
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

  // Out of stock detection in DOM
  const outOfStockText = $('.stock.unavailable, .out-of-stock, [data-stock="out"]').first().text();
  if (outOfStockText || isOutOfStockElement(html)) {
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
      retailer: 'Sporter',
      store: 'Sporter UAE',
      storeName: 'Sporter UAE',
      sourceUrl: normalizedUrl,
      selectedFlavor,
      selectedSize,
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants: validVariants,
      weightKg: 1.0,
      error: 'استخراج قیمت محصول از اسپورتر ناموفق بود.'
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
    retailer: 'Sporter',
    store: 'Sporter UAE',
    storeName: 'Sporter UAE',
    sourceUrl: normalizedUrl,
    selectedFlavor,
    selectedSize,
    flavors: cleanFlavors,
    sizes: cleanSizes,
    variants: validVariants,
    weightKg: 1.0,
    description
  };
}
