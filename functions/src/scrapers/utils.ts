import crypto from 'crypto';
import * as cheerio from 'cheerio';

// 1. Genuine Browser Header Stack Emulation (Modern Chrome Desktop)
export const USER_AGENT_ROTATION_POOL = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
];

export const BROWSER_USER_AGENT = USER_AGENT_ROTATION_POOL[0];

export const getRandomUserAgent = (exclude?: string): string => {
  const filtered = exclude ? USER_AGENT_ROTATION_POOL.filter(u => u !== exclude) : USER_AGENT_ROTATION_POOL;
  return filtered[Math.floor(Math.random() * filtered.length)] || USER_AGENT_ROTATION_POOL[0];
};

export const extractDrNutritionHandle = (url: string): string | null => {
  if (!url || typeof url !== 'string') return null;
  try {
    const clean = url.trim().split('?')[0].split('#')[0].replace(/\.json$/i, '').replace(/\.html$/i, '');
    const match = clean.match(/\/(?:products|product)\/([^/?#]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    const parts = clean.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && !['en-ae', 'ar-ae', 'products', 'product', 'drnutrition.com', 'www.drnutrition.com'].includes(last.toLowerCase())) {
      return last.trim();
    }
  } catch (_e) {}
  return null;
};

export const getStandardScraperHeaders = (targetUrl?: string, customUserAgent?: string) => {
  let host = '';
  if (targetUrl) {
    try {
      host = new URL(targetUrl).hostname;
    } catch (_e) {}
  }

  const ua = customUserAgent || BROWSER_USER_AGENT;

  return {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8,application/json;q=0.9',
    'Accept-Language': 'en-AE,en-US;q=0.9,en;q=0.8,ar;q=0.7,fa;q=0.6',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'Upgrade-Insecure-Requests': '1',
    ...(host ? { 'Host': host } : {})
  };
};

// 2. URL Normalization & Sanitization (Strip tracking query params & normalize regional paths)
export const cleanAndNormalizeUrl = (inputUrl: string): string => {
  if (!inputUrl || typeof inputUrl !== 'string') return '';
  const trimmed = inputUrl.trim();
  const httpIndex = trimmed.search(/https?:\/\//i);
  let clean = httpIndex !== -1 ? trimmed.slice(httpIndex) : trimmed;
  const match = clean.match(/^(https?:\/\/[^\s]+)/i);
  if (match) clean = match[1];

  try {
    const urlObj = new URL(clean);
    // Strip common tracking and marketing query parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'ref_', 'fbclid', 'gclid', 'gbraid', 'wbraid', '_ga', '_gl',
      'affiliate_id', 'aff_id', 'aff_sub', 'clickid', 'zanpid', 'ncid',
      'msclkid', 'twclid', 'yclid', 'source', 'tag'
    ];
    trackingParams.forEach(p => urlObj.searchParams.delete(p));

    let pathname = urlObj.pathname;
    const hostname = urlObj.hostname.toLowerCase();

    // Sporter UAE normalization
    if (hostname.includes('sporter.com')) {
      if (/\/(ar|en)-[a-z]{2}\//i.test(pathname)) {
        pathname = pathname.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
      } else if (!pathname.startsWith('/en-ae/')) {
        pathname = '/en-ae' + (pathname.startsWith('/') ? pathname : `/${pathname}`);
      }
      urlObj.pathname = pathname;
    }

    // Dr. Nutrition UAE normalization
    if (hostname.includes('drnutrition.com')) {
      if (/\/(ar|en)-[a-z]{2}\//i.test(pathname)) {
        pathname = pathname.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
      } else if (!pathname.startsWith('/en-ae/')) {
        pathname = '/en-ae' + (pathname.startsWith('/') ? pathname : `/${pathname}`);
      }
      urlObj.pathname = pathname;
    }

    let normalized = urlObj.toString();
    if (normalized.endsWith('/') && urlObj.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch (_e) {
    return clean;
  }
};

// 3. SHA-256 URL Hash Utility for Cache Indexing
export const hashUrl = (urlStr: string): string => {
  const normalized = cleanAndNormalizeUrl(urlStr).toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

// 4. Strict Out-Of-Stock & Disabled Filter
export const isOutOfStockElement = (tagHtml: string, rawText?: string): boolean => {
  if (!tagHtml && !rawText) return false;
  const tag = (tagHtml || '').toLowerCase();
  const text = (rawText || '').toLowerCase();

  if (
    tag.includes('disabled') ||
    tag.includes('aria-disabled="true"') ||
    tag.includes('data-in-stock="false"') ||
    tag.includes('data-available="false"') ||
    tag.includes('data-stock="out"') ||
    tag.includes('data-stock="0"') ||
    tag.includes('data-unavailable="true"') ||
    tag.includes('aria-hidden="true"')
  ) return true;

  const outOfStockClasses = [
    'disabled', 'unavailable', 'out-of-stock', 'out_of_stock', 'sold-out', 'sold_out',
    'is-disabled', 'inactive', 'dimmed', 'strikethrough', 'line-through',
    'is-soldout', 'soldout', 'unavailable-variant', 'disabled-item', 'out-stock',
    'no-stock', 'item-disabled', 'is-unavailable'
  ];
  for (const cls of outOfStockClasses) {
    if (new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i').test(tag)) return true;
  }

  if (/style=["'][^"']*(?:text-decoration\s*:\s*line-through|opacity\s*:\s*0\.[1-4]|display\s*:\s*none)[^"']*["']/i.test(tag)) return true;
  if (tag.includes('<s>') || tag.includes('<strike>') || tag.includes('<del>') || tag.includes('line-through')) return true;

  const outKeywords = ['out of stock', 'currently unavailable', 'sold out', 'sold-out', 'unavailable', 'ناموجود', 'تمام شد', 'غیرفعال'];
  for (const kw of outKeywords) {
    if (text.includes(kw) || tag.includes(kw)) return true;
  }
  return false;
};

// 5. High-Res Image Sanitizer (Strict Logo / Badge / Icon / SVG Filtering & CDN Normalization)
export const isInvalidDrNutritionImage = (rawUrl: string): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return true;
  const lower = rawUrl.toLowerCase().trim();

  // Reject SVG and data URLs
  if (lower.startsWith('data:image/svg') || lower.endsWith('.svg') || lower.includes('.svg?')) {
    return true;
  }

  // Reject explicit logo, branding, and placeholder keywords
  const invalidKeywords = [
    'logo',
    'dnp_logo',
    'dnp-logo',
    'dnp.png',
    'dnp.jpg',
    'dnp.webp',
    'dnp.svg',
    'dnp_header',
    'dnp_icon',
    'og-logo',
    'vector.svg',
    'drnutrition_logo',
    'drnutrition-logo',
    '/media/logo/',
    '/media/logos/',
    '/stores/1/dnp',
    'placeholder',
    'default_logo',
    'store_logo',
    'favicon',
    'badge',
    'icon',
    'banner',
    'header-logo',
    'footer-logo',
    'site-logo',
    'tamara',
    'tabby',
    'payment',
    'visa',
    'mastercard',
    'applepay',
    'pixel',
    '1x1',
    'spacer',
    'blank.gif',
    'spinner',
    'loading'
  ];

  for (const kw of invalidKeywords) {
    if (lower.includes(kw)) {
      // If it contains logo or placeholder, reject immediately even if in catalog
      return true;
    }
  }

  // Extract path and filename
  try {
    const urlObj = new URL(lower.startsWith('http') ? lower : `https://drnutrition.com${lower.startsWith('/') ? '' : '/'}${lower}`);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';

    if (
      filename.includes('logo') ||
      filename.includes('dnp') ||
      filename.includes('placeholder') ||
      filename.includes('icon') ||
      filename.includes('badge') ||
      filename.includes('banner')
    ) {
      return true;
    }
  } catch (_e) {}

  return false;
};

/**
 * Clean Dr. Nutrition product slug into clean search keywords for live API querying
 */
export const cleanDrNutritionSlugForSearch = (slug: string): string => {
  if (!slug || typeof slug !== 'string') return '';
  return slug
    .trim()
    .replace(/^product\//i, '')
    .replace(/\.html?$/i, '')
    .replace(/-(?:bb|jug|shaker|bottle|free|promo|bundle|gift|offer)-.*/gi, '')
    .replace(/-bb-?\d+(?:\.\d+)?l?(?:-jug)?/gi, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const sanitizeImageUrl = (rawImg: string, cleanUrl: string = ''): string => {
  if (!rawImg || typeof rawImg !== 'string') return '';
  let str = String(rawImg).trim().replace(/&amp;/g, '&').replace(/^["']|["']$/g, '').trim();

  // 1. Normalize protocol and relative paths
  if (str.startsWith('//')) {
    str = 'https:' + str;
  } else if (str.startsWith('/')) {
    try {
      const u = new URL(cleanUrl || 'https://drnutrition.com');
      str = `${u.protocol}//${u.host}${str}`;
    } catch (_e) {
      str = 'https://www.drnutrition.com' + str;
    }
  } else if (str.startsWith('http://')) {
    str = str.replace('http://', 'https://');
  }

  str = str.split('"')[0].split("'")[0].split('\\')[0].trim();

  // 2. Validate URL syntax
  try {
    const parsedUrl = new URL(str);
    // Strip downscaling and cache query parameters from image CDN URLs if needed
    if (parsedUrl.hostname.includes('drnutrition.com') || parsedUrl.hostname.includes('cdn.shopify.com')) {
      parsedUrl.searchParams.delete('width');
      parsedUrl.searchParams.delete('height');
      parsedUrl.searchParams.delete('crop');
    }
    str = parsedUrl.toString();
  } catch (_urlErr) {
    return '';
  }

  // 3. Strict logo / badge / placeholder check
  if (isInvalidDrNutritionImage(str)) {
    return '';
  }

  // 4. Upgrade Shopify/Magento/E-Commerce thumbnail images to high-res master/1024x1024
  str = str.replace(/_(?:small|compact|thumb|medium|100x100|150x150|200x200|240x240|300x300)\.(jpe?g|png|webp|avif)/gi, '_1024x1024.$1');
  return str;
};

/**
 * Strict Hierarchical Image Resolution for Dr. Nutrition
 * Tier 1: OpenGraph & Meta Image (og:image, product:image, twitter:image)
 * Tier 2: Schema.org JSON-LD (Product.image)
 * Tier 3: DOM Selectors (.product-image-photo, .gallery-placeholder img, .fotorama__img, [itemprop="image"])
 */
export const extractDrNutritionImageHierarchical = ($: cheerio.CheerioAPI, sourceUrl: string): { mainImage: string; galleryImages: string[] } => {
  const galleryImages: string[] = [];
  const addCandidate = (raw: any): boolean => {
    if (!raw) return false;
    const url = typeof raw === 'string' ? raw : (raw?.url || raw?.src || raw?.contentUrl || raw?.full || raw?.file);
    if (!url || typeof url !== 'string') return false;
    const clean = sanitizeImageUrl(url, sourceUrl);
    if (clean && !isInvalidDrNutritionImage(clean)) {
      if (!galleryImages.includes(clean)) {
        galleryImages.push(clean);
      }
      return true;
    }
    return false;
  };

  // Tier 1: OpenGraph & Meta Tags
  const metaCandidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[property="product:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content')
  ];
  for (const m of metaCandidates) {
    addCandidate(m);
  }

  // Tier 2: JSON-LD Schema
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed]);
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const isProduct = item['@type'] === 'Product' || item['@type'] === 'IndividualProduct' || Boolean(item.offers);
        if (isProduct && item.image) {
          if (Array.isArray(item.image)) {
            item.image.forEach(addCandidate);
          } else {
            addCandidate(item.image);
          }
        }
      }
    } catch (_e) {}
  });

  // Tier 3: Specific DOM Selectors
  const domSelectors = [
    '.product-image-photo',
    '.gallery-placeholder img',
    '[data-gallery-role="gallery-placeholder"] img',
    '.fotorama__img',
    '.fotorama__stage__frame img',
    '[itemprop="image"]',
    '.product.media img',
    '.product-image-gallery img',
    'img[src*="/media/catalog/product/"]',
    'img[src*="/products/"]',
    'img[data-src*="/media/catalog/product/"]',
    'img[data-original*="/media/catalog/product/"]'
  ];

  for (const selector of domSelectors) {
    $(selector).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original') || $(el).attr('data-zoom-image') || $(el).attr('data-full');
      addCandidate(src);
    });
  }

  const mainImage = galleryImages.length > 0 ? galleryImages[0] : '';
  return { mainImage, galleryImages };
};

/**
 * Title Sanitization & Promotional Suffix Cleaning
 * Removes store name and promotional suffixes like "BB 3.2L Jug", "Free Shaker", etc.
 */
export const cleanDrNutritionTitle = (rawTitle: string): string => {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let clean = rawTitle.trim();

  // Remove store branding
  clean = clean.replace(/\s*\|\s*Dr\.?\s*Nutrition.*$/i, '');
  clean = clean.replace(/\s*-\s*Dr\.?\s*Nutrition.*$/i, '');
  clean = clean.replace(/\s*-\s*Official\s*Store.*$/i, '');

  // Remove promotional bundle suffixes (e.g., "(BB 3.2L Jug)", "BB 3.2L Jug", "+ Free Shaker", "With Shaker")
  const promoSuffixes = [
    /\s*[\(\[\+\-\/]?\s*BB\s*\d+(?:\.\d+)?\s*L(?:\s*Jug)?[\)\]]?\s*$/i,
    /\s*[\(\[\+\-\/]?\s*BB\s*Jug\s*\d+(?:\.\d+)?\s*L[\)\]]?\s*$/i,
    /\s*[\(\[\+\-\/]?\s*(?:With|Free|\+)\s*(?:Shaker|Bottle|Jug|Gift|Pillbox|T-?Shirt|Bag)[\)\]]?\s*$/i,
    /\s*[\(\[\+\-\/]?\s*Bundle\s+Offer[\)\]]?\s*$/i,
    /\s*[\(\[\+\-\/]?\s*Special\s+Offer[\)\]]?\s*$/i,
    /\s*[\(\[\+\-\/]?\s*Limited\s+Edition[\)\]]?\s*$/i
  ];

  for (const reg of promoSuffixes) {
    clean = clean.replace(reg, '');
  }

  // Remove trailing punctuation and extra spaces
  clean = clean.replace(/[\(\[\+\-\/,\s]+$/, '').replace(/\s+/g, ' ').trim();
  return clean;
};

/**
 * Flavor String Normalization
 * Rejects promotional slugs or artificial strings (e.g. "BB 3.2L", "L Black 3.2", "Jug")
 */
export const sanitizeFlavorName = (rawFlavor: string | null | undefined): string | null => {
  if (!rawFlavor || typeof rawFlavor !== 'string') return null;
  const trimmed = rawFlavor.trim();
  const lower = trimmed.toLowerCase();

  if (isArtificialFallback(trimmed)) return null;
  if (lower.length < 2 || lower.length > 50) return null;

  // Check if it's promotional text rather than a real flavor
  const promoPatterns = [
    /\bbb\s*\d+(?:\.\d+)?\s*l/i,
    /\b\d+(?:\.\d+)?\s*l\s*jug\b/i,
    /\bblack\s*\d+\.\d+\b/i,
    /\bjug\b/i,
    /\bshaker\b/i,
    /\bfree\b/i,
    /\bbundle\b/i,
    /\bpack\s+of\s+\d+\b/i,
    /\bl\s+black\b/i
  ];

  for (const pat of promoPatterns) {
    if (pat.test(lower)) return null;
  }

  // Check if it's purely a weight/size indicator rather than a flavor
  if (/^\d+(?:\.\d+)?\s*(?:kg|g|lbs?|oz|ml|capsules?|tablets?|servings?|سروینگ|عددی|گرم|کیلوگرم|پوند)$/i.test(lower)) {
    return null;
  }

  return trimmed;
};

// 6. Digit Normalization
export const normalizeToEnglishDigits = (str: string): string => {
  if (!str) return '';
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = String(str);
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(persianDigits[i], 'g'), String(i));
    res = res.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  return res;
};

// 7. Exact Price Extractor (Regex + No Dummy Fallbacks)
export const extractPriceNumber = (textOrVal: any): number => {
  if (textOrVal === undefined || textOrVal === null) return 0;
  if (typeof textOrVal === 'number') {
    return isNaN(textOrVal) || textOrVal <= 0 ? 0 : Math.round(textOrVal * 100) / 100;
  }
  const cleanStr = normalizeToEnglishDigits(String(textOrVal)).replace(/,/g, '').trim();
  
  // Try matching AED / Dhs currency regex first
  const currencyMatch = cleanStr.match(/(?:AED|Dhs\.?)\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (currencyMatch && currencyMatch[1]) {
    const val = parseFloat(currencyMatch[1]);
    if (!isNaN(val) && val > 0) return Math.round(val * 100) / 100;
  }

  // General float match
  const match = cleanStr.match(/([0-9]+(?:\.[0-9]{1,2})?)/);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    if (!isNaN(val) && val > 0 && val < 500000) return Math.round(val * 100) / 100;
  }
  return 0;
};

// 8. Robust Array Deduplication & Cleaner
export const isArtificialFallback = (val: string | null | undefined): boolean => {
  if (!val || typeof val !== 'string') return true;
  const lower = val.trim().toLowerCase();
  if (lower.length < 2) return true;
  const invalidPlaceholders = new Set([
    'default',
    'standard',
    'normal',
    'default title',
    'title',
    'پیش‌فرض',
    'پیشفرض',
    'استاندارد',
    'پیش‌فرض / استاندارد',
    'پیشفرض / استاندارد',
    'بدون طعم',
    'سایز پیشفرض',
    'سایز استاندارد',
    'طعم استاندارد',
    'طعم پیشفرض',
    'none',
    'null',
    'undefined',
    'n/a',
    'na',
    'na/na'
  ]);
  return invalidPlaceholders.has(lower);
};

export const deduplicateStrings = (items: (string | undefined | null)[]): string[] => {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'string') continue;
    const trimmed = item.trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || isArtificialFallback(trimmed)) continue;
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
};

// 9. Standardized Schema.org JSON-LD Extractor (Tier 1)
export interface ExtractedJsonLdProduct {
  name?: string;
  brand?: string;
  description?: string;
  image?: string;
  galleryImages: string[];
  priceAED: number;
  originalPriceAED?: number;
  currency: string;
  inStock: boolean;
  sku?: string;
}

export const extractJsonLdSchema = ($: cheerio.CheerioAPI, sourceUrl: string = ''): ExtractedJsonLdProduct | null => {
  const jsonLdItems: any[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (!content) return;
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed['@graph'])) {
        jsonLdItems.push(...parsed['@graph']);
      } else if (Array.isArray(parsed)) {
        jsonLdItems.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        jsonLdItems.push(parsed);
      }
    } catch (_err) {}
  });

  for (const item of jsonLdItems) {
    if (!item || typeof item !== 'object') continue;
    const type = item['@type'];
    const isProduct = type === 'Product' || type === 'IndividualProduct' || (Array.isArray(type) && type.includes('Product')) || Boolean(item.offers);

    if (isProduct) {
      const name = typeof item.name === 'string' ? item.name.trim() : undefined;
      let brand: string | undefined;
      if (typeof item.brand === 'string') brand = item.brand.trim();
      else if (item.brand && typeof item.brand === 'object' && item.brand.name) brand = String(item.brand.name).trim();

      const description = typeof item.description === 'string' ? item.description.trim() : undefined;
      const galleryImages: string[] = [];

      let rawImage = item.image;
      if (Array.isArray(rawImage)) {
        rawImage.forEach((img: any) => {
          const u = sanitizeImageUrl(typeof img === 'string' ? img : (img?.url || img?.contentUrl), sourceUrl);
          if (u && !galleryImages.includes(u)) galleryImages.push(u);
        });
      } else if (rawImage) {
        const u = sanitizeImageUrl(typeof rawImage === 'string' ? rawImage : (rawImage?.url || rawImage?.contentUrl), sourceUrl);
        if (u && !galleryImages.includes(u)) galleryImages.push(u);
      }

      let priceAED = 0;
      let originalPriceAED: number | undefined;
      let inStock = true;
      const currency = 'AED';

      const offers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
      for (const offer of offers) {
        if (!offer || typeof offer !== 'object') continue;

        if (offer.price !== undefined) {
          const p = extractPriceNumber(offer.price);
          if (p > 0 && (!priceAED || p < priceAED)) priceAED = p;
        }
        if (offer.lowPrice !== undefined) {
          const lp = extractPriceNumber(offer.lowPrice);
          if (lp > 0 && (!priceAED || lp < priceAED)) priceAED = lp;
        }
        if (offer.highPrice !== undefined) {
          const hp = extractPriceNumber(offer.highPrice);
          if (hp > 0 && (!originalPriceAED || hp > originalPriceAED)) originalPriceAED = hp;
        }

        if (offer.availability) {
          const availStr = String(offer.availability).toLowerCase();
          if (availStr.includes('outofstock') || availStr.includes('discontinued') || availStr.includes('soldout')) {
            inStock = false;
          } else if (availStr.includes('instock') || availStr.includes('limitedavailability') || availStr.includes('onlineonly')) {
            inStock = true;
          }
        }
      }

      if (name || priceAED > 0) {
        return {
          name,
          brand,
          description,
          image: galleryImages[0] || '',
          galleryImages,
          priceAED,
          originalPriceAED: originalPriceAED && originalPriceAED > priceAED ? originalPriceAED : undefined,
          currency,
          inStock,
          sku: typeof item.sku === 'string' ? item.sku : undefined
        };
      }
    }
  }

  return null;
};

// 10. Framework Hydration & Meta State Extractor (Tier 2)
export const extractEmbeddedJsonData = ($: cheerio.CheerioAPI): {
  nextData?: any;
  initialState?: any;
  magentoInit?: any[];
  jsonLd: any[];
} => {
  let nextData: any = null;
  let initialState: any = null;
  const magentoInit: any[] = [];
  const jsonLd: any[] = [];

  // Parse Next.js __NEXT_DATA__
  try {
    const nextHtml = $('#__NEXT_DATA__').html();
    if (nextHtml) nextData = JSON.parse(nextHtml);
  } catch (_e) {}

  // Parse Window __INITIAL_STATE__
  try {
    $('script').each((_, el) => {
      const txt = $(el).html() || '';
      if (txt.includes('window.__INITIAL_STATE__') || txt.includes('__INITIAL_STATE__ =')) {
        const match = txt.match(/__INITIAL_STATE__\s*=\s*({.*?});/s) || txt.match(/__INITIAL_STATE__\s*=\s*({.*})/s);
        if (match && match[1]) {
          try { initialState = JSON.parse(match[1]); } catch (_err) {}
        }
      }
    });
  } catch (_e) {}

  // Parse Magento text/x-magento-init
  try {
    $('script[type="text/x-magento-init"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        if (parsed && typeof parsed === 'object') magentoInit.push(parsed);
      } catch (_err) {}
    });
  } catch (_e) {}

  // Parse application/ld+json
  try {
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        if (Array.isArray(parsed['@graph'])) {
          jsonLd.push(...parsed['@graph']);
        } else if (Array.isArray(parsed)) {
          jsonLd.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          jsonLd.push(parsed);
        }
      } catch (_err) {}
    });
  } catch (_e) {}

  return { nextData, initialState, magentoInit, jsonLd };
};

// 11. Persian Title Translator & Dictionary Helper
export const translateTitleToFa = (enTitle: string, brand: string = ''): string => {
  if (!enTitle) return '';
  let fa = enTitle.toLowerCase();
  const dict: Record<string, string> = {
    'whey protein isolate': 'پروتئین وی ایزوله',
    'whey isolate': 'پروتئین وی ایزوله',
    'whey protein': 'پروتئین وی',
    'mass gainer': 'گینر افزایش وزن',
    'serious mass': 'گینر سیریوس مس',
    'gainer': 'گینر افزایش وزن',
    'creatine monohydrate': 'کراتین مونوهیدرات',
    'creatine powder': 'پودر کراتین خالص',
    'creatine': 'کراتین',
    'bcaa': 'آمینو اسید BCAA',
    'eaa': 'آمینو اسید EAA',
    'pre-workout': 'پمپ قبل تمرین',
    'pre workout': 'پمپ قبل تمرین',
    'multivitamin': 'مولتی ویتامین',
    'multi-vitamin': 'مولتی ویتامین',
    'fish oil': 'روغن ماهی',
    'omega 3': 'امگا ۳',
    'omega-3': 'امگا ۳',
    'glutamine': 'گلوتامین',
    'collagen': 'کلاژن',
    'shaker': 'شیکر ورزشی',
    'isolate': 'ایزوله'
  };
  Object.keys(dict).forEach(key => {
    fa = fa.replace(new RegExp(key, 'gi'), dict[key]);
  });
  const brandPart = brand ? ` ${brand}` : '';
  return `${fa}${brandPart}`.trim().replace(/\b\w/g, l => l.toUpperCase());
};

// 12. Bilingual Persian Title Generator
export const generateBilingualProductTitle = (englishTitle: string, brand?: string): string => {
  if (!englishTitle) return '';
  const cleanEng = englishTitle.replace(/\s*\|\s*.*$/i, '').trim();
  const lower = cleanEng.toLowerCase();

  let faPrefix = '';
  if (lower.includes('creatine monohydrate') || lower.includes('creatine powder')) {
    faPrefix = 'پودر کراتین مونوهیدرات';
  } else if (lower.includes('creatine')) {
    faPrefix = 'کراتین ورزشی خالص';
  } else if (lower.includes('gold standard 100% whey') || lower.includes('whey gold standard')) {
    faPrefix = 'پروتئین وی گلد استاندارد ۱۰۰٪';
  } else if (lower.includes('iso 100') || lower.includes('iso-100') || lower.includes('isolate whey') || lower.includes('whey isolate')) {
    faPrefix = 'پروتئین ایزوله وی خالص';
  } else if (lower.includes('whey protein') || lower.includes('whey')) {
    faPrefix = 'پودر پروتئین وی اصل';
  } else if (lower.includes('mass gainer') || lower.includes('serious mass') || lower.includes('gainer')) {
    faPrefix = 'پودر گینر افزایش وزن و حجم عضلانی';
  } else if (lower.includes('bcaa')) {
    faPrefix = 'مکمل آمینواسید شاخه‌دار BCAA';
  } else if (lower.includes('eaa')) {
    faPrefix = 'مکمل آمینواسیدهای ضروری EAA';
  } else if (lower.includes('pre-workout') || lower.includes('pre workout') || lower.includes('c4 original') || lower.includes('abe ')) {
    faPrefix = 'مکمل پمپ انرژی قبل از تمرین';
  } else if (lower.includes('omega 3') || lower.includes('omega-3') || lower.includes('fish oil')) {
    faPrefix = 'کپسول امگا ۳ و روغن ماهی خالص';
  } else if (lower.includes('collagen')) {
    faPrefix = 'پودر کلاژن پپتاید جوانساز پوست و مفاصل';
  } else if (lower.includes('multivitamin') || lower.includes('multi-vitamin') || lower.includes('daily vitamins')) {
    faPrefix = 'مولتی‌ویتامین و مینرال کامل روزانه';
  } else if (lower.includes('glutamine')) {
    faPrefix = 'پودر گلوتامین ریکاوری عضلات';
  } else {
    faPrefix = translateTitleToFa(cleanEng, brand || '');
  }

  return `${faPrefix} (${cleanEng})`;
};




