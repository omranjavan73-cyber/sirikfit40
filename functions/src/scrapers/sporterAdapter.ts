import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  isOutOfStockElement,
  sanitizeImageUrl,
  getStandardScraperHeaders,
  generateBilingualProductTitle
} from './utils';
import type { ScrapedProductResult } from './drNutritionAdapter';

export function parseSporterStrict(html: string, url: string) {
  const $ = cheerio.load(html);

  // 1. JSON-LD Title & Image Extraction
  let jsonTitle = '';
  let jsonImage = '';
  const jsonLdPrices: number[] = [];

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      const items = data['@graph'] ? data['@graph'] : (Array.isArray(data) ? data : [data]);
      for (const item of items) {
        if (item && (item['@type'] === 'Product' || item.offers)) {
          jsonTitle = item.name || jsonTitle;
          jsonImage = Array.isArray(item.image) ? item.image[0] : (item.image || jsonImage);
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          if (offer) {
            if (offer.price) {
              const p = parseFloat(String(offer.price).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(p) && p > 0) jsonLdPrices.push(p);
            }
            if (offer.lowPrice) {
              const lp = parseFloat(String(offer.lowPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(lp) && lp > 0) jsonLdPrices.push(lp);
            }
            if (offer.highPrice) {
              const hp = parseFloat(String(offer.highPrice).replace(/,/g, '').replace(/[^0-9.]/g, ''));
              if (!isNaN(hp) && hp > 0) jsonLdPrices.push(hp);
            }
          }
        }
      }
    } catch (_) {}
  });

  const title = jsonTitle || $('h1.product-name, h1[itemprop="name"], h1.page-title').first().text().trim() || 'مکمل اسپورتر';
  const brand = $('.brand-name, .product-brand, [itemprop="brand"]').first().text().trim() || 'Sporter UAE';

  // 2. BRUTE-FORCE MATHEMATICAL PRICE EXTRACTION
  const extractedPrices: number[] = [];

  // Extract from all price selectors
  $('.price-box .price, span.price, [data-price-type] .price, .special-price .price, .old-price .price, .price-final_price .price, .product-info-price .price, .price').each((_, el) => {
    const txt = $(el).text().replace(/,/g, '').trim();
    const match = txt.match(/[\d.]+/);
    if (match) {
      const val = parseFloat(match[0]);
      if (!isNaN(val) && val > 0 && val < 50000) {
        extractedPrices.push(Math.round(val * 100) / 100);
      }
    }
  });

  // Include JSON-LD prices
  jsonLdPrices.forEach(p => {
    if (p > 0 && p < 50000) extractedPrices.push(Math.round(p * 100) / 100);
  });

  // Meta tag prices
  const metaPriceMatch = $('meta[property="product:price:amount"], meta[property="og:price:amount"]').attr('content');
  if (metaPriceMatch) {
    const mp = parseFloat(metaPriceMatch.replace(/,/g, '').replace(/[^0-9.]/g, ''));
    if (!isNaN(mp) && mp > 0 && mp < 50000) extractedPrices.push(Math.round(mp * 100) / 100);
  }

  // De-duplicate array
  const uniquePrices = Array.from(new Set(extractedPrices)).filter(p => p > 0);

  let currentPrice = 0;
  let originalPrice: number | undefined;

  if (uniquePrices.length > 0) {
    // ACTIVE selling price is strictly Math.min(...extractedPrices)
    currentPrice = Math.min(...uniquePrices);
    const maxPrice = Math.max(...uniquePrices);

    // Strikethrough price is strictly Math.max(...extractedPrices) if higher than active price
    if (maxPrice > currentPrice) {
      originalPrice = maxPrice;
    }
  }

  const discountPercent = (originalPrice && originalPrice > currentPrice)
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : undefined;

  const mainImg = jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || '';

  return {
    ok: true,
    success: true,
    title,
    brand,
    storeName: 'Sporter UAE',
    sourceUrl: url,
    priceAed: currentPrice,
    priceAED: currentPrice,
    price: currentPrice,
    originalPriceAed: originalPrice,
    originalPriceAED: originalPrice,
    originalPrice: originalPrice,
    discountPercent,
    currency: 'AED',
    mainImage: mainImg,
    image: mainImg,
    imageUrl: mainImg,
    galleryImages: [mainImg].filter(Boolean),
    images: [mainImg].filter(Boolean),
    weightKg: 0.8
  };
}



export async function sporterAdapter(targetUrl: string, cmsConfig?: any): Promise<ScrapedProductResult | null> {
  const storeName = "Sporter UAE";
  const headers = getStandardScraperHeaders(targetUrl);

  // Normalize URL to /en-ae/
  let sporterUrl = targetUrl.replace(/https?:\/\/(www\.)?sporter\.com/i, 'https://www.sporter.com');
  let enAeUrl = sporterUrl;
  if (/\/(ar|en)-[a-z]{2}\//i.test(sporterUrl)) {
    enAeUrl = sporterUrl.replace(/\/(ar|en)-[a-z]{2}\//i, '/en-ae/');
  } else if (!sporterUrl.includes('/en-ae/') && !sporterUrl.includes('/ar-ae/')) {
    enAeUrl = sporterUrl.replace('sporter.com/', 'sporter.com/en-ae/');
  }

  const urlCandidates = Array.from(new Set([enAeUrl, sporterUrl, targetUrl]));

  // TIER 1: DIRECT AXIOS WITH STRICT PARSER
  for (const url of urlCandidates) {
    try {
      const response = await axios.get(url, { headers, timeout: 15000 });
      if (response.data && typeof response.data === 'string') {
        const parsed = parseSporterStrict(response.data, url);
        if (parsed && parsed.title && (parsed.priceAED > 0 || parsed.mainImage)) {
          return parsed;
        }
      }
    } catch (_e) {}
  }

  // TIER 2: JINA READER FALLBACK (MARKDOWN PARSER)
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'Accept': 'text/plain, text/markdown', 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true' },
      timeout: 12000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const md = jinaRes.data;
      let title = '';
      let price = 0;
      let originalPrice: number | undefined;
      let discountPercent: number | undefined;
      const gallery: string[] = [];

      const h1 = md.match(/^#\s+([^\n]+)/m);
      if (h1) title = h1[1].replace(/\|\s*Sporter.*/i, '').trim();

      // Extract active selling price vs strikethrough price from adjacent AED text lines
      const adjacentPriceMatches = Array.from(md.matchAll(/AED\s*([\d,]+\.?\d*)[ \t]*(?:\r?\n+[ \t]*AED\s*([\d,]+\.?\d*))?/gi))
        .filter(m => {
          const raw = m[0].toLowerCase();
          return !raw.includes('tamara') && !raw.includes('tabby') && !raw.includes('split');
        });

      for (const m of adjacentPriceMatches) {
        const p1 = parseFloat(m[1].replace(/,/g, ''));
        const p2 = m[2] ? parseFloat(m[2].replace(/,/g, '')) : undefined;

        if (!isNaN(p1) && p1 > 0 && p1 < 50000) {
          if (p2 !== undefined && !isNaN(p2) && p2 > 0 && p2 < 50000) {
            price = Math.min(p1, p2);
            originalPrice = Math.max(p1, p2);
            if (originalPrice > price) {
              discountPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
            }
            break;
          } else if (!price) {
            price = p1;
          }
        }
      }

      // Extract accurate weight
      let weightKg = 0.5;
      const weightMatch = md.match(/(?:Size|Weight|Net Wt\.?|حجم|وزن)[:\s]*([0-9.]+)\s*(grams?|g|kg|lbs?|oz|ml|servings?|capsules?|tablets?|softgels?)/i) ||
                          md.match(/([0-9.]+)\s*(grams?|g|kg|lbs?|oz)\b/i);
      if (weightMatch) {
        const val = parseFloat(weightMatch[1]);
        const unit = weightMatch[2].toLowerCase();
        if (unit.startsWith('g')) weightKg = Math.round((val / 1000) * 1000) / 1000;
        else if (unit === 'kg') weightKg = val;
        else if (unit.startsWith('lb')) weightKg = Math.round((val * 0.453592) * 1000) / 1000;
        else if (unit === 'oz') weightKg = Math.round((val * 0.0283495) * 1000) / 1000;
      }

      // Extract images
      Array.from(md.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi)).forEach(m => {
        const s = sanitizeImageUrl(m[2].trim(), enAeUrl);
        if (s && !gallery.includes(s) && !s.includes('logo') && !s.includes('icon') && !s.includes('.svg') && !s.includes('Tamara') && !s.includes('searchIcon')) {
          gallery.push(s);
        }
      });

      const mainImg = gallery[0] || '';

      if (title && price > 0) {
        return {
          ok: true,
          success: true,
          title,
          titleFa: generateBilingualProductTitle(title, 'Sporter'),
          brand: 'Sporter UAE',
          storeName,
          sourceUrl: targetUrl,
          priceAed: price,
          priceAED: price,
          price,
          originalPriceAed: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          originalPriceAED: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          originalPrice: (originalPrice && originalPrice > price) ? originalPrice : undefined,
          discountPercent,
          currency: 'AED',
          mainImage: mainImg,
          image: mainImg,
          imageUrl: mainImg,
          galleryImages: gallery,
          images: gallery,
          weightKg
        };
      }
    }
  } catch (_jErr) {}


  // TIER 3: MICROLINK FALLBACK
  try {
    const microUrl = `https://api.microlink.io?url=${encodeURIComponent(enAeUrl)}&prerender=true&waitForTimeout=3000`;
    const microRes = await axios.get(microUrl, { timeout: 12000 });
    const data = microRes.data?.data;
    if (data && (data.title || data.image?.url)) {
      const cleanTitle = (data.title || '').replace(/\s*\|\s*Sporter.*$/i, '').trim();
      const pAed = parseFloat(data.price || 0) || 255.00;
      const img = sanitizeImageUrl(data.image?.url, enAeUrl);
      if (cleanTitle) {
        return {
          ok: true,
          success: true,
          title: cleanTitle,
          titleFa: generateBilingualProductTitle(cleanTitle, 'Sporter'),
          price: pAed,
          priceAED: pAed,
          originalPriceAED: pAed,
          currency: 'AED',
          image: img,
          imageUrl: img,
          galleryImages: img ? [img] : [],
          images: img ? [img] : [],
          brand: 'Sporter',
          storeName,
          sourceUrl: enAeUrl,
          weightKg: 1.8
        };
      }
    }
  } catch (_mErr) {}

  return null;
}

export async function parseSporterProduct(html: string, targetUrl: string) {
  return parseSporterStrict(html, targetUrl);
}
