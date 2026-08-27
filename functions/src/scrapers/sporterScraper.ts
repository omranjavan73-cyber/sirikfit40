import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  cleanAndNormalizeUrl,
  extractPriceNumber,
  sanitizeImageUrl,
  normalizeToEnglishDigits,
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

export interface SporterScraperOptions {
  timeoutMs?: number;
  userAgent?: string;
}

// 1. Genuine Desktop Browser Fingerprint Headers
export const SPORTER_DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AE,en;q=0.9',
  'Referer': 'https://sporter.com/',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-user': '?1',
  'Upgrade-Insecure-Requests': '1'
};

/**
 * Strict Strikethrough & Crossed-Out Price Detector
 * Identifies del, s, strike, old-price, was-price, and strikethrough classes to prevent capturing non-active prices.
 */
export const isStruckOrOldPrice = ($: cheerio.CheerioAPI, el: any): boolean => {
  const node = $(el);
  const struckSelector = 'del, s, strike, [data-price-type="oldPrice"], .old-price, .original-price, .was-price, .line-through, .strikethrough, .price-box__old, .price-box__regular, [class*="oldPrice"], [class*="wasPrice"], [class*="strikethrough"]';
  
  if (node.is(struckSelector)) {
    return true;
  }
  if (node.closest(struckSelector).length > 0) {
    return true;
  }
  const cls = String(node.attr('class') || '').toLowerCase();
  if (
    cls.includes('old') ||
    cls.includes('original') ||
    cls.includes('strike') ||
    cls.includes('line-through') ||
    cls.includes('was-price') ||
    cls.includes('regular-price') ||
    cls.includes('price-box__old')
  ) {
    return true;
  }
  const style = String(node.attr('style') || '').toLowerCase();
  if (style.includes('line-through') || style.includes('text-decoration: line-through')) {
    return true;
  }
  return false;
};

/**
 * Helper to extract raw text content safely
 */
function cleanText(txt: any): string {
  if (!txt || typeof txt !== 'string') return '';
  return txt.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Anti-Fragile Sporter Multi-Tier Scraper Engine
 * - Tier 1: Next.js Hydration Block (<script id="__NEXT_DATA__" type="application/json">)
 * - Tier 2: OpenGraph & Meta Data (<meta property="og:*">, <meta property="product:price:amount">)
 * - Tier 3: Structured JSON-LD (<script type="application/ld+json">)
 * - Tier 4: Fallback Regex & DOM Sanitization with Strikethrough Price Exclusion
 */
export async function scrapeSporter(rawUrl: string, options?: SporterScraperOptions): Promise<SporterScraperResult> {
  const normalizedUrl = cleanAndNormalizeUrl(rawUrl) || rawUrl.trim();
  const headers = {
    ...SPORTER_DEFAULT_HEADERS,
    ...(options?.userAgent ? { 'User-Agent': options.userAgent } : {})
  };
  const timeout = options?.timeoutMs || 15000;

  // Build candidate URL variations (ensure /en-ae/ locale for accurate AED pricing)
  let enAeUrl = normalizedUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(normalizedUrl)) {
    enAeUrl = normalizedUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!normalizedUrl.includes('/en-ae/')) {
    enAeUrl = normalizedUrl.replace('sporter.com/', 'sporter.com/en-ae/');
  }
  const candidateUrls = Array.from(new Set([enAeUrl, normalizedUrl]));

  let html = '';
  for (const fetchUrl of candidateUrls) {
    try {
      const res = await axios.get(fetchUrl, {
        headers,
        timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });
      if (res.data && typeof res.data === 'string' && res.data.length > 300) {
        html = res.data;
        break;
      }
    } catch (err: any) {
      console.warn(`[sporterScraper] Direct HTTP fetch failed for ${fetchUrl}:`, err?.message || err);
    }
  }

  // 1-Retry with alternative desktop header if response is blocked or empty
  if (!html || html.length < 300 || html.includes('Attention Required! | Cloudflare') || html.includes('cf-browser-verification')) {
    try {
      const retryHeaders = {
        ...headers,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'sec-ch-ua-platform': '"macOS"'
      };
      const retryRes = await axios.get(enAeUrl, {
        headers: retryHeaders,
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });
      if (retryRes.data && typeof retryRes.data === 'string' && retryRes.data.length > 300) {
        html = retryRes.data;
      }
    } catch (_retryErr) {}
  }

  // Fallback: If still blocked or empty response, fetch via Jina Reader proxy
  if (!html || html.length < 300 || html.includes('Attention Required! | Cloudflare') || html.includes('cf-browser-verification')) {
    try {
      console.log(`[sporterScraper] Attempting Jina Reader proxy for ${enAeUrl}`);
      const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
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
      selectedFlavor: null,
      selectedSize: null,
      flavors: [],
      sizes: [],
      variants: [],
      weightKg: 1.0,
      error: 'امکان اتصال به وبسایت اسپورتر فراهم نشد.'
    };
  }

  const $ = cheerio.load(html);

  let titleEn = '';
  let brand = 'Sporter UAE';
  let activeSalePriceAed = 0;
  let regularPriceAed: number | undefined = undefined;
  let heroImage = '';
  const galleryImages: string[] = [];
  let description = '';
  let inStock = true;

  const flavorsList: string[] = [];
  const sizesList: string[] = [];
  let activeFlavor: string | null = null;
  let activeSize: string | null = null;
  const variants: any[] = [];

  // =========================================================================
  // TIER 1: Next.js Hydration Block (<script id="__NEXT_DATA__" type="application/json">)
  // =========================================================================
  try {
    const nextScript = $('#__NEXT_DATA__').html();
    if (nextScript) {
      const nextData = JSON.parse(nextScript);
      const pp = nextData?.props?.pageProps || {};
      const productObj =
        pp.product ||
        pp.initialState?.product ||
        pp.initialState?.catalog?.product ||
        pp.initialState?.pdp?.product ||
        pp.data?.product ||
        pp.initialData?.product ||
        pp.item ||
        pp.productDetails;

      if (productObj && typeof productObj === 'object') {
        // Title
        const nextTitle = productObj.name || productObj.title || productObj.product_name;
        if (nextTitle) titleEn = cleanText(nextTitle);

        // Brand
        const nextBrand = productObj.brand || productObj.manufacturer || productObj.brand_name || productObj.brand?.name;
        if (nextBrand && typeof nextBrand === 'string') brand = nextBrand.trim();

        // Description
        const nextDesc = productObj.description?.html || productObj.description || productObj.short_description?.html || productObj.short_description || productObj.overview;
        if (nextDesc) description = cleanText(nextDesc);

        // Stock
        if (productObj.stock_status === 'OUT_OF_STOCK' || productObj.is_salable === false || productObj.in_stock === false) {
          inStock = false;
        }

        // Active Discounted Price vs Regular Price
        // Check price_range.minimum_price (standard Next.js / GraphQL eCommerce structure)
        const priceRange = productObj.price_range?.minimum_price;
        if (priceRange) {
          const finalVal = extractPriceNumber(priceRange.final_price?.value ?? priceRange.final_price);
          const regVal = extractPriceNumber(priceRange.regular_price?.value ?? priceRange.regular_price);
          if (finalVal > 0) activeSalePriceAed = finalVal;
          if (regVal > 0 && regVal > (finalVal || 0)) regularPriceAed = regVal;
        }

        // Direct pricing fields if price_range was not populated
        if (!activeSalePriceAed) {
          const sp = extractPriceNumber(productObj.finalPrice ?? productObj.salePrice ?? productObj.special_price ?? productObj.final_price ?? productObj.specialPrice);
          const rp = extractPriceNumber(productObj.price ?? productObj.regular_price ?? productObj.regularPrice ?? productObj.oldPrice);
          if (sp > 0) {
            activeSalePriceAed = sp;
            if (rp > 0 && rp > sp) regularPriceAed = rp;
          } else if (rp > 0) {
            activeSalePriceAed = rp;
          }
        }

        // Images
        const nextHeroImg = productObj.image?.url || productObj.image || productObj.small_image?.url || productObj.thumbnail?.url || productObj.featured_image;
        if (nextHeroImg) {
          const sanitizedHero = sanitizeImageUrl(typeof nextHeroImg === 'string' ? nextHeroImg : nextHeroImg?.url, normalizedUrl);
          if (sanitizedHero) {
            heroImage = sanitizedHero;
            galleryImages.push(sanitizedHero);
          }
        }

        if (Array.isArray(productObj.media_gallery)) {
          productObj.media_gallery.forEach((m: any) => {
            const mUrl = sanitizeImageUrl(m.url || m.file || m, normalizedUrl);
            if (mUrl && !galleryImages.includes(mUrl)) galleryImages.push(mUrl);
          });
        }

        // Configurable Options & Selected Attributes (Flavors / Sizes)
        const configOptions = Array.isArray(productObj.configurable_options)
          ? productObj.configurable_options
          : (Array.isArray(productObj.variants) ? productObj.variants : (Array.isArray(productObj.options) ? productObj.options : []));

        configOptions.forEach((opt: any) => {
          const optLabel = String(opt.label || opt.attribute_code || opt.code || opt.title || '').toLowerCase();
          const isFlavor = optLabel.includes('flavor') || optLabel.includes('flavour') || optLabel.includes('طعم') || optLabel.includes('taste');
          const isSize = optLabel.includes('size') || optLabel.includes('weight') || optLabel.includes('حجم') || optLabel.includes('سایز') || optLabel.includes('serving');

          if (Array.isArray(opt.values)) {
            opt.values.forEach((v: any) => {
              const valLabel = String(v.label || v.store_label || v.name || v.value_index || '').trim();
              if (valLabel && !isArtificialFallback(valLabel)) {
                if (isFlavor) {
                  if (!flavorsList.includes(valLabel)) flavorsList.push(valLabel);
                  if (v.is_selected || v.selected || v.active) activeFlavor = valLabel;
                } else if (isSize) {
                  if (!sizesList.includes(valLabel)) sizesList.push(valLabel);
                  if (v.is_selected || v.selected || v.active) activeSize = valLabel;
                } else {
                  const lowerV = valLabel.toLowerCase();
                  if (lowerV.includes('kg') || lowerV.includes('g') || lowerV.includes('lb') || lowerV.includes('serving')) {
                    if (!sizesList.includes(valLabel)) sizesList.push(valLabel);
                    if (v.is_selected || v.selected || v.active) activeSize = valLabel;
                  } else {
                    if (!flavorsList.includes(valLabel)) flavorsList.push(valLabel);
                    if (v.is_selected || v.selected || v.active) activeFlavor = valLabel;
                  }
                }
              }
            });
          }
        });

        // Selected variant indicators
        if (productObj.selected_options || productObj.selectedVariant) {
          const sel = productObj.selected_options || productObj.selectedVariant;
          if (sel.flavor && typeof sel.flavor === 'string') activeFlavor = sel.flavor.trim();
          if (sel.size && typeof sel.size === 'string') activeSize = sel.size.trim();
        }
      }
    }
  } catch (_nextErr) {
    console.warn('[sporterScraper] Tier 1 Next.js parsing notice:', _nextErr);
  }

  // =========================================================================
  // TIER 2: OpenGraph & Meta Data Extraction
  // =========================================================================
  if (!titleEn) {
    const ogTitle = $('meta[property="og:title"]').attr('content') ||
                    $('meta[name="twitter:title"]').attr('content');
    if (ogTitle) {
      titleEn = cleanText(ogTitle.replace(/\s*\|\s*Sporter.*$/i, ''));
    }
  }

  if (!heroImage) {
    const ogImg = $('meta[property="og:image"]').attr('content') ||
                  $('meta[property="og:image:secure_url"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content');
    if (ogImg) {
      const sanitizedOg = sanitizeImageUrl(ogImg, normalizedUrl);
      if (sanitizedOg) {
        heroImage = sanitizedOg;
        if (!galleryImages.includes(sanitizedOg)) galleryImages.unshift(sanitizedOg);
      }
    }
  }

  if (!activeSalePriceAed) {
    const metaPrice = extractPriceNumber(
      $('meta[property="product:price:amount"]').attr('content') ||
      $('meta[property="og:price:amount"]').attr('content') ||
      $('meta[name="twitter:data1"]').attr('content')
    );
    if (metaPrice > 0) {
      activeSalePriceAed = metaPrice;
    }
  }

  // =========================================================================
  // TIER 3: Structured JSON-LD (<script type="application/ld+json">)
  // =========================================================================
  const jsonLdItems: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const txt = $(el).html();
      if (!txt) return;
      const parsed = JSON.parse(txt);
      if (Array.isArray(parsed['@graph'])) {
        jsonLdItems.push(...parsed['@graph']);
      } else if (Array.isArray(parsed)) {
        jsonLdItems.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        jsonLdItems.push(parsed);
      }
    } catch (_e) {}
  });

  for (const item of jsonLdItems) {
    if (!item || typeof item !== 'object') continue;
    const type = item['@type'];
    const isProduct = type === 'Product' || type === 'IndividualProduct' || (Array.isArray(type) && type.includes('Product')) || Boolean(item.offers);

    if (isProduct) {
      if (!titleEn && item.name) titleEn = cleanText(item.name);
      if (brand === 'Sporter UAE' && item.brand) {
        brand = typeof item.brand === 'string' ? item.brand.trim() : (item.brand.name ? String(item.brand.name).trim() : brand);
      }
      if (!description && item.description) description = cleanText(item.description);

      if (item.image) {
        const rawImgs = Array.isArray(item.image) ? item.image : [item.image];
        rawImgs.forEach((im: any) => {
          const u = sanitizeImageUrl(typeof im === 'string' ? im : (im?.url || im?.contentUrl), normalizedUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
        if (!heroImage && galleryImages.length > 0) heroImage = galleryImages[0];
      }

      const offers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
      for (const offer of offers) {
        if (!offer || typeof offer !== 'object') continue;
        const offerPrice = extractPriceNumber(offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price);
        const offerOldPrice = extractPriceNumber(offer.highPrice ?? offer.priceSpecification?.maxPrice);
        if (offerPrice > 0 && !activeSalePriceAed) {
          activeSalePriceAed = offerPrice;
        }
        if (offerOldPrice > 0 && offerOldPrice > (activeSalePriceAed || offerPrice)) {
          regularPriceAed = offerOldPrice;
        }
        if (offer.availability) {
          const availStr = String(offer.availability).toLowerCase();
          if (availStr.includes('outofstock') || availStr.includes('soldout')) {
            inStock = false;
          }
        }
      }
    }
  }

  // =========================================================================
  // TIER 4: DOM Selectors & Fallback Regex with Strict Strikethrough Omission
  // =========================================================================
  if (!titleEn) {
    titleEn = $('h1.page-title, [data-ui-id="page-title-wrapper"], h1.product-name, h1').first().text().trim() ||
              $('title').text().replace(/\s*\|\s*Sporter.*$/i, '').trim();
  }

  // Active price selectors in HTML (guaranteed non-struck)
  if (!activeSalePriceAed) {
    const activePriceSelectors = [
      '[data-price-type="finalPrice"] .price',
      '[data-price-type="finalPrice"]',
      '.special-price .price',
      '.special-price',
      '.product-info-price .special-price .price',
      '.product-info-price .special-price',
      '.price-box [data-price-type="finalPrice"]',
      '[itemprop="price"]',
      '.price-wrapper .price'
    ];

    for (const sel of activePriceSelectors) {
      $(sel).each((_, el) => {
        if (!isStruckOrOldPrice($, el)) {
          const p = extractPriceNumber($(el).text() || $(el).attr('content'));
          if (p > 0 && (!activeSalePriceAed || p < activeSalePriceAed)) {
            activeSalePriceAed = p;
          }
        }
      });
      if (activeSalePriceAed > 0) break;
    }
  }

  // Strikethrough / Old price selectors in HTML
  if (!regularPriceAed) {
    const oldPriceSelectors = [
      '[data-price-type="oldPrice"] .price',
      '[data-price-type="oldPrice"]',
      '.old-price .price',
      '.old-price',
      '.price-box__old .price',
      '.price-box__old',
      'del .price',
      'del',
      's .price',
      's',
      'strike',
      '.was-price'
    ];

    for (const sel of oldPriceSelectors) {
      $(sel).each((_, el) => {
        const p = extractPriceNumber($(el).text());
        if (p > 0 && p > (activeSalePriceAed || 0)) {
          regularPriceAed = p;
        }
      });
      if (regularPriceAed) break;
    }
  }

  // DOM Swatch Extraction (isolating active selected options vs all options)
  $('.swatch-attribute').each((_, el) => {
    const code = String($(el).attr('data-attribute-code') || $(el).attr('attribute-code') || '').toLowerCase();
    $(el).find('.swatch-option').each((__, optEl) => {
      const $opt = $(optEl);
      const isUnavailable = $opt.hasClass('disabled') ||
                            $opt.hasClass('out-of-stock') ||
                            $opt.hasClass('line-through') ||
                            $opt.hasClass('unavailable') ||
                            $opt.attr('disabled') !== undefined ||
                            $opt.attr('aria-disabled') === 'true' ||
                            isOutOfStockElement($opt.toString());
      if (isUnavailable) return;

      const label = $opt.text().trim() || $opt.attr('data-option-label') || $opt.attr('data-option-tooltip-value') || '';
      if (label && !isArtificialFallback(label)) {
        const isSelected = $opt.hasClass('selected') || $opt.hasClass('active') || $opt.attr('aria-selected') === 'true';
        if (code.includes('flavor') || code.includes('طعم')) {
          if (!flavorsList.includes(label)) flavorsList.push(label);
          if (isSelected) activeFlavor = label;
        } else if (code.includes('size') || code.includes('weight') || code.includes('حجم') || code.includes('سایز')) {
          if (!sizesList.includes(label)) sizesList.push(label);
          if (isSelected) activeSize = label;
        }
      }
    });
  });

  if (!heroImage) {
    const imgEl = $('.gallery-placeholder img, [itemprop="image"], .fotorama__img, .product-image-photo').first().attr('src');
    if (imgEl) {
      heroImage = sanitizeImageUrl(imgEl, normalizedUrl);
      if (heroImage && !galleryImages.includes(heroImage)) galleryImages.unshift(heroImage);
    }
  }

  // Check out of stock indicators in DOM
  const outOfStockText = $('.stock.unavailable, .out-of-stock, [data-stock="out"]').first().text();
  if (outOfStockText || isOutOfStockElement(html)) {
    inStock = false;
  }

  // Deduplicate and sanitize option lists
  const cleanFlavors = deduplicateStrings(flavorsList);
  const cleanSizes = deduplicateStrings(sizesList);

  // Variant Handling Specification:
  // - Extract strictly the selected flavor and size if active variants exist on the page.
  // - If the item is standalone with no option selectors, return selectedFlavor: null and selectedSize: null.
  const selectedFlavor: string | null = cleanFlavors.length > 0
    ? ((activeFlavor && cleanFlavors.includes(activeFlavor)) ? activeFlavor : cleanFlavors[0])
    : null;

  const selectedSize: string | null = cleanSizes.length > 0
    ? ((activeSize && cleanSizes.includes(activeSize)) ? activeSize : cleanSizes[0])
    : null;

  // Final Price & Discount Calculations
  const finalPriceAed = activeSalePriceAed > 0 ? activeSalePriceAed : 0;
  let finalOriginalPriceAed: number | undefined = undefined;
  if (regularPriceAed && regularPriceAed > finalPriceAed && finalPriceAed > 0) {
    finalOriginalPriceAed = regularPriceAed;
  }

  let discountPercent: number | undefined = undefined;
  if (finalOriginalPriceAed && finalOriginalPriceAed > finalPriceAed && finalPriceAed > 0) {
    discountPercent = Math.round(((finalOriginalPriceAed - finalPriceAed) / finalOriginalPriceAed) * 100);
  }

  const titleFa = generateBilingualProductTitle(titleEn, brand);

  if (!finalPriceAed || finalPriceAed <= 0) {
    return {
      success: false,
      ok: false,
      titleFa,
      titleEn,
      title: titleEn,
      brand,
      priceAed: 0,
      image: heroImage,
      imageUrl: heroImage,
      galleryImages,
      inStock: false,
      retailer: 'Sporter',
      store: 'Sporter UAE',
      storeName: 'Sporter UAE',
      sourceUrl: normalizedUrl,
      selectedFlavor: null,
      selectedSize: null,
      flavors: cleanFlavors,
      sizes: cleanSizes,
      variants,
      weightKg: 1.0,
      error: 'استخراج قیمت فعال محصول از اسپورتر ناموفق بود.'
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
    image: heroImage,
    imageUrl: heroImage,
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
    variants,
    weightKg: 1.0,
    description
  };
}

export default scrapeSporter;

