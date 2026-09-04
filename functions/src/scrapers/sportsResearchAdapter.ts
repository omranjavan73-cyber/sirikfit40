import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  cleanAndNormalizeUrl,
  extractPriceNumber,
  sanitizeImageUrl,
  normalizeToEnglishDigits,
  generateBilingualProductTitle,
  getRandomUserAgent,
  USER_AGENT_ROTATION_POOL
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

const USD_TO_AED_RATE = 3.6725;

/**
 * Normalizes Sports Research CDN image URL to high-resolution HTTPS
 */
export function resolveSportsResearchImage(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = rawUrl.trim().replace(/&amp;/g, '&');
  if (clean.startsWith('//')) clean = 'https:' + clean;

  if (clean.includes('shopify.com') || clean.includes('sportsresearch.com')) {
    try {
      const u = new URL(clean);
      u.searchParams.delete('width');
      u.searchParams.delete('height');
      u.searchParams.delete('crop');
      clean = u.toString();
    } catch (_e) {}
  }
  return clean;
}

/**
 * Parses HTML from Sports Research product page
 */
export function parseSportsResearchHtml(html: string, sourceUrl: string): ScrapedProductResult {
  const $ = cheerio.load(html);

  let titleEn = '';
  let brand = 'Sports Research';
  let rawPrice = 0;
  let rawOriginalPrice = 0;
  let currency = 'USD';
  let image = '';
  const galleryImages: string[] = [];
  let inStock = true;
  let description = '';

  // =========================================================================
  // PRIORITY 1: Schema.org Product JSON-LD (<script type="application/ld+json">)
  // =========================================================================
  $('script[type="application/ld+json"]').each((_, el) => {
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
          // 1. Title
          if (!titleEn && (item.name || item.headline)) {
            titleEn = String(item.name || item.headline).trim();
          }

          // 2. Brand
          if (item.brand) {
            if (typeof item.brand === 'string') brand = item.brand.trim();
            else if (item.brand.name) brand = String(item.brand.name).trim();
          }

          // 3. Description
          if (!description && item.description) {
            description = String(item.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500);
          }

          // 4. Images
          if (item.image) {
            const rawImgs = Array.isArray(item.image) ? item.image : [item.image];
            rawImgs.forEach((imgObj: any) => {
              const src = typeof imgObj === 'string' ? imgObj : (imgObj?.url || imgObj?.contentUrl || '');
              if (src) {
                const hr = resolveSportsResearchImage(src);
                if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
              }
            });
          }

          // 5. Offers & Pricing
          if (item.offers) {
            const offersList = Array.isArray(item.offers) ? item.offers : [item.offers];
            for (const off of offersList) {
              if (!off) continue;
              const p = off.price ?? off.lowPrice ?? off.priceSpecification?.price;
              const c = String(off.priceCurrency || off.currency || 'USD').toUpperCase();
              if (p !== undefined && p !== null) {
                const parsedNum = parseFloat(normalizeToEnglishDigits(String(p)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (!isNaN(parsedNum) && parsedNum > 0 && rawPrice === 0) {
                  rawPrice = parsedNum;
                  currency = c;
                }
              }

              if (off.highPrice && rawOriginalPrice === 0) {
                const highP = parseFloat(normalizeToEnglishDigits(String(off.highPrice)).replace(/,/g, '').replace(/[^0-9.]/g, ''));
                if (!isNaN(highP) && highP > rawPrice) rawOriginalPrice = highP;
              }

              if (off.availability) {
                const avail = String(off.availability).toLowerCase();
                if (avail.includes('outofstock') || avail.includes('discontinued') || avail.includes('soldout')) {
                  inStock = false;
                }
              }
            }
          }
        }
      }
    } catch (_e) {}
  });

  // =========================================================================
  // PRIORITY 2: Standard OpenGraph & Meta Tags
  // =========================================================================
  if (!titleEn) {
    titleEn = $('meta[property="og:title"]').attr('content') ||
              $('meta[name="twitter:title"]').attr('content') ||
              $('h1.product__title, h1.product-single__title, h1').first().text().trim() ||
              $('title').text().trim();
    // Strip trailing store name like " | Sports Research"
    titleEn = titleEn.replace(/\s*\|\s*Sports\s*Research.*$/i, '').trim();
  }

  if (galleryImages.length === 0) {
    const ogImg = $('meta[property="og:image:secure_url"]').attr('content') ||
                  $('meta[property="og:image"]').attr('content') ||
                  $('meta[name="twitter:image"]').attr('content');
    if (ogImg) {
      const hr = resolveSportsResearchImage(ogImg);
      if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
    }
  }

  if (rawPrice === 0) {
    const metaPrice = $('meta[property="product:price:amount"]').attr('content') ||
                      $('meta[property="og:price:amount"]').attr('content') ||
                      $('meta[itemprop="price"]').attr('content');
    const metaCurr = $('meta[property="product:price:currency"]').attr('content') ||
                     $('meta[property="og:price:currency"]').attr('content') || 'USD';
    if (metaPrice) {
      const p = parseFloat(normalizeToEnglishDigits(metaPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
      if (!isNaN(p) && p > 0) {
        rawPrice = p;
        currency = metaCurr.toUpperCase();
      }
    }
  }

  // Check DOM Price Selectors (Shopify patterns)
  if (rawPrice === 0) {
    const domSelectors = [
      '.price-item--regular',
      '.price-item--sale',
      '.product__price .price',
      '.product-single__price',
      '[data-product-price]',
      '.price--on-sale .price-item',
      '.price'
    ];
    for (const sel of domSelectors) {
      const el = $(sel).first();
      if (el.length > 0) {
        const txt = el.text().trim();
        const pMatch = txt.match(/(?:\$|USD)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
        if (pMatch && pMatch[1]) {
          const p = parseFloat(pMatch[1]);
          if (!isNaN(p) && p > 0 && p < 10000) {
            rawPrice = p;
            currency = 'USD';
            break;
          }
        }
      }
    }
  }

  // Gather additional images from Shopify gallery
  $('.product__media-list img, .product-single__photos img, [data-product-single-thumbnail]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-zoom');
    if (src) {
      const hr = resolveSportsResearchImage(src);
      if (hr && !galleryImages.includes(hr)) galleryImages.push(hr);
    }
  });

  // Main Image selection
  image = galleryImages[0] || '';

  // =========================================================================
  // PRIORITY 3: Currency Conversion (USD to AED)
  // =========================================================================
  let priceAed = 0;
  let originalPriceAed = 0;

  if (rawPrice > 0) {
    if (currency === 'USD' || currency === '$' || currency === 'US') {
      priceAed = Math.round(rawPrice * USD_TO_AED_RATE * 100) / 100;
    } else {
      priceAed = Math.round(rawPrice * 100) / 100;
    }
  }

  if (rawOriginalPrice > rawPrice) {
    if (currency === 'USD' || currency === '$') {
      originalPriceAed = Math.round(rawOriginalPrice * USD_TO_AED_RATE * 100) / 100;
    } else {
      originalPriceAed = Math.round(rawOriginalPrice * 100) / 100;
    }
  }

  let discountPercent: number | undefined = undefined;
  if (originalPriceAed > priceAed) {
    discountPercent = Math.round(((originalPriceAed - priceAed) / originalPriceAed) * 100);
  }

  // Weight extraction from title/description
  let weightKg = 0.8;
  const kgMatch = (titleEn + ' ' + description).match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilos)/i);
  if (kgMatch && kgMatch[1]) {
    weightKg = parseFloat(kgMatch[1]);
  } else {
    const lbsMatch = (titleEn + ' ' + description).match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pound)/i);
    if (lbsMatch && lbsMatch[1]) {
      weightKg = Math.round(parseFloat(lbsMatch[1]) * 0.453592 * 100) / 100;
    } else {
      const gMatch = (titleEn + ' ' + description).match(/(\d+)\s*(?:g|grams?)\b/i);
      if (gMatch && gMatch[1]) {
        weightKg = Math.round((parseInt(gMatch[1], 10) / 1000) * 100) / 100;
      }
    }
  }

  // Format Bilingual Title
  const titleFa = generateBilingualProductTitle(titleEn, 'Sports Research', brand);

  return {
    ok: priceAed > 0 && Boolean(titleEn),
    success: priceAed > 0 && Boolean(titleEn),
    title: titleEn || 'Sports Research Product',
    titleFa,
    price: priceAed,
    priceAED: priceAed,
    priceAed,
    originalPriceAed: originalPriceAed > priceAed ? originalPriceAed : undefined,
    originalPriceAED: originalPriceAed > priceAed ? originalPriceAed : undefined,
    discountPercent,
    currency: 'AED',
    image,
    imageUrl: image,
    mainImage: image,
    images: galleryImages,
    galleryImages,
    brand,
    storeName: 'Sports Research',
    store: 'Sports Research',
    sourceUrl,
    weightKg,
    inStock,
    description: description || `${titleEn} - اصل Sports Research`
  };
}

/**
 * Dedicated Multi-Tier Fetcher & Adapter for Sports Research
 */
export async function sportsResearchAdapter(
  targetUrl: string,
  cmsConfig?: any,
  customUserAgent?: string
): Promise<ScrapedProductResult> {
  const cleanUrl = cleanAndNormalizeUrl(targetUrl);
  const ua = customUserAgent || getRandomUserAgent();
  const headers = {
    'User-Agent': ua,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  // Tier 1: Direct SSR Fetch
  try {
    const res = await axios.get(cleanUrl, {
      headers,
      timeout: 9000,
      validateStatus: (status) => status < 400
    });

    if (res.data && typeof res.data === 'string' && res.data.length > 200) {
      const parsed = parseSportsResearchHtml(res.data, cleanUrl);
      if (parsed.success && parsed.priceAed && parsed.priceAed > 0) {
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn(`[sportsResearchAdapter] Direct fetch failed for ${cleanUrl}: ${err.message}. Trying Jina fallback...`);
  }

  // Tier 2: Jina Reader HTML Proxy
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'X-Return-Format': 'html',
        'X-No-Cache': 'true'
      },
      timeout: 12000
    });

    if (jinaRes.data && typeof jinaRes.data === 'string' && jinaRes.data.length > 100) {
      const parsed = parseSportsResearchHtml(jinaRes.data, cleanUrl);
      if (parsed.success && parsed.priceAed && parsed.priceAed > 0) {
        return parsed;
      }
    }
  } catch (jinaErr: any) {
    console.warn(`[sportsResearchAdapter] Jina fallback failed for ${cleanUrl}:`, jinaErr.message);
  }

  // Tier 3: ScraperAPI Proxy if available
  const scraperApiKey = cmsConfig?.apiConfig?.scraperApiKey || process.env.SCRAPER_API_KEY || process.env.SCRAPERAPI_KEY || "a67220b28858f356c2b0f0ea7878c6f8";
  if (scraperApiKey) {
    try {
      const scraperApiUrl = `https://api.scraperapi.com/?api_key=${encodeURIComponent(scraperApiKey)}&url=${encodeURIComponent(cleanUrl)}&keep_headers=true`;
      const sRes = await axios.get(scraperApiUrl, {
        headers,
        timeout: 15000
      });
      if (sRes.data && typeof sRes.data === 'string' && sRes.data.length > 200) {
        const parsed = parseSportsResearchHtml(sRes.data, cleanUrl);
        if (parsed.success && parsed.priceAed && parsed.priceAed > 0) {
          return parsed;
        }
      }
    } catch (_sErr) {}
  }

  return {
    ok: false,
    success: false,
    title: '',
    price: 0,
    priceAED: 0,
    currency: 'AED',
    image: '',
    galleryImages: [],
    storeName: 'Sports Research',
    sourceUrl: cleanUrl
  };
}
