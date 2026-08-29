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
  USER_AGENT_ROTATION_POOL,
  getRandomUserAgent
} from './utils';

export interface IherbScraperResult {
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
  retailer: 'iHerb';
  store: string;
  storeName: string;
  sourceUrl: string;
  selectedFlavor?: string | null;
  selectedSize?: string | null;
  flavors: string[];
  sizes: string[];
  variants: any[];
  variantMatrix?: {
    sizes: string[];
    flavors: string[];
    items: any[];
    selectedVariant?: any;
  };
  variantGroups?: any[];
  weightKg: number;
  description?: string;
  error?: string;
}

export interface IherbScraperOptions {
  timeoutMs?: number;
  userAgent?: string;
  forceRefresh?: boolean;
}

/**
 * Resolves an iHerb CDN image URL to its highest-resolution direct CDN image link.
 * On iHerb's CDN (images.iherb.com), thumbnail/medium images are placed under /m/, /s/, /t/, /v/, /c/.
 * The full, uncompressed high-res master photo is under /l/ (large).
 */
export function resolveIherbHighResImage(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim();
  if (clean.startsWith('//')) clean = 'https:' + clean;

  if (clean.includes('iherb.com') || clean.includes('images-iherb.com')) {
    // Replace medium/small/thumbnail tokens /m/, /s/, /t/, /v/, /c/ with /l/ (large)
    clean = clean.replace(/(\/images\.iherb\.com\/)(?:m|s|t|v|c)(\/[a-z0-9_-]+\.(?:jpg|png|webp|jpeg))/i, '$1l$2');
    clean = clean.replace(/(\/)(?:m|s|t|v|c)(\/[a-z0-9_-]+\.(?:jpg|png|webp|jpeg))/i, '$1l$2');

    // Strip size constraint query params (like ?v=...&w=120&h=120) to preserve full dimensions
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
 * Normalizes an iHerb URL to ensure ae.iherb.com domain for direct AED pricing
 */
export function normalizeIherbUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = cleanAndNormalizeUrl(url);
  try {
    const parsed = new URL(clean);
    if (parsed.hostname.toLowerCase().includes('iherb.com')) {
      parsed.hostname = 'ae.iherb.com';
      // Ensure english language path prefix if missing
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      clean = parsed.toString();
    }
  } catch (_e) {}
  return clean;
}

/**
 * High-precision HTML parser for iHerb product pages
 */
export function parseIherbHtml(html: string, sourceUrl: string): IherbScraperResult {
  const $ = cheerio.load(html);

  let titleEn = '';
  let brand = '';
  let priceAed = 0;
  let originalPriceAed = 0;
  let image = '';
  const galleryImages: string[] = [];
  let inStock = true;
  let description = '';
  const flavorsList: string[] = [];
  const sizesList: string[] = [];
  const parsedVariants: any[] = [];

  // =========================================================================
  // STAGE 1: PARSE STRUCTURED DATA (application/ld+json)
  // =========================================================================
  const jsonLdScripts = $('script[type="application/ld+json"]');
  jsonLdScripts.each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : (parsed['@graph'] ? parsed['@graph'] : [parsed]);

      for (const item of items) {
        if (!item) continue;
        const type = String(item['@type'] || '');
        const isProduct = type === 'Product' || type === 'IndividualProduct' || item.offers || item.sku;

        if (isProduct) {
          // 1. Title (EN)
          if (!titleEn && (item.name || item.headline)) {
            titleEn = String(item.name || item.headline).trim();
          }

          // 2. Brand
          if (!brand) {
            if (typeof item.brand === 'string') {
              brand = item.brand.trim();
            } else if (item.brand && typeof item.brand.name === 'string') {
              brand = item.brand.name.trim();
            }
          }

          // 3. Description
          if (!description && item.description) {
            description = String(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
          }

          // 4. Main & Gallery Images
          if (item.image) {
            const rawImgs = Array.isArray(item.image) ? item.image : [item.image];
            rawImgs.forEach((imgObj: any) => {
              const src = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.contentUrl || '');
              if (src) {
                const highRes = resolveIherbHighResImage(src);
                if (highRes && !galleryImages.includes(highRes)) {
                  galleryImages.push(highRes);
                }
              }
            });
          }

          // 5. Offers & Pricing (AED)
          if (item.offers) {
            const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (const off of offersList) {
              if (!off) continue;
              const rawPrice = off.price ?? off.lowPrice ?? off.priceAmount;
              if (rawPrice !== undefined && rawPrice !== null) {
                const parsedNum = parseFloat(normalizeToEnglishDigits(String(rawPrice)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (!isNaN(parsedNum) && parsedNum > 0) {
                  if (priceAed === 0) {
                    priceAed = Math.round(parsedNum * 100) / 100;
                  }
                }
              }

              // Original / High price
              const rawHighPrice = off.highPrice ?? off.regularPrice;
              if (rawHighPrice !== undefined && rawHighPrice !== null) {
                const parsedHigh = parseFloat(normalizeToEnglishDigits(String(rawHighPrice)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (!isNaN(parsedHigh) && parsedHigh > priceAed) {
                  originalPriceAed = Math.round(parsedHigh * 100) / 100;
                }
              }

              // Availability
              if (off.availability) {
                const availStr = String(off.availability).toLowerCase();
                if (availStr.includes('outofstock') || availStr.includes('discontinued') || availStr.includes('soldout')) {
                  inStock = false;
                } else if (availStr.includes('instock')) {
                  inStock = true;
                }
              }
            }
          }
        }
      }
    } catch (_ldErr) {}
  });

  // =========================================================================
  // STAGE 2: DOM FALLBACK SELECTORS FOR MISSING OR TRUNCATED FIELDS
  // =========================================================================
  // Title Fallbacks
  if (!titleEn) {
    titleEn = $(
      '#name, h1.product-title, h1#name, h1[itemprop="name"], [data-qa-element="product-title"], h1.page-title, h1'
    ).first().text().trim();
  }

  // Brand Fallbacks
  if (!brand) {
    brand = $(
      '#brand a, .product-brand, [itemprop="brand"] a, [itemprop="brand"], [data-qa-element="brand-name"], #brand, .brand-name'
    ).first().text().trim();
  }
  if (!brand && titleEn) {
    const parts = titleEn.split(',');
    if (parts.length > 1 && parts[0].trim().length < 40) {
      brand = parts[0].trim();
    }
  }
  if (!brand) {
    brand = 'iHerb';
  }

  // Pricing Fallbacks (AED on ae.iherb.com or DOM elements)
  if (priceAed === 0) {
    const priceSelectors = [
      '.our-price',
      '.product-price-amount',
      '#price',
      'b[itemprop="price"]',
      '[itemprop="price"]',
      '.price-inner',
      '.discount-price',
      '[data-qa-element="product-price"]',
      '.product-price .price',
      '.price'
    ];

    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (el.length > 0) {
        const text = el.text().trim();
        const num = extractPriceNumber(text);
        if (num > 0) {
          priceAed = num;
          break;
        }
      }
    }

    // Check meta tags
    if (priceAed === 0) {
      const metaPrice = $('meta[property="product:price:amount"], meta[itemprop="price"]').attr('content');
      if (metaPrice) {
        const p = parseFloat(normalizeToEnglishDigits(metaPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
        if (!isNaN(p) && p > 0) priceAed = Math.round(p * 100) / 100;
      }
    }
  }

  // Original Price Fallbacks
  if (originalPriceAed === 0) {
    const origSelectors = [
      '.list-price',
      '.retail-price',
      '.regular-price',
      '.was-price',
      's[class*="price"]',
      'del[class*="price"]',
      '.strike-price'
    ];
    for (const sel of origSelectors) {
      const el = $(sel).first();
      if (el.length > 0) {
        const num = extractPriceNumber(el.text().trim());
        if (num > priceAed) {
          originalPriceAed = num;
          break;
        }
      }
    }
  }

  // Image Fallbacks
  if (galleryImages.length === 0) {
    const mainImgEl = $('#main-image, img.hero-image, [itemprop="image"], .product-image img, #product-image');
    mainImgEl.each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-large-img') || $(el).attr('data-src') || $(el).attr('content');
      if (src) {
        const hr = resolveIherbHighResImage(src);
        if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
      }
    });

    // Thumbnails on the page
    $('.thumbnail-container img, .image-thumbnail img, .product-image-thumbnail img, [data-qa-element="thumbnail-image"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src) {
        const hr = resolveIherbHighResImage(src);
        if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
      }
    });

    // OpenGraph image
    if (galleryImages.length === 0) {
      const og = $('meta[property="og:image"], meta[name="twitter:image"]').attr('content');
      if (og) {
        const hr = resolveIherbHighResImage(og);
        if (hr) galleryImages.push(hr);
      }
    }
  }

  image = galleryImages[0] || '';

  // In-stock status check from DOM
  const outOfStockEl = $('.out-of-stock-label, .discontinued-badge, [data-qa-element="out-of-stock"], .status-out-of-stock');
  if (outOfStockEl.length > 0) {
    inStock = false;
  }
  const stockText = $('.stock-status, #stock-status').text().toLowerCase();
  if (stockText.includes('out of stock') || stockText.includes('discontinued')) {
    inStock = false;
  }

  // Description fallback
  if (!description) {
    description = $('.product-overview, #overview, #product-summary, [itemprop="description"], .item-row')
      .first().text().replace(/\s+/g, ' ').trim().slice(0, 1500);
  }

  // =========================================================================
  // STAGE 3: MULTI-VARIANT PARSING (Flavors, Sizes, Package Quantities)
  // =========================================================================
  // Check embedded window.__INITIAL_STATE__ or product json scripts
  $('script:not([type])').each((_, el) => {
    const text = $(el).html() || '';
    if (text.includes('catalogData') || text.includes('productData') || text.includes('attributeGroups')) {
      try {
        const jsonMatch = text.match(/window\.(?:__INITIAL_STATE__|catalogData|productData|initData)\s*=\s*(\{[\s\S]*?\});/);
        if (jsonMatch && jsonMatch[1]) {
          const state = JSON.parse(jsonMatch[1]);
          const p = state?.product || state?.catalog || state?.data?.product;
          if (p?.attributes || p?.variants) {
            (p.attributes || []).forEach((attr: any) => {
              const attrName = String(attr.name || attr.title || '').toLowerCase();
              const isFlv = attrName.includes('flavor') || attrName.includes('taste');
              const isSz = attrName.includes('size') || attrName.includes('count') || attrName.includes('package') || attrName.includes('serving');

              (attr.options || attr.values || []).forEach((opt: any) => {
                const optName = typeof opt === 'string' ? opt : (opt.name || opt.title || opt.value || '');
                if (optName && optName.length > 1) {
                  if (isFlv && !flavorsList.includes(optName)) flavorsList.push(optName);
                  if (isSz && !sizesList.includes(optName)) sizesList.push(optName);
                }
              });
            });
          }
        }
      } catch (_sErr) {}
    }
  });

  // DOM attribute groups:
  const attributeGroups = $('.attribute-group, [data-qa-element="attribute-group"], .attribute-picker');
  attributeGroups.each((_, grp) => {
    const grpNode = $(grp);
    const grpHeader = grpNode.find('.attribute-name, [data-qa-element="attribute-name"], label').text().trim().toLowerCase();
    const isFlavor = grpHeader.includes('flavor') || grpHeader.includes('طعم') || grpHeader.includes('taste');
    const isSize = grpHeader.includes('size') || grpHeader.includes('package') || grpHeader.includes('count') || grpHeader.includes('serving') || grpHeader.includes('وزن') || grpHeader.includes('سایز');

    const tiles = grpNode.find('.attribute-tile, .attribute-item, .attribute-option, a[data-part-number], button[data-part-number], [data-qa-element="attribute-tile"]');
    tiles.each((idx, tile) => {
      const tileNode = $(tile);
      const optName = tileNode.attr('title') || tileNode.attr('data-val') || tileNode.find('.attribute-tile-text').text().trim() || tileNode.text().trim();
      if (!optName || optName.length < 2 || optName.length > 60) return;

      const optImgRaw = tileNode.find('img').attr('src') || tileNode.attr('data-image');
      const optImg = optImgRaw ? resolveIherbHighResImage(optImgRaw) : undefined;
      const optPriceRaw = tileNode.find('.attribute-price, [data-qa-element="attribute-price"]').text().trim();
      const optPrice = optPriceRaw ? extractPriceNumber(optPriceRaw) : priceAed;
      const isUnavailable = tileNode.hasClass('disabled') || tileNode.hasClass('out-of-stock') || tileNode.attr('aria-disabled') === 'true';

      if (isFlavor) {
        if (!flavorsList.includes(optName)) flavorsList.push(optName);
      } else if (isSize) {
        if (!sizesList.includes(optName)) sizesList.push(optName);
      } else {
        const lowerOpt = optName.toLowerCase();
        if (lowerOpt.includes('lb') || lowerOpt.includes('kg') || lowerOpt.includes('g') || lowerOpt.includes('count') || lowerOpt.includes('capsules') || lowerOpt.includes('veggie') || lowerOpt.includes('tablets') || lowerOpt.includes('servings')) {
          if (!sizesList.includes(optName)) sizesList.push(optName);
        } else {
          if (!flavorsList.includes(optName)) flavorsList.push(optName);
        }
      }

      parsedVariants.push({
        id: `iherb-opt-${idx}-${Date.now()}`,
        title: optName,
        name: optName,
        flavor: isFlavor ? optName : undefined,
        size: isSize ? optName : undefined,
        priceAED: optPrice || priceAed,
        priceAed: optPrice || priceAed,
        image: optImg,
        inStock: !isUnavailable
      });
    });
  });

  // Calculate discount percent
  let discountPercent: number | undefined = undefined;
  if (originalPriceAed > priceAed) {
    discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
  }

  // Weight estimation from title/description
  let weightKg = 0.8;
  const kgMatch = (titleEn + ' ' + description).match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilos)/i);
  if (kgMatch && kgMatch[1]) {
    weightKg = parseFloat(kgMatch[1]);
  } else {
    const lbsMatch = (titleEn + ' ' + description).match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pound)/i);
    if (lbsMatch && lbsMatch[1]) {
      weightKg = Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 100) / 100;
    }
  }

  // Generate Persian title draft: ${brand} - ${titleEn}
  const titleFa = generateBilingualProductTitle(titleEn, brand);

  // Unified variant groups structure
  const variantGroups: any[] = [];
  if (flavorsList.length > 0) {
    variantGroups.push({
      id: 'flavors',
      name: 'طعم (Flavor)',
      type: 'flavor',
      options: flavorsList.map((f, i) => ({
        id: `flv-${i}`,
        name: f,
        priceAed,
        priceAED: priceAed,
        inStock: true
      }))
    });
  }
  if (sizesList.length > 0) {
    variantGroups.push({
      id: 'sizes',
      name: 'وزن / بسته‌بندی (Size)',
      type: 'size',
      options: sizesList.map((s, i) => ({
        id: `sz-${i}`,
        name: s,
        priceAed,
        priceAED: priceAed,
        inStock: true
      }))
    });
  }

  // Build matrix items
  const matrixItems = parsedVariants.length > 0 ? parsedVariants : [
    {
      id: `iherb-main-${Date.now()}`,
      title: titleEn || 'گزینه اصلی',
      name: titleEn || 'گزینه اصلی',
      flavor: flavorsList[0] || undefined,
      size: sizesList[0] || undefined,
      priceAED: priceAed,
      priceAed,
      originalPriceAED: originalPriceAed || undefined,
      originalPriceAed: originalPriceAed || undefined,
      image,
      inStock
    }
  ];

  return {
    success: priceAed > 0 && Boolean(titleEn),
    ok: priceAed > 0 && Boolean(titleEn),
    titleFa,
    titleEn: titleEn || 'iHerb Product',
    title: titleFa,
    brand,
    priceAed,
    priceAED: priceAed,
    originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
    originalPriceAED: originalPriceAed > priceAed ? originalPriceAed : undefined,
    discountPercent,
    image,
    imageUrl: image,
    galleryImages: galleryImages.length > 0 ? galleryImages : (image ? [image] : []),
    inStock,
    retailer: 'iHerb',
    store: 'iHerb',
    storeName: 'iHerb',
    sourceUrl,
    selectedFlavor: flavorsList[0] || null,
    selectedSize: sizesList[0] || null,
    flavors: flavorsList,
    sizes: sizesList,
    variants: matrixItems,
    variantMatrix: {
      sizes: sizesList,
      flavors: flavorsList,
      items: matrixItems,
      selectedVariant: matrixItems[0]
    },
    variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
    weightKg,
    description
  };
}

/**
 * Executes a full multi-tier fetch and scrape for an iHerb product URL
 */
export async function scrapeIherb(
  url: string,
  options: IherbScraperOptions = {}
): Promise<IherbScraperResult> {
  const normalizedUrl = normalizeIherbUrl(url);
  const timeout = options.timeoutMs || 8000;
  const ua = options.userAgent || getRandomUserAgent();

  const headers = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-AE,en;q=0.9,ar-AE;q=0.8,fa;q=0.7',
    'Cookie': 'ih-preference=ctry=AE&lan=en-US&curr=AED;',
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

  // Tier 1: Direct SSR Fetch with UAE Preferences
  try {
    const res = await axios.get(normalizedUrl, {
      headers,
      timeout,
      validateStatus: (status) => status < 400
    });

    if (res.data && typeof res.data === 'string' && res.data.length > 200) {
      const parsed = parseIherbHtml(res.data, normalizedUrl);
      if (parsed.success && parsed.priceAed > 0) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn(`[scrapeIherb] Direct fetch failed for ${normalizedUrl}: ${err.message}. Trying proxies...`);
  }

  // Tier 2: Jina AI Reader Proxy
  try {
    const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: {
        'User-Agent': ua,
        'X-With-Images-Summary': 'true',
        'X-No-Cache': 'true'
      },
      timeout: timeout + 3000
    });

    if (jinaRes.data && typeof jinaRes.data === 'string' && jinaRes.data.length > 100) {
      const parsed = parseIherbHtml(jinaRes.data, normalizedUrl);
      if (parsed.success && parsed.priceAed > 0) {
        return parsed;
      }
    }
  } catch (jinaErr: any) {
    console.warn(`[scrapeIherb] Jina proxy fallback failed for ${normalizedUrl}:`, jinaErr.message);
  }

  return {
    success: false,
    ok: false,
    titleFa: '',
    titleEn: '',
    title: '',
    brand: 'iHerb',
    priceAed: 0,
    image: '',
    imageUrl: '',
    galleryImages: [],
    inStock: false,
    retailer: 'iHerb',
    store: 'iHerb',
    storeName: 'iHerb',
    sourceUrl: normalizedUrl,
    flavors: [],
    sizes: [],
    variants: [],
    weightKg: 0.8,
    error: 'امکان استخراج اطلاعات از لینک iHerb وجود نداشت. لطفاً از صحت لینک اطمینان حاصل فرمایید.'
  };
}
