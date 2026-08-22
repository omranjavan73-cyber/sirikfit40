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

  // 1. JSON-LD Extraction
  let jsonPrice = 0;
  let jsonTitle = '';
  let jsonImage = '';

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      if (data['@type'] === 'Product' || data.offers) {
        jsonTitle = data.name || jsonTitle;
        jsonImage = Array.isArray(data.image) ? data.image[0] : (data.image || jsonImage);
        const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
        if (offer && offer.price) {
          jsonPrice = parseFloat(offer.price);
        }
      }
    } catch (_) {}
  });

  // 2. DOM Extraction
  const title = jsonTitle || $('h1.product-name, h1[itemprop="name"], h1.page-title').first().text().trim() || 'مکمل اسپورتر';
  const brand = $('.brand-name, .product-brand').first().text().trim() || 'Sporter UAE';

  let finalSaleAED = jsonPrice;
  let originalAED = 0;

  // Strikethrough Old Price
  const oldPriceText = $('.old-price .price, [data-price-type="oldPrice"] .price, del .price').first().text();
  const oldMatch = oldPriceText.replace(/,/g, '').match(/[\d.]+/);
  if (oldMatch) originalAED = parseFloat(oldMatch[0]);

  // Active Final Sale Price
  if (!finalSaleAED) {
    const specialText = $('.special-price .price, [data-price-type="finalPrice"] .price, .product-info-price .price:not(.old-price .price)').first().text();
    const specialMatch = specialText.replace(/,/g, '').match(/[\d.]+/);
    if (specialMatch) {
      finalSaleAED = parseFloat(specialMatch[0]);
    }
  }

  // DOM Fallback
  if (!finalSaleAED) {
    $('.price').each((_, el) => {
      const isInsideOld = $(el).closest('.old-price, del, [data-price-type="oldPrice"]').length > 0;
      if (!isInsideOld && !finalSaleAED) {
        const m = $(el).text().replace(/,/g, '').match(/[\d.]+/);
        if (m) finalSaleAED = parseFloat(m[0]);
      }
    });
  }

  const finalPrice = finalSaleAED > 0 ? finalSaleAED : (originalAED || 0);

  return {
    ok: true,
    success: true,
    title,
    brand,
    storeName: 'Sporter UAE',
    sourceUrl: url,
    priceAed: finalPrice,
    priceAED: finalPrice,
    price: finalPrice,
    originalPriceAed: originalAED > finalPrice ? originalAED : undefined,
    originalPriceAED: originalAED > finalPrice ? originalAED : undefined,
    discountPercent: (originalAED > finalPrice) ? Math.round(((originalAED - finalPrice) / originalAED) * 100) : undefined,
    mainImage: jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || '',
    image: jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || '',
    imageUrl: jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || '',
    galleryImages: [jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || ''].filter(Boolean),
    images: [jsonImage || $('meta[property="og:image"]').attr('content') || $('.gallery-placeholder img').first().attr('src') || ''].filter(Boolean),
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

  // TIER 2: JINA READER FALLBACK
  try {
    const jinaUrl = `https://r.jina.ai/${enAeUrl}`;
    const jinaRes = await axios.get(jinaUrl, {
      headers: { ...headers, 'X-With-Images-Summary': 'true', 'X-No-Cache': 'true' },
      timeout: 10000
    });
    if (jinaRes.data && typeof jinaRes.data === 'string') {
      const parsed = parseSporterStrict(jinaRes.data, enAeUrl);
      if (parsed && parsed.title) return parsed;
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
